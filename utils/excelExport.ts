
import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel file with Arabic support and RTL direction.
 * @param data Array of objects to export
 * @param fileName Name of the file to save
 * @param sheetName Name of the sheet
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) return;

  // Create worksheet from JSON
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set direction to RTL for Arabic support
  if (!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'].push({ RTL: true });

  // Optional: Set column widths based on content
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const colWidths = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10; // default width
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        const length = cell.v.toString().length;
        if (length > maxWidth) maxWidth = length;
      }
    }
    colWidths.push({ wch: maxWidth + 2 });
  }
  worksheet['!cols'] = colWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Write file
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};
