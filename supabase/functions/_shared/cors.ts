export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('NODE_ENV') === 'production' 
    ? 'https://mailmop.com' 
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}; 