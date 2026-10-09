/**
 * Which day should the single fixed chat day chip show?
 * Geometry is viewport-relative, so this works even when a very tall
 * message begins above the scroller but is still visible. Ignore separators.
 */
export type ChatVisibleMessage = {
  timestamp: string;
  top: number;
  bottom: number;
};
export function firstVisibleChatTimestamp(
  messages: readonly ChatVisibleMessage[],
  viewportTop: number,
  viewportBottom: number,
): string | null {
  if (!Number.isFinite(viewportTop) || !Number.isFinite(viewportBottom) ||
      viewportBottom <= viewportTop) return null;
  for (const message of messages) {
    if (!message.timestamp || !Number.isFinite(message.top) ||
        !Number.isFinite(message.bottom)) continue;
    if (message.bottom > viewportTop + 1 && message.top < viewportBottom) {
      return message.timestamp;
    }
  }
  return null;
}
