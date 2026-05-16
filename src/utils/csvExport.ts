/**
 * CSV Export Utility
 * Generates and downloads CSV files from data
 */

export interface CsvColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
}

/**
 * Convert data to CSV format
 * @param data - Array of objects to convert
 * @param columns - Column definitions
 * @returns CSV string
 */
export function convertToCSV(data: any[], columns: CsvColumn[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headers = columns.map((col) => escapeCSVValue(col.header));
  const headerRow = headers.join(',');

  // Create data rows
  const dataRows = data.map((row) => {
    const values = columns.map((col) => {
      const value = row[col.key];
      const formattedValue = col.format ? col.format(value) : value;
      return escapeCSVValue(formattedValue);
    });
    return values.join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Download CSV file
 * @param csvContent - CSV content string
 * @param filename - Filename (without extension)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and download
 * @param data - Array of objects to export
 * @param columns - Column definitions
 * @param filename - Filename (without extension)
 */
export function exportToCSV(data: any[], columns: CsvColumn[], filename: string): void {
  const csvContent = convertToCSV(data, columns);
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}`;
  downloadCSV(csvContent, fullFilename);
}

/**
 * Format date for CSV export
 * @param date - Date string or Date object
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateForCSV(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format number for CSV export
 * @param value - Number value
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumberForCSV(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '';
  return value.toFixed(decimals);
}
