export type XPathErrorCode =
  | "DOM_NOT_LOADED"
  | "ELEMENT_NOT_FOUND"
  | "AI_TIMEOUT"
  | "INVALID_APP_SOURCE"
  | "UNSUPPORTED_FORMAT"
  | "WORKSPACE_DATA_MISSING"
  | "AI_PROVIDER_ERROR";

export const XPATH_ERROR_MESSAGES: Record<XPathErrorCode, string> = {
  DOM_NOT_LOADED:
    "❌ **DOM Not Loaded** — No DOM snapshot is available for the selected environment & platform. Open the workspace **Environments** tab and paste a DOM snapshot, or upload a build to extract one.",
  ELEMENT_NOT_FOUND:
    "🔍 **Element Not Found** — No elements in the loaded DOM matched your description. Try a different keyword, check the screen name, or open the DOM Intelligence panel to inspect available elements.",
  AI_TIMEOUT:
    "⏱️ **AI Timeout** — The AI provider took too long to respond. Try a narrower query or check your AI Configuration for rate-limit issues.",
  INVALID_APP_SOURCE:
    "⚠️ **Invalid App Source** — The DOM/app source could not be parsed. Make sure the snapshot is well-formed Appium XML or HTML.",
  UNSUPPORTED_FORMAT:
    "🧩 **Unsupported File Format** — The provided app source is not in a format the analyzer can process (Appium XML, HTML, or compatible UI dumps only).",
  WORKSPACE_DATA_MISSING:
    "📁 **Workspace Data Missing** — This workspace has no DOM snapshots or build files. Upload them in the workspace **Environments** tab to enable XPath generation.",
  AI_PROVIDER_ERROR:
    "🤖 **AI Provider Error** — The configured AI provider returned an error. Verify your AI Configuration (endpoint, model, key) and try again.",
};

export function getXPathErrorMessage(code: string): string {
  return XPATH_ERROR_MESSAGES[code as XPathErrorCode] || XPATH_ERROR_MESSAGES.AI_PROVIDER_ERROR;
}
