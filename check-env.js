// Quick script to check your Google OAuth environment variables
// Run this with: node check-env.js

console.log('🔍 Checking Google OAuth Environment Variables...\n');

console.log('Frontend Client ID (NEXT_PUBLIC_GOOGLE_CLIENT_ID):', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '❌ MISSING');
console.log('Backend Client ID (GOOGLE_CLIENT_ID):', process.env.GOOGLE_CLIENT_ID || '❌ MISSING');
console.log('Google Client Secret (GOOGLE_CLIENT_SECRET):', process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ MISSING');

console.log('\n📝 What should be true:');
console.log('- NEXT_PUBLIC_GOOGLE_CLIENT_ID should equal GOOGLE_CLIENT_ID');
console.log('- Both should be from the same Google Cloud Project');
console.log('- GOOGLE_CLIENT_SECRET should be set');

const frontendId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const backendId = process.env.GOOGLE_CLIENT_ID;

console.log('\n🔍 Match Check:');
if (frontendId && backendId) {
  if (frontendId === backendId) {
    console.log('✅ Client IDs match!');
  } else {
    console.log('❌ CLIENT IDs DO NOT MATCH!');
    console.log('This is likely causing your permissions error.');
  }
} else {
  console.log('❌ Cannot compare - one or both IDs are missing');
}

console.log('\n🛠️  To fix:');
console.log('1. Go to Google Cloud Console');
console.log('2. Navigate to APIs & Services > Credentials');
console.log('3. Find your OAuth 2.0 Client ID');
console.log('4. Copy the Client ID');
console.log('5. Set both NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to the same value');
console.log('6. Set GOOGLE_CLIENT_SECRET to the Client Secret from the same OAuth client'); 