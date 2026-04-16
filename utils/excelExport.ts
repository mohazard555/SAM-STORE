
import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel file with Arabic support and RTL direction.
 * @param data Array of objects to export
 * @param fileName Name of the file to save
 * @param sheetName Name of the sheet
 */
export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
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

  const fullFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

  // Try to use File System Access API for "Save As" dialog
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fullFileName,
        types: [{
          description: 'Excel file',
          accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
        }]
      });
      
      const writable = await handle.createWritable();
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      await writable.write(excelBuffer);
      await writable.close();
      return;
    } catch (err: any) {
      // If user cancels, just return
      if (err.name === 'AbortError') return;
      console.error('File System Access API error, falling back to standard download:', err);
    }
  }

  // Fallback to standard browser download
  if ((window as any).AppCompatibility) {
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const env = (window as any).AppCompatibility.getEnvironment();
    
    if (env === 'android-webview' || env === 'appcreator24') {
      // For WebViews, pass base64 data to use the server-side proxy
      const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      (window as any).AppCompatibility.safeDownload(`data:${mimeType};base64,${excelBase64}`, fullFileName, mimeType);
    } else {
      // For standard browsers, use Blob URL
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      (window as any).AppCompatibility.safeDownload(url, fullFileName, mimeType);
      // Cleanup URL after some time
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  } else {
    XLSX.writeFile(workbook, fullFileName);
  }
};
