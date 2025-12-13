// Jest setup for DOM matchers and common test globals
require('@testing-library/jest-dom')

// Some components use navigator.clipboard; provide a safe default mock.
if (!global.navigator.clipboard) {
  global.navigator.clipboard = {
    writeText: async () => {},
  }
}

// Radix UI components (Select/Dropdown/etc) and some layout code expect ResizeObserver.
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// Some tests run in the Node environment (route handlers). Guard any window-only polyfills.
const hasWindow = typeof window !== 'undefined'

// Radix UI (Select) uses Pointer Events + pointer capture APIs that jsdom doesn't fully implement.
if (hasWindow) {
  if (!window.PointerEvent) {
    window.PointerEvent = window.MouseEvent
  }

  const proto = window.Element && window.Element.prototype
  if (proto) {
    if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false
    if (!proto.setPointerCapture) proto.setPointerCapture = () => {}
    if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {}
  }

  // Some Radix components may call scrollIntoView; jsdom doesn't implement layout.
  if (window.HTMLElement && !window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {}
  }
}

// Dark mode providers (and next-themes) expect matchMedia.
if (hasWindow && !window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// Some hooks trigger a download via URL.createObjectURL.
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = () => 'blob:jest'
}

if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = () => {}
}
