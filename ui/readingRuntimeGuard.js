/* Runtime guard for the desktop Reading screen.
 * The current desktop renderer expects this global set when no deferred list is supplied.
 * Keep it empty: all currently published Reading items remain available.
 */
globalThis.DEFERRED_READING_ARTICLE_IDS ??= new Set();
