import { TextExtractor } from '../../../domain/rag/ports/services';
import path from 'path';
import { PDFExtract } from 'pdf.js-extract';

export class PdfTextExtractor implements TextExtractor {
  private pdfExtract = new PDFExtract();

  supports(ext: string): boolean {
    return ext.toLowerCase() === '.pdf';
  }

  extract(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pdfExtract.extract(filePath, {}, (err, data) => {
        if (err) return reject(err);
        if (!data) return reject(new Error('No se pudo extraer datos del PDF'));
        const text = data.pages.map((page) => page.content.map((i) => i.str).join(' ')).join('\n\n');
        resolve(text);
      });
    });
  }
}

