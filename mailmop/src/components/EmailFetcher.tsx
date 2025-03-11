import { useState, useEffect } from 'react';
import { getEmailCounts, EmailCounts } from '../api/gmailApi';

interface EmailFetcherProps {
  accessToken: string;
}

export default function EmailFetcher({ accessToken }: EmailFetcherProps) {
  const [emailCounts, setEmailCounts] = useState<EmailCounts>({ messages: null, threads: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div>Loading email information...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>MailMop - Email Analysis</h2>
      {emailCounts.messages === null ? (
        <p>No email information available</p>
      ) : (
        <div>
          {emailCounts.emailAddress && (
            <p>Email: {emailCounts.emailAddress}</p>
          )}
          <p>Total Emails: {emailCounts.messages.toLocaleString()}</p>
          {emailCounts.threads !== null && (
            <p>Total Conversations: {emailCounts.threads.toLocaleString()}</p>
          )}
          {emailCounts.messages !== null && emailCounts.threads !== null && (
            <p>Average Emails per Conversation: {(emailCounts.messages / emailCounts.threads).toFixed(1)}</p>
          )}
        </div>
      )}
    </div>
  );
}
