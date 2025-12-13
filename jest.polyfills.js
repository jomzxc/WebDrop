// Runs before test files. Keep this minimal and side-effect-only.
// Ensures common Web APIs exist for code that expects them (Next route handlers, file transfer utilities).

const { TextDecoder, TextEncoder } = require('node:util')

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder
}

// Node 18+ normally provides fetch/Request/Response/Headers.
// Some Jest environments may not expose them, so fall back to the built-ins if present.
// (No external deps; if they truly don't exist, tests that rely on them should use @jest-environment node.)
if (typeof globalThis.fetch === 'undefined' && typeof fetch !== 'undefined') {
  globalThis.fetch = fetch
}
if (typeof globalThis.Request === 'undefined' && typeof Request !== 'undefined') {
  globalThis.Request = Request
}
if (typeof globalThis.Response === 'undefined' && typeof Response !== 'undefined') {
  globalThis.Response = Response
}
if (typeof globalThis.Headers === 'undefined' && typeof Headers !== 'undefined') {
  globalThis.Headers = Headers
}
