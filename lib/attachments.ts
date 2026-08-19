// Screenshot/receipt attachments are stored inline in Postgres as data URLs
// (no external file storage, no extra cost/setup) — see prisma/schema.prisma.
// This file is imported from both the client (file-picker validation) and
// API routes (server-side re-validation), so it must stay framework-free.

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

const IMAGE_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp|heic|heif);base64,/i;

export function isImageDataUrl(dataUrl: string): boolean {
  return IMAGE_DATA_URL_RE.test(dataUrl);
}

export function estimateBase64Bytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// Returns an error message if the attachment is invalid, or null if it's fine.
export function validateAttachment(dataUrl: string): string | null {
  if (!isImageDataUrl(dataUrl)) {
    return "Attachments must be an image (screenshot, photo of a receipt, etc.)";
  }
  if (estimateBase64Bytes(dataUrl) > MAX_ATTACHMENT_BYTES) {
    return "Attachment is too large — 5MB max";
  }
  return null;
}
