import axios from 'axios';
import { CloudStorageProvider } from '../../../domain/document-sources/ports/services';
import { CloudFile, DocumentSourceCredentials } from '../../../domain/entities/document-source.entity';

export class DropboxProvider implements CloudStorageProvider {
  private readonly baseUrl = 'https://api.dropboxapi.com/2';
  private readonly contentUrl = 'https://content.dropboxapi.com/2';

  async listFiles(credentials: DocumentSourceCredentials, folderId?: string): Promise<CloudFile[]> {
    const path = folderId || '';
    
    const response = await axios.post(
      `${this.baseUrl}/files/list_folder`,
      {
        path,
        recursive: false,
        include_deleted: false,
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.entries.map((entry: {
      '.tag': string;
      id: string;
      name: string;
      path_lower: string;
      size?: number;
      client_modified?: string;
    }) => ({
      id: entry.id,
      name: entry.name,
      mimeType: entry['.tag'] === 'folder' ? 'folder' : this.getMimeTypeFromName(entry.name),
      isFolder: entry['.tag'] === 'folder',
      size: entry.size,
      modifiedTime: entry.client_modified ? new Date(entry.client_modified) : undefined,
      parentId: folderId || undefined,
    }));
  }

  async downloadFile(credentials: DocumentSourceCredentials, fileId: string): Promise<Buffer> {
    const response = await axios.post(
      `${this.contentUrl}/files/download`,
      null,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: fileId }),
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  }

  async getFileMetadata(credentials: DocumentSourceCredentials, fileId: string): Promise<CloudFile> {
    const response = await axios.post(
      `${this.baseUrl}/files/get_metadata`,
      {
        path: fileId,
      },
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const file = response.data;
    return {
      id: file.id,
      name: file.name,
      mimeType: file['.tag'] === 'folder' ? 'folder' : this.getMimeTypeFromName(file.name),
      isFolder: file['.tag'] === 'folder',
      size: file.size,
      modifiedTime: file.client_modified ? new Date(file.client_modified) : undefined,
    };
  }

  private getMimeTypeFromName(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}

