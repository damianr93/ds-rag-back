import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import axios from 'axios';
import { DocumentSourceRepository } from '../../domain/document-sources/ports/repositories';
import { CloudStorageProvider } from '../../domain/document-sources/ports/services';
import { CreateDocumentSourceDto, UpdateDocumentSourceDto, DocumentSourceResponseDto, CloudFileDto } from '../dto/document-source.dto';
import { DocumentSourceCredentials } from '../../domain/entities/document-source.entity';

export class DocumentSourcesApplication {
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-cbc';

  constructor(
    private readonly repository: DocumentSourceRepository,
    private readonly googleDriveProvider: CloudStorageProvider,
    private readonly dropboxProvider: CloudStorageProvider,
    private readonly oneDriveProvider: CloudStorageProvider,
    encryptionKey: string
  ) {
    this.encryptionKey = encryptionKey;
  }

  async createSource(userId: number, dto: CreateDocumentSourceDto): Promise<DocumentSourceResponseDto> {
    // Validaciones
    if (!dto.name || dto.name.trim() === '') {
      throw new Error('El nombre de la fuente es requerido');
    }

    if (!dto.provider || !['google_drive', 'dropbox', 'onedrive', 'local'].includes(dto.provider)) {
      throw new Error('Tipo de proveedor inválido. Debe ser: google_drive, dropbox, onedrive o local');
    }

    if (!dto.credentials || !dto.credentials.accessToken) {
      throw new Error('Las credenciales (accessToken) son requeridas');
    }

    try {
      const encryptedCredentials = this.encryptCredentials(dto.credentials);
      const encryptedClientId = dto.clientId ? this.encryptString(dto.clientId) : null;
      const encryptedClientSecret = dto.clientSecret ? this.encryptString(dto.clientSecret) : null;
      
      const source = await this.repository.create(
        userId,
        dto.name,
        dto.provider,
        encryptedCredentials,
        dto.rootFolderId || null,
        encryptedClientId,
        encryptedClientSecret
      );

      return this.toResponseDto(source);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al crear la fuente: ${error.message}`);
      }
      throw new Error('Error desconocido al crear la fuente');
    }
  }

  async getUserSources(userId: number): Promise<DocumentSourceResponseDto[]> {
    const sources = await this.repository.findByUserId(userId);
    return sources.map(this.toResponseDto);
  }

  async getSourceById(id: number, userId: number, includeCredentials = false): Promise<DocumentSourceResponseDto | null> {
    const source = await this.repository.findById(id);
    if (!source || source.userId !== userId) {
      return null;
    }
    
    const response = this.toResponseDto(source);
    
    // Si se solicita incluir credenciales (solo para admin), las desencriptamos
    if (includeCredentials) {
      try {
        const decryptedCredentials = this.decryptCredentials(source.credentials);
        return {
          ...response,
          decryptedCredentials,
        };
      } catch (error) {
        console.error('Error decrypting credentials:', error);
      }
    }
    
    return response;
  }

  async updateSource(id: number, userId: number, dto: UpdateDocumentSourceDto): Promise<DocumentSourceResponseDto | null> {
    const source = await this.repository.findById(id);
    if (!source || source.userId !== userId) {
      return null;
    }

    const updateData: Record<string, unknown> = {
      name: dto.name,
      rootFolderId: dto.rootFolderId,
      isActive: dto.isActive,
    };

    if (dto.credentials) {
      updateData.credentials = this.encryptCredentials(dto.credentials);
    }

    const updated = await this.repository.update(id, updateData);
    return this.toResponseDto(updated);
  }

  async deleteSource(id: number, userId: number): Promise<boolean> {
    const source = await this.repository.findById(id);
    if (!source || source.userId !== userId) {
      return false;
    }

    await this.repository.delete(id);
    return true;
  }

  async listFiles(sourceId: number, userId: number, folderId?: string): Promise<CloudFileDto[]> {
    const source = await this.repository.findById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente de documentos no encontrada');
    }

    if (!source.isActive) {
      throw new Error('La fuente de documentos está inactiva. Por favor, actualiza las credenciales en el Panel de Administración.');
    }

    try {
      const credentials = this.decryptCredentials(source.credentials);
      const provider = this.getProvider(source.provider);
      
      const files = await provider.listFiles(credentials, folderId || source.rootFolderId || undefined);
      
      // ✅ Si funcionó, limpiar el error y reactivar si estaba inactiva
      await this.repository.updateLastError(sourceId, null);
      if (!source.isActive) {
        await this.repository.update(sourceId, { isActive: true });
      }
      
      return files;
    } catch (error) {
      let errorMessage = 'Error desconocido al listar archivos';
      let isAuthError = false;
      
      if (error instanceof Error) {
        // Errores comunes de APIs
        if (error.message.includes('401') || error.message.includes('Unauthorized') || 
            error.message.includes('Invalid Credentials')) {
          errorMessage = 'Token de acceso inválido o expirado';
          isAuthError = true;
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Sin permisos para acceder a esta carpeta';
        } else if (error.message.includes('404')) {
          errorMessage = 'Carpeta no encontrada';
        } else {
          errorMessage = error.message;
        }
      }
      
      // ⚠️ Si es error de auth y tenemos refresh token, intentar refrescar
      if (isAuthError) {
        const credentials = this.decryptCredentials(source.credentials);
        const clientId = source.clientId ? this.decryptString(source.clientId) : null;
        const clientSecret = source.clientSecret ? this.decryptString(source.clientSecret) : null;
        
        if (credentials.refreshToken && clientId && clientSecret) {
          console.log(`🔄 Token expirado para fuente ${sourceId}, intentando refrescar...`);
          try {
            const newTokens = await this.refreshAccessToken(
              source.provider,
              credentials.refreshToken,
              clientId,
              clientSecret
            );
            
            // Actualizar credenciales con el nuevo access token
            const updatedCredentials: DocumentSourceCredentials = {
              ...credentials,
              accessToken: newTokens.accessToken,
              // Si viene un nuevo refresh token, actualizarlo también
              refreshToken: newTokens.refreshToken || credentials.refreshToken,
            };
            
            const encryptedCreds = this.encryptCredentials(updatedCredentials);
            await this.repository.update(sourceId, { 
              credentials: encryptedCreds,
              isActive: true 
            });
            await this.repository.updateLastError(sourceId, null);
            
            console.log(`✅ Token refrescado exitosamente para fuente ${sourceId}`);
            
            // Reintentar la operación con el nuevo token
            const provider = this.getProvider(source.provider);
            const files = await provider.listFiles(updatedCredentials, folderId || source.rootFolderId || undefined);
            return files;
          } catch (refreshError) {
            console.error(`❌ Error al refrescar token para fuente ${sourceId}:`, refreshError);
            errorMessage = 'No se pudo refrescar el token. Por favor, vuelve a autenticarte.';
          }
        }
      }
      
      // ⚠️ Guardar el error en la BD
      await this.repository.updateLastError(sourceId, errorMessage);
      
      // Desactivar la fuente si es un error de autenticación
      if (isAuthError) {
        await this.repository.update(sourceId, { isActive: false });
      }
      
      throw new Error(errorMessage);
    }
  }

  private async refreshAccessToken(
    provider: string,
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    switch (provider) {
      case 'google_drive': {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        });

        return {
          accessToken: response.data.access_token,
          // Google a veces devuelve un nuevo refresh token
          refreshToken: response.data.refresh_token,
        };
      }

      case 'dropbox': {
        const response = await axios.post('https://api.dropboxapi.com/oauth2/token', {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        });

        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        };
      }

      case 'onedrive': {
        const response = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        return {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        };
      }

      default:
        throw new Error(`No se puede refrescar token para proveedor: ${provider}`);
    }
  }

  async downloadFile(sourceId: number, userId: number, fileId: string): Promise<Buffer> {
    const source = await this.repository.findById(sourceId);
    if (!source || source.userId !== userId) {
      throw new Error('Fuente de documentos no encontrada');
    }

    if (!source.isActive) {
      throw new Error('La fuente de documentos está inactiva. Por favor, actualiza las credenciales en el Panel de Administración.');
    }

    try {
      const credentials = this.decryptCredentials(source.credentials);
      const provider = this.getProvider(source.provider);
      
      const buffer = await provider.downloadFile(credentials, fileId);
      
      // ✅ Si funcionó, limpiar el error y reactivar si estaba inactiva
      await this.repository.updateLastError(sourceId, null);
      if (!source.isActive) {
        await this.repository.update(sourceId, { isActive: true });
      }
      
      return buffer;
    } catch (error) {
      let errorMessage = 'Error desconocido al descargar archivo';
      let isAuthError = false;
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized') ||
            error.message.includes('Invalid Credentials')) {
          errorMessage = 'Token de acceso inválido o expirado';
          isAuthError = true;
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Sin permisos para descargar este archivo';
        } else if (error.message.includes('404')) {
          errorMessage = 'Archivo no encontrado';
        } else {
          errorMessage = error.message;
        }
      }
      
      // ⚠️ Si es error de auth y tenemos refresh token, intentar refrescar
      if (isAuthError) {
        const credentials = this.decryptCredentials(source.credentials);
        const clientId = source.clientId ? this.decryptString(source.clientId) : null;
        const clientSecret = source.clientSecret ? this.decryptString(source.clientSecret) : null;
        
        if (credentials.refreshToken && clientId && clientSecret) {
          console.log(`🔄 Token expirado para fuente ${sourceId}, intentando refrescar...`);
          try {
            const newTokens = await this.refreshAccessToken(
              source.provider,
              credentials.refreshToken,
              clientId,
              clientSecret
            );
            
            // Actualizar credenciales con el nuevo access token
            const updatedCredentials: DocumentSourceCredentials = {
              ...credentials,
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken || credentials.refreshToken,
            };
            
            const encryptedCreds = this.encryptCredentials(updatedCredentials);
            await this.repository.update(sourceId, { 
              credentials: encryptedCreds,
              isActive: true 
            });
            await this.repository.updateLastError(sourceId, null);
            
            console.log(`✅ Token refrescado exitosamente para fuente ${sourceId}`);
            
            // Reintentar la operación con el nuevo token
            const provider = this.getProvider(source.provider);
            const buffer = await provider.downloadFile(updatedCredentials, fileId);
            return buffer;
          } catch (refreshError) {
            console.error(`❌ Error al refrescar token para fuente ${sourceId}:`, refreshError);
            errorMessage = 'No se pudo refrescar el token. Por favor, vuelve a autenticarte.';
          }
        }
      }
      
      // ⚠️ Guardar el error en la BD
      await this.repository.updateLastError(sourceId, errorMessage);
      
      // Desactivar la fuente si es un error de autenticación
      if (isAuthError) {
        await this.repository.update(sourceId, { isActive: false });
      }
      
      throw new Error(errorMessage);
    }
  }

  async getFileMetadata(sourceId: number, userId: number, fileId: string): Promise<CloudFileDto> {
    const source = await this.repository.findById(sourceId);
    if (!source || source.userId !== userId || !source.isActive) {
      throw new Error('Source not found or inactive');
    }

    const credentials = this.decryptCredentials(source.credentials);
    const provider = this.getProvider(source.provider);
    
    return await provider.getFileMetadata(credentials, fileId);
  }

  async updateLastSync(sourceId: number): Promise<void> {
    await this.repository.updateLastSync(sourceId);
  }

  // Admin methods
  async getAllSourcesWithUserInfo(): Promise<any[]> {
    const sources = await this.repository.findAll();
    return sources.map(source => ({
      ...this.toResponseDto(source),
      userName: (source as any).user?.email || (source as any).user?.name,
    }));
  }

  private getProvider(providerName: string): CloudStorageProvider {
    switch (providerName) {
      case 'google_drive':
        return this.googleDriveProvider;
      case 'dropbox':
        return this.dropboxProvider;
      case 'onedrive':
        return this.oneDriveProvider;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  private encryptCredentials(credentials: DocumentSourceCredentials): string {
    const iv = randomBytes(16);
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(credentials), 'utf8'),
      cipher.final(),
    ]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private encryptString(text: string): string {
    const iv = randomBytes(16);
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptString(encryptedData: string): string {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    
    const decipher = createDecipheriv(this.algorithm, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  private decryptCredentials(encryptedData: string): DocumentSourceCredentials {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = Buffer.from(this.encryptionKey.padEnd(32, '0').slice(0, 32));
    
    const decipher = createDecipheriv(this.algorithm, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  private toResponseDto(source: {
    id: number;
    userId: number;
    name: string;
    provider: string;
    rootFolderId: string | null;
    isActive: boolean;
    lastError?: string | null;
    lastSyncAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): DocumentSourceResponseDto {
    return {
      id: source.id,
      userId: source.userId,
      name: source.name,
      provider: source.provider,
      rootFolderId: source.rootFolderId,
      isActive: source.isActive,
      lastError: source.lastError || null,
      lastSyncAt: source.lastSyncAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}

