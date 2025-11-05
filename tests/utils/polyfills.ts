/**
 * Polyfills for jsdom environment
 * 
 * These polyfills add missing browser APIs to the jsdom test environment.
 */

/**
 * Polyfill for Blob.arrayBuffer()
 * 
 * jsdom doesn't fully support Blob.arrayBuffer() which is needed by the
 * FileTransferManager when reading file chunks.
 */
export function setupBlobPolyfill() {
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = async function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(this)
      })
    }
  }
}
