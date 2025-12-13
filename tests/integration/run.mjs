/*
 * Lightweight integration runner.
 *
 * This is intentionally network-safe and opt-in: it will only run if you provide
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * For contributions, this avoids hard-failing CI environments without secrets.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.log('[integration] skipped: missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(0)
}

// Basic connectivity check to Supabase Auth endpoint. We expect either 200 (if session)
// or 401 (no session). Both indicate the endpoint is reachable and keyed.
const endpoint = `${url.replace(/\/$/, '')}/auth/v1/user`

const res = await fetch(endpoint, {
  method: 'GET',
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  },
})

if (![200, 401, 403].includes(res.status)) {
  const text = await res.text().catch(() => '')
  console.error('[integration] unexpected status:', res.status, text.slice(0, 500))
  process.exit(1)
}

console.log('[integration] ok: Supabase auth endpoint reachable (status:', res.status + ')')
