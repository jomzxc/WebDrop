# Supabase OAuth Setup Guide

## Important: OAuth Provider Configuration Required

The OAuth providers (GitHub) need to be enabled in your Supabase dashboard before they will work.

### Steps to Enable OAuth Providers:

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab

3. **Enable GitHub Provider:**

   #### GitHub OAuth:
   - Toggle "GitHub" to enabled
   - Create OAuth app at: https://github.com/settings/developers
   - Add callback URL: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

4. **Configure Site URL and Redirect URLs**
   
   **IMPORTANT:** You need to add your v0 preview URL to the allowed redirect URLs.
   
   - In Supabase Dashboard → Authentication → URL Configuration
   - Set Site URL to your v0 preview URL (e.g., `https://your-project.v0.app`)
   - Add Redirect URLs:
     - `https://your-project.v0.app/auth/callback`
     - `https://your-project.v0.app/**` (wildcard for all routes)
     - `http://localhost:3000/auth/callback` (for local development)
     - `http://localhost:3000/**` (wildcard for local development)

5. **Email Confirmation Settings**
   - In Supabase Dashboard → Authentication → Email Templates
   - Ensure "Confirm signup" template uses: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`
   - **OR** disable email confirmation for development: 
     - Go to Authentication → Providers → Email
     - Toggle "Confirm email" OFF (easier for testing)

## Finding Your v0 Preview URL

Your v0 preview URL is the URL shown in the v0 preview window. It typically looks like:
- `https://[project-name]-[random-id].v0.app`

Copy this URL and add it to the Supabase redirect URLs as shown above.

## Environment Variables

These are already configured in your Vercel project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Testing

After configuration:
1. Try GitHub OAuth login - should redirect to GitHub and back successfully
2. Try email signup - should receive confirmation email (if enabled) or auto-login (if disabled)
3. Check Supabase Dashboard → Authentication → Users to see registered users

## Troubleshooting

**"Email link is invalid or has expired"**
- Make sure your v0 preview URL is added to Supabase redirect URLs
- Or disable email confirmation in Supabase settings

**"OAuth provider not enabled"**
- Enable GitHub provider in Supabase Dashboard → Authentication → Providers
- Add the Supabase callback URL to your GitHub OAuth app settings
