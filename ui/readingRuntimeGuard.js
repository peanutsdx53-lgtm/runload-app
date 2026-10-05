/* Runtime guard for the Reading screen.
 * The current renderer expects this global set when no deferred list is supplied.
 * Keep it empty: all currently published Reading items remain available.
 */
globalThis.DEFERRED_READING_ARTICLE_IDS ??= new Set();
