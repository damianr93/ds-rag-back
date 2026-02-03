export class SourceUrlGenerator {
  static generateUrl(fileId: string, provider: string, fileName: string): string {
    switch (provider) {
      case 'google_drive':
        return `https://drive.google.com/file/d/${fileId}/view`;
      
      case 'dropbox':
        return `https://www.dropbox.com/home${fileName}`;
      
      case 'onedrive':
        return `https://onedrive.live.com/?id=${fileId}`;
      
      case 'local':
        return `/api/files/${encodeURIComponent(fileName)}`;
      
      default:
        return '';
    }
  }

  static formatSourceWithLink(source: string, sourceUrl?: string, sourceType?: string): string {
    if (sourceUrl) {
      return `[${source}](${sourceUrl})`;
    }
    return source;
  }
}
