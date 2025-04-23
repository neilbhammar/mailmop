import { useState } from 'react';
import { TableSender } from '@/hooks/useSenderData';
import { generateCSV, generateExportFilename } from '@/lib/utils/exportUtils';

interface UseExportReturn {
  exportToCSV: (senders: TableSender[]) => void;
  isExporting: boolean;
  error: string | null;
}

/**
 * Hook for handling CSV exports of sender analysis data
 * @returns Object with export function and status
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToCSV = async (senders: TableSender[]) => {
    setIsExporting(true);
    setError(null);

    try {
      // Generate CSV content
      const csvContent = generateCSV(senders);
      
      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set up download
      link.setAttribute('href', url);
      link.setAttribute('download', `${generateExportFilename()}.csv`);
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Export] Error exporting CSV:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToCSV,
    isExporting,
    error
  };
} 