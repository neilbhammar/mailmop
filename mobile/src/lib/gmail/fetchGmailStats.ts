export interface GmailStats {
  emailAddress: string;
  totalEmails: number;
  totalThreads: number;
  lastUpdated: number;
}

export async function fetchGmailStats(accessToken: string): Promise<GmailStats> {
  const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Gmail profile');
  }

  const profile = await profileResponse.json();

  return {
    emailAddress: profile.emailAddress,
    totalEmails: profile.messagesTotal || 0,
    totalThreads: profile.threadsTotal || 0,
    lastUpdated: Date.now(),
  };
}
