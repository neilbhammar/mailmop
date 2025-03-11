import { useState, useEffect } from 'react';
import { 
  getEmailCounts, 
  EmailCounts, 
  processEmails, 
  SenderSummary, 
  EmailProcessingOptions,
  ProcessingProgress,
  generateCSV,
  downloadCSV
} from '../api/gmailApi';

interface EmailFetcherProps {
  accessToken: string;
}

export default function EmailFetcher({ accessToken }: EmailFetcherProps) {
  const [emailCounts, setEmailCounts] = useState<EmailCounts>({ messages: null, threads: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for email processing
  const [processingOptions, setProcessingOptions] = useState<EmailProcessingOptions>({
    excludeSentByMe: true,
    onlyUnsubscribe: false
  });
  const [progress, setProgress] = useState<ProcessingProgress>({
    processed: 0,
    total: null,
    status: 'idle'
  });
  const [senderSummary, setSenderSummary] = useState<SenderSummary>({});
  const [sortConfig, setSortConfig] = useState<{
    key: 'email' | 'name' | 'count';
    direction: 'ascending' | 'descending';
  }>({
    key: 'count',
    direction: 'descending'
  });
  const [filterText, setFilterText] = useState('');
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);
  const [hasMetadataScopeIssue, setHasMetadataScopeIssue] = useState(false);

  useEffect(() => {
    async function fetchEmailCounts() {
      try {
        setLoading(true);
        const counts = await getEmailCounts(accessToken);
        setEmailCounts(counts);
      } catch (err) {
        console.error('Failed to fetch email counts:', err);
        setError('Failed to load email information. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchEmailCounts();
  }, [accessToken]);

  // Handle option changes
  const handleOptionChange = (option: keyof EmailProcessingOptions) => {
    setProcessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
    
    // Clear any previous scope warnings when options change
    setScopeWarning(null);
  };

  // Handle process emails button click
  const handleProcessEmails = async () => {
    try {
      // Reset any previous results and errors
      setSenderSummary({});
      setError(null);
      setScopeWarning(null);
      setHasMetadataScopeIssue(false);
      setProgress({
        processed: 0,
        total: null,
        status: 'processing'
      });
      
      // Start processing emails
      const summary = await processEmails(
        accessToken,
        processingOptions,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );
      
      // Update the sender summary
      setSenderSummary(summary);
      
      // Check if any filters were applied
      const filtersRequested = processingOptions.excludeSentByMe || processingOptions.onlyUnsubscribe;
      
      // If filters were requested but we have results without filtering, show a warning
      if (filtersRequested && Object.keys(summary).length > 0 && 
          !progress.error?.includes("Metadata scope does not support 'q' parameter")) {
        setScopeWarning(
          "Note: Your current authentication scope may not support filtering. " +
          "The results shown may include all emails rather than just the filtered set. " +
          "To use filters, please use the 'Reset Permissions' button and sign in again."
        );
      }
    } catch (err) {
      console.error('Failed to process emails:', err);
      
      // Check if the error is related to scope limitations
      if (err instanceof Error && err.message.includes("Metadata scope does not support 'q' parameter")) {
        setHasMetadataScopeIssue(true);
        setError(
          "Your current authentication doesn't have permission to use filters. " +
          "Please use the 'Reset Permissions' button above and sign in again to grant the necessary permissions, or try without filters."
        );
      } else {
        setError('Failed to process emails. Please try again.');
      }
      
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    }
  };

  // Handle sorting
  const handleSort = (key: 'email' | 'name' | 'count') => {
    setSortConfig(prev => ({
      key,
      direction: 
        prev.key === key && prev.direction === 'ascending' 
          ? 'descending' 
          : 'ascending'
    }));
  };

  // Handle CSV download
  const handleDownloadCSV = () => {
    const csvData = generateCSV(senderSummary);
    downloadCSV(csvData);
  };

  // Handle reset permissions
  const handleResetPermissions = () => {
    // Open Google's permissions page
    window.open('https://myaccount.google.com/permissions', '_blank');
    
    // Show instructions
    alert('Please follow these steps in the new tab:\n\n1. Find "MailMop" in the list of apps\n2. Click on it and select "Remove Access"\n3. Return to this page, sign out, and sign in again');
  };

  // Get sorted and filtered sender data
  const getSortedSenders = () => {
    const senders = Object.entries(senderSummary).map(([email, data]) => ({
      email,
      name: data.name,
      count: data.count
    }));
    
    // Apply filter
    const filteredSenders = filterText
      ? senders.filter(sender => 
          sender.email.toLowerCase().includes(filterText.toLowerCase()) ||
          sender.name.toLowerCase().includes(filterText.toLowerCase())
        )
      : senders;
    
    // Apply sorting
    return filteredSenders.sort((a, b) => {
      if (sortConfig.key === 'count') {
        return sortConfig.direction === 'ascending'
          ? a.count - b.count
          : b.count - a.count;
      } else {
        const aValue = a[sortConfig.key].toLowerCase();
        const bValue = b[sortConfig.key].toLowerCase();
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      }
    });
  };

  if (loading) return <div>Loading email information...</div>;
  if (error && !hasMetadataScopeIssue) return <div className="error">{error}</div>;

  return (
    <div className="email-fetcher">
      <h2>MailMop - Email Analysis</h2>
      
      {/* Email account info */}
      <div className="account-info">
        {emailCounts.emailAddress && (
          <p>Email: {emailCounts.emailAddress}</p>
        )}
        <p>Total Emails: {emailCounts.messages?.toLocaleString() || 'Unknown'}</p>
        {emailCounts.threads !== null && (
          <p>Total Conversations: {emailCounts.threads.toLocaleString()}</p>
        )}
        {emailCounts.messages !== null && emailCounts.threads !== null && (
          <p>Average Emails per Conversation: {(emailCounts.messages / emailCounts.threads).toFixed(1)}</p>
        )}
      </div>
      
      {/* Scope error message with reset button */}
      {hasMetadataScopeIssue && (
        <div className="scope-error">
          <p>{error}</p>
          <button onClick={handleResetPermissions} className="reset-permissions-button">
            Reset Google Permissions
          </button>
        </div>
      )}
      
      {/* Processing options */}
      <div className="processing-options">
        <h3>Email Processing Options</h3>
        
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={processingOptions.excludeSentByMe}
              onChange={() => handleOptionChange('excludeSentByMe')}
            />
            Exclude emails sent by me
          </label>
          
          <label>
            <input
              type="checkbox"
              checked={processingOptions.onlyUnsubscribe}
              onChange={() => handleOptionChange('onlyUnsubscribe')}
            />
            Only include emails with "unsubscribe"
          </label>
        </div>
        
        <button 
          onClick={handleProcessEmails}
          disabled={progress.status === 'processing'}
          className="process-button"
        >
          {progress.status === 'processing' ? 'Processing...' : 'Process Emails'}
        </button>
        
        {scopeWarning && (
          <div className="scope-warning">
            <p>{scopeWarning}</p>
            <button onClick={handleResetPermissions} className="inline-reset-button">
              Reset Permissions
            </button>
          </div>
        )}
      </div>
      
      {/* Progress indicator */}
      {progress.status !== 'idle' && (
        <div className="progress-section">
          <h3>Processing Progress</h3>
          
          <div className="progress-info">
            <p>
              Status: {progress.status === 'processing' ? 'Processing...' : 
                      progress.status === 'completed' ? 'Completed' : 
                      progress.status === 'error' ? 'Error' : 'Idle'}
            </p>
            <p>Emails Processed: {progress.processed.toLocaleString()}</p>
            {progress.error && !hasMetadataScopeIssue && <p className="error">Error: {progress.error}</p>}
          </div>
          
          {progress.status === 'processing' && (
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: progress.total 
                    ? `${Math.min(100, (progress.processed / progress.total) * 100)}%` 
                    : '100%',
                  animationDuration: progress.total ? 'none' : '2s'
                }}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Results section */}
      {progress.status === 'completed' && Object.keys(senderSummary).length > 0 && (
        <div className="results-section">
          <h3>Sender Summary</h3>
          
          <div className="results-actions">
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="filter-input"
            />
            
            <button onClick={handleDownloadCSV} className="download-button">
              Download as CSV
            </button>
          </div>
          
          <div className="table-container">
            <table className="sender-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className={sortConfig.key === 'name' ? sortConfig.direction : ''}>
                    Sender Name
                    {sortConfig.key === 'name' && (
                      <span className="sort-arrow">
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('email')} className={sortConfig.key === 'email' ? sortConfig.direction : ''}>
                    Email
                    {sortConfig.key === 'email' && (
                      <span className="sort-arrow">
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('count')} className={sortConfig.key === 'count' ? sortConfig.direction : ''}>
                    Count
                    {sortConfig.key === 'count' && (
                      <span className="sort-arrow">
                        {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedSenders().map((sender) => (
                  <tr key={sender.email}>
                    <td>{sender.name}</td>
                    <td>{sender.email}</td>
                    <td>{sender.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="total-senders">
            Total Unique Senders: {Object.keys(senderSummary).length.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
