import axios from 'axios';
import { CloudStorageProvider } from '../../../domain/document-sources/ports/services';
import { CloudFile, DocumentSourceCredentials } from '../../../domain/entities/document-source.entity';

export class GoogleDriveProvider implements CloudStorageProvider {
  private readonly baseUrl = 'https://www.googleapis.com/drive/v3';

  async listFiles(credentials: DocumentSourceCredentials, folderId?: string): Promise<CloudFile[]> {
    const query = folderId ? `'${folderId}' in parents` : "'root' in parents";
    
    const response = await axios.get(`${this.baseUrl}/files`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
      params: {
        q: `${query} and trashed=false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
        pageSize: 1000,
      },
    });

    return response.data.files.map((file: {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime?: string;
      webViewLink?: string;
      parents?: string[];
    }) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      size: file.size ? parseInt(file.size) : undefined,
      modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
      webViewLink: file.webViewLink,
      parentId: file.parents?.[0],
    }));
  }

  async downloadFile(credentials: DocumentSourceCredentials, fileId: string): Promise<Buffer> {
    // Primero obtener metadata para saber si es un Google Doc
    const metadata = await this.getFileMetadata(credentials, fileId);
    
    let url = `${this.baseUrl}/files/${fileId}`;
    let params: Record<string, string> = { alt: 'media' };

    // Si es un Google Doc, usar export
    if (metadata.mimeType.startsWith('application/vnd.google-apps.')) {
      url = `${this.baseUrl}/files/${fileId}/export`;
      params = { mimeType: 'application/pdf' }; // Exportar como PDF
    }

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
      params,
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  async getFileMetadata(credentials: DocumentSourceCredentials, fileId: string): Promise<CloudFile> {
    const response = await axios.get(`${this.baseUrl}/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
      params: {
        fields: 'id,name,mimeType,size,modifiedTime,webViewLink,parents',
      },
    });

    const file = response.data;
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      size: file.size ? parseInt(file.size) : undefined,
      modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
      webViewLink: file.webViewLink,
      parentId: file.parents?.[0],
    };
  }
}

