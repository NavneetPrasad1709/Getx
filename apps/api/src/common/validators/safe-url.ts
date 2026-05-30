import { z } from 'zod';

const HTTP_SCHEME = /^https?:\/\//i;
// Allow only base64-encoded image data URLs with a known mime. Mirrors the
// dev fallback in apps/api/src/uploads (P10) which inlines uploads as
// data:image/<mime>;base64,... when R2 isn't configured. Crucially this
// REJECTS data:text/html,... and other XSS-friendly payloads.
// RES-HIGH-003: SVG removed — SVG <script> tags would be stored XSS on any
// page that renders the URL via an <img> or dangerously-set innerHTML
const IMAGE_DATA_URL =
  /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/**
 * Strict http(s)-only URL. Use for any user-provided URL that doesn't need
 * to round-trip through the dev image fallback. Rejects javascript:, data:,
 * vbscript:, file:, blob:, etc.
 */
export const safeHttpUrl = () =>
  z
    .string()
    .url('Must be a valid URL')
    .refine((u) => HTTP_SCHEME.test(u), 'URL must use http:// or https://');

/**
 * http(s) URL OR base64-encoded image data URL. Use for fields populated by
 * the upload service (chat attachments, request images, order delivery
 * proof) so the dev base64 fallback keeps working without re-opening the
 * XSS surface that javascript:/data:text/html would create.
 */
export const safeImageUrl = () =>
  z
    .string()
    .min(1)
    .refine(
      (u) => HTTP_SCHEME.test(u) || IMAGE_DATA_URL.test(u),
      'URL must be http(s) or a base64-encoded image data URL',
    );
