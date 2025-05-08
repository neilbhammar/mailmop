import { cookies } from 'next/headers';

export async function GET() {
  // Simply check if the refresh token cookie exists
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('mm_refresh');
  
  return Response.json({ hasRefreshToken: !!refreshToken });
} 