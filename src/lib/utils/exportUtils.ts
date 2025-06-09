import { TableSender } from '@/hooks/useSenderData';

/**
 * Formats a date string into a more readable format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Jan 1, 2024")
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Escapes special characters in CSV fields
 * @param field - The field value to escape
 * @returns Escaped field value
 */
function escapeCSVField(field: any): string {
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

/**
 * Generates a CSV string from sender analysis data
 * @param senders - Array of sender analysis results
 * @returns CSV string with headers
 */
export function generateCSV(senders: TableSender[]): string {
  // Define headers
  const headers = [
    'Name',
    'Email',
    'Last Email',
    'Count',
    'Has Unsubscribe',
    'Unsubscribe URL'
  ];

  // Create CSV rows
  const rows = senders.map(sender => {
    // Use enriched URL if available, otherwise fall back to header URL
    const unsubscribeUrl = sender.unsubscribe?.enrichedUrl || 
                          sender.unsubscribe?.url || 
                          sender.unsubscribe?.mailto || 
                          '';
    
    return [
      escapeCSVField(sender.name),
      escapeCSVField(sender.email),
      escapeCSVField(formatDate(sender.lastEmail)),
      escapeCSVField(sender.count),
      escapeCSVField(sender.hasUnsubscribe ? 'Yes' : 'No'),
      escapeCSVField(unsubscribeUrl)
    ];
  });

  // Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

/**
 * Generates a filename for the CSV export
 * @returns String in format "MailMopSenderAnalysis_YYYY-MM-DD_HH-mm"
 */
export function generateExportFilename(): string {
  const now = new Date();
  const date = now.toISOString()
    .split('T')[0];
  const time = now.toTimeString()
    .split(' ')[0]
    .replace(/:/g, '-');
  
  return `MailMopSenderAnalysis_${date}_${time}`;
} 