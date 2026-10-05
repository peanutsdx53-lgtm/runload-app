import { renderReadingContent } from "../readingScreen.js";
export function renderReadingScreen(args) {
  return renderReadingContent({ ...args, deferredArticleIds: new Set() });
}
