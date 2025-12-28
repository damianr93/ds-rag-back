import { TextExtractor } from '../../../domain/rag/ports/services';
import mammoth from 'mammoth';

export class DocxTextExtractor implements TextExtractor {
  supports(ext: string): boolean {
    return ext.toLowerCase() === '.docx';
  }

  async extract(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
}

