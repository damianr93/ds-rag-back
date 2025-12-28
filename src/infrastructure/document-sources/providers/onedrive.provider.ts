import axios from 'axios';
import { CloudStorageProvider } from '../../../domain/document-sources/ports/services';
import { CloudFile, DocumentSourceCredentials } from '../../../domain/entities/document-source.entity';

export class OneDriveProvider implements CloudStorageProvider {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  async listFiles(credentials: DocumentSourceCredentials, folderId?: string): Promise<CloudFile[]> {
    const path = folderId 
      ? `/me/drive/items/${folderId}/children`
      : '/me/drive/root/children';
    
    const response = await axios.get(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    });

    return response.data.value.map((item: {
      id: string;
      name: string;
      folder?: Record<string, unknown>;
      file?: { mimeType: string };
      size: number;
      lastModifiedDateTime: string;
      webUrl: string;
      parentReference?: { id: string };
    }) => ({
      id: item.id,
      name: item.name,
      mimeType: item.folder ? 'folder' : (item.file?.mimeType || 'application/octet-stream'),
      isFolder: !!item.folder,
      size: item.size,
      modifiedTime: new Date(item.lastModifiedDateTime),
      webViewLink: item.webUrl,
      parentId: item.parentReference?.id,
    }));
  }

  async downloadFile(credentials: DocumentSourceCredentials, fileId: string): Promise<Buffer> {
    const response = await axios.get(
      `${this.baseUrl}/me/drive/items/${fileId}/content`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }

  async getFileMetadata(credentials: DocumentSourceCredentials, fileId: string): Promise<CloudFile> {
    const response = await axios.get(
      `${this.baseUrl}/me/drive/items/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      }
    );

    const item = response.data;
    return {
      id: item.id,
      name: item.name,
      mimeType: item.folder ? 'folder' : (item.file?.mimeType || 'application/octet-stream'),
      isFolder: !!item.folder,
      size: item.size,
      modifiedTime: new Date(item.lastModifiedDateTime),
      webViewLink: item.webUrl,
      parentId: item.parentReference?.id,
    };
  }
}

