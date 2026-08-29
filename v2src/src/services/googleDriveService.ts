// Google Drive API Client Service (using standard REST v3)

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
  iconLink?: string;
}

export class GoogleDriveService {
  private static FOLDER_MIME = 'application/vnd.google-apps.folder';

  /**
   * Search or list files in Google Drive
   */
  static async listFiles(accessToken: string, query?: string): Promise<DriveFile[]> {
    try {
      const qParam = query 
        ? encodeURIComponent(`trashed = false and (${query})`)
        : encodeURIComponent("trashed = false");

      const url = `https://www.googleapis.com/drive/v3/files?q=${qParam}&fields=files(id,name,mimeType,webViewLink,createdTime,size,iconLink)&pageSize=30&orderBy=createdTime desc`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Erro ao listar arquivos do Drive (${res.status})`);
      }

      const data = await res.json();
      return data.files || [];
    } catch (error: any) {
      console.error('Drive listFiles failed:', error);
      throw error;
    }
  }

  /**
   * Find or create dedicated application folder
   */
  static async getOrCreateAppFolder(accessToken: string, folderName = 'Clínica Rsantos - Backup & Relatórios'): Promise<string> {
    try {
      // Check if folder exists
      const existing = await this.listFiles(accessToken, `name = '${folderName}' and mimeType = '${this.FOLDER_MIME}'`);
      if (existing.length > 0) {
        return existing[0].id;
      }

      // Create folder
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: this.FOLDER_MIME
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive');
      }

      const data = await res.json();
      return data.id;
    } catch (error: any) {
      console.error('Drive getOrCreateAppFolder failed:', error);
      throw error;
    }
  }

  /**
   * Upload JSON or text file to Google Drive
   */
  static async uploadTextFile(
    accessToken: string, 
    fileName: string, 
    content: string, 
    mimeType = 'application/json',
    folderId?: string
  ): Promise<DriveFile> {
    try {
      const metadata: Record<string, any> = {
        name: fileName,
        mimeType: mimeType
      };

      if (folderId) {
        metadata.parents = [folderId];
      }

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelimiter;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Erro ao fazer upload para o Google Drive');
      }

      return await res.json();
    } catch (error: any) {
      console.error('Drive uploadTextFile error:', error);
      throw error;
    }
  }

  /**
   * Delete file with explicit confirmation requirement
   */
  static async deleteFile(accessToken: string, fileId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Erro ao excluir arquivo do Google Drive');
      }

      return true;
    } catch (error: any) {
      console.error('Drive deleteFile error:', error);
      throw error;
    }
  }
}
