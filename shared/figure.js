// Scope-aware figure copy. The aggregate figure must never present one
// creator's totals under the global caption: pass the already-formatted model
// count and the HTML-escaped username, and get back copy that names its scope.
export function getFigureLabels({ isUser, username, formattedModelCount }) {
  if (isUser && username) {
    const tag = `@${username}`;
    return {
      captionLeft: `${tag}'s indexed downloads`,
      captionRight: `creator view`,
      plateFoot: `Across ${tag}'s ${formattedModelCount} indexed models`,
    };
  }
  return {
    captionLeft: "All-time downloads · tag-plus-name index",
    captionRight: `global index`,
    plateFoot: "Combined downloads across all indexed models",
  };
}
