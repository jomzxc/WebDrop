# Supabase OAuth Setup Guide

## Important: OAuth Provider Configuration Required

The OAuth providers (Google, GitHub, Microsoft) need to be enabled in your Supabase dashboard before they will work.

### Steps to Enable OAuth Providers:

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab

3. **Enable Each Provider:**

   #### Google OAuth:
   - Toggle "Google" to enabled
   - Create OAuth credentials at: https://console.cloud.google.com/apis/credentials
   - Add authorized redirect URI: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

   #### GitHub OAuth:
   - Toggle "GitHub" to enabled
   - Create OAuth app at: https://github.com/settings/developers
   - Add callback URL: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

   #### Microsoft OAuth (Azure):
   - Toggle "Azure" to enabled
   - Register app at: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
   - Add redirect URI: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Copy Application (client) ID and Client Secret to Supabase

4. **Configure Site URL**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Set Site URL to: `http://localhost:3000` (for development)
   - Add Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**` (wildcard for all routes)

5. **Email Confirmation Settings**
   - In Supabase Dashboard → Authentication → Email Templates
   - Ensure "Confirm signup" template uses: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`
   - Or disable email confirmation for development: Authentication → Providers → Email → "Confirm email" toggle OFF

## Environment Variables

Make sure these are set in your Vercel project (already configured):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (for local development)

## Testing

After configuration:
1. Try OAuth login - should redirect to provider and back successfully
2. Try email signup - should receive confirmation email (if enabled)
3. Check Supabase Dashboard → Authentication → Users to see registered users
