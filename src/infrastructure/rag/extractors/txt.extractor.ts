import { TextExtractor } from '../../../domain/rag/ports/services';
import fs from 'fs/promises';

export class TxtTextExtractor implements TextExtractor {
  supports(ext: string): boolean {
    return ext.toLowerCase() === '.txt';
  }

  async extract(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }
}

