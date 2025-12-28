import { TextExtractor } from '../../../domain/rag/ports/services';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class DocTextExtractor implements TextExtractor {
  private readonly command: string = 'antiword';

  supports(ext: string): boolean {
    return ext.toLowerCase() === '.doc';
  }

  async extract(filePath: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.command, [filePath], {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      return stdout;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `'antiword' no está instalado. Instálalo con: sudo apt-get install antiword`
        );
      }
      throw new Error(`Error extrayendo texto del archivo .doc: ${error.message}`);
    }
  }
}

