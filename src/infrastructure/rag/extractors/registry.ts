import path from 'path';
import { TextExtractor } from '../../../domain/rag/ports/services';
import { PdfTextExtractor } from './pdf.extractor';
import { DocxTextExtractor } from './docx.extractor';
import { DocTextExtractor } from './doc.extractor';
import { TxtTextExtractor } from './txt.extractor';
import { ExcelTextExtractor } from './excel.extractor';

export class TextExtractorRegistry {
  private readonly extractors: TextExtractor[] = [
    new PdfTextExtractor(),
    new DocxTextExtractor(),
    new DocTextExtractor(),
    new TxtTextExtractor(),
    new ExcelTextExtractor(),
  ];

  getExtractor(filePath: string): TextExtractor {
    const ext = path.extname(filePath).toLowerCase();
    const extractor = this.extractors.find((e) => e.supports(ext));
    if (!extractor) throw new Error(`Formato no soportado: ${ext}`);
    return extractor;
  }
}

