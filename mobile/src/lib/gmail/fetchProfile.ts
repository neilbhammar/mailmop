/**
 * Fetches the Gmail profile of the authenticated user
 * @param accessToken - The Gmail OAuth access token
 * @returns The Gmail profile containing the email address
 */
export async function fetchGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Gmail profile');
  }

  return response.json();
} 