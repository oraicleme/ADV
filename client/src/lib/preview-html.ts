/**
 * STORY-128: Preview follows canvas — which HTML to show in the preview pane.
 * When multi-page: preview = HTML for current page. When single-page: preview = livePreviewHtml (or generatedHtml).
 *
 * Internal: used only by AgentChat (and unit tests). Not part of the public API — do not import from other modules.
 */

export function getPreviewHtmlToShow(
  generatedHtml: string | null,
  livePreviewHtml: string,
  htmlPerPage: string[] | undefined,
  currentPageIndex: number
): string {
  if (htmlPerPage && htmlPerPage.length > 1) {
    return generatedHtml ?? htmlPerPage[currentPageIndex] ?? livePreviewHtml;
  }
  return generatedHtml ?? livePreviewHtml;
}
