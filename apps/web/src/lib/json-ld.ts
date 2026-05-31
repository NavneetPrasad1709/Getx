/* APPSEC-005 — safe JSON-LD serialization for inline <script> injection.
 *
 * A raw JSON.stringify() inside `<script type="application/ld+json">` is XSS
 * when the payload carries user-controlled data (listing titles, seller
 * names): a value containing `</script>` (or a lone `<`) breaks out of the
 * script context. Escaping `<` `>` `&` to their JSON `\uXXXX` forms keeps the
 * payload valid JSON-LD while making it impossible to terminate the tag — you
 * cannot form `</script>` without a `<`.
 *
 * NOTE the replacements use REAL backslash escape sequences (`\\u003c`), not
 * the literal characters — an earlier inline attempt replaced `<` with the
 * character `<` again, so it escaped nothing.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
