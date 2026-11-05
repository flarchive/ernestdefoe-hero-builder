const TAGS = ['p', 'br', 'strong', 'em', 'a'];
const DROP = ['script', 'style', 'template', 'noscript', 'iframe', 'object', 'textarea', 'title', 'svg', 'math'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The http(s) URL, or null — mirrors SubtitleHtml::href(). */
function href(v: string): string | null {
  v = v.replace(/[\x00-\x1F\x7F]+/g, '').trim();
  return /^https?:\/\/[^/?#]/i.test(v) ? v : null;
}

function walk(node: Node): string {
  let out = '';
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      out += esc(n.nodeValue || '');
      return;
    }
    if (n.nodeType !== 1) return;
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP.includes(tag)) return;
    if (!TAGS.includes(tag)) {
      out += walk(el);
      return;
    }
    if (tag === 'br') {
      out += '<br>';
      return;
    }
    let open = tag;
    if (tag === 'a') {
      const h = href(el.getAttribute('href') || '');
      if (h === null) {
        out += walk(el);
        return;
      }
      open += ` href="${esc(h)}" rel="nofollow noopener"`;
    }
    out += `<${open}>${walk(el)}</${tag}>`;
  });
  return out;
}

/**
 * The Hero Studio preview's copy of the server's SubtitleHtml cleaner (same
 * allow-list), so the preview shows what the forum will. DOMParser builds an
 * inert document: nothing in it runs or loads.
 */
export default function cleanSubtitle(html: string): string {
  // NUL bytes are dropped first, as on the server.
  return walk(new DOMParser().parseFromString(html.replace(/\0/g, ''), 'text/html').body).trim();
}
