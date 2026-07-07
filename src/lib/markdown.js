import { marked } from "marked";
import DOMPurify from "dompurify";
// The common-languages build (~40 langs) — the full build is ~1 MB, which
// matters for an app distributed through Swarm.
import hljs from "highlight.js/lib/common";

marked.setOptions({ gfm: true, breaks: false });

/** Render untrusted markdown to sanitized HTML with code highlighting. */
export function renderMarkdown(src) {
  if (!src) return "";
  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    let html;
    if (lang && hljs.getLanguage(lang)) {
      html = hljs.highlight(text, { language: lang }).value;
    } else {
      html = escapeHtml(text);
    }
    return `<pre><code class="hljs">${html}</code></pre>`;
  };
  const raw = marked.parse(src, { renderer });
  return DOMPurify.sanitize(raw);
}

/** Highlight a whole file; picks the language from the filename. */
export function highlightFile(content, filename) {
  const ext = (filename ?? "").split(".").pop()?.toLowerCase();
  const lang = hljs.getLanguage(ext) ? ext : null;
  try {
    if (lang) return hljs.highlight(content, { language: lang }).value;
    return escapeHtml(content);
  } catch {
    return escapeHtml(content);
  }
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
