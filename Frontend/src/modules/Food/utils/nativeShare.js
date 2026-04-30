/**
 * nativeShare.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Robust share utility for web + Flutter WebView.
 *
 * Priority:
 *  1. navigator.share  — triggers the OS native share sheet
 *     (Android, iOS, Flutter WebView via JavascriptChannel or platform plugin)
 *  2. navigator.clipboard.writeText — clipboard fallback (desktop browsers)
 *  3. document.execCommand('copy') — legacy clipboard fallback
 *
 * Returns: 'shared' | 'copied' | 'failed'
 */

/**
 * @param {{ title?: string, text?: string, url?: string }} payload
 * @returns {Promise<'shared' | 'copied' | 'failed'>}
 */
export async function nativeShare(payload) {
  const { title = '', text = '', url = '' } = payload;

  // ── 1. Web Share API (native sheet on mobile / Flutter WebView) ──────────
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared'; // User completed or dismissed — either way the sheet opened
    } catch (err) {
      // AbortError = user dismissed the sheet (not an error)
      if (err?.name === 'AbortError') return 'shared';
      // Any other error: fall through to clipboard
    }
  }

  // ── 2. Clipboard API ─────────────────────────────────────────────────────
  const shareString = [text, url].filter(Boolean).join('\n');

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareString);
      return 'copied';
    } catch {
      // Fall through
    }
  }

  // ── 3. Legacy execCommand fallback ───────────────────────────────────────
  try {
    const ta = document.createElement('textarea');
    ta.value = shareString;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return 'copied';
  } catch {
    // nothing
  }

  return 'failed';
}
