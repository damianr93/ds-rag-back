import { TextExtractor } from '../../../domain/rag/ports/services';
import ExcelJS from 'exceljs';

export class ExcelTextExtractor implements TextExtractor {
  supports(ext: string): boolean {
    const lowerExt = ext.toLowerCase();
    return lowerExt === '.xlsx';
  }

  async extract(filePath: string): Promise<string> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const sheets: string[] = [];

      workbook.eachSheet((worksheet, sheetId) => {
        const sheetText: string[] = [];
        sheetText.push(`\n=== Hoja: ${worksheet.name} ===\n`);

        worksheet.eachRow((row, rowNumber) => {
          const rowValues: string[] = [];
          
          row.eachCell({ includeEmpty: false }, (cell) => {
            let cellValue = '';
            
            if (cell.value !== null && cell.value !== undefined) {
              if (typeof cell.value === 'object' && 'text' in cell.value) {
                cellValue = String((cell.value as any).text);
              } else if (typeof cell.value === 'object' && 'result' in cell.value) {
                cellValue = String((cell.value as any).result);
              } else {
                cellValue = String(cell.value);
              }
            }
            
            const trimmed = cellValue.trim();
            if (trimmed.length > 0) {
              rowValues.push(trimmed);
            }
          });
          
          if (rowValues.length > 0) {
            sheetText.push(rowValues.join(' | '));
          }
        });

        if (sheetText.length > 1) {
          sheets.push(sheetText.join('\n'));
        }
      });

      return sheets.join('\n\n');
    } catch (error: any) {
      throw new Error(`Error extrayendo texto del archivo Excel: ${error.message}`);
    }
  }
}

