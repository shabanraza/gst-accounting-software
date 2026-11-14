// The QR matrix encoder alone. The package's main entry also pulls in its
// Node PNG/file renderers, which have no place in the Worker bundle.
declare module 'qrcode/lib/core/qrcode.js' {
  export { create } from 'qrcode'
}
