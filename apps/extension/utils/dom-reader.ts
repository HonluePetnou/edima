// Generic page reading (F11): no site-specific selectors. Walks visible text
// nodes only — skips <script>/<style>/<noscript> and anything hidden, so the
// same code works on the jury's unknown page and on the sites tested in F11.

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

function isVisible(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export interface VisibleTextNode {
  node: Text;
  text: string;
}

/** Collects every visible, non-empty text node under `root`. */
export function extractVisibleText(root: ParentNode = document.body): VisibleTextNode[] {
  const results: VisibleTextNode[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent?.trim();
      if (!text) return NodeFilter.FILTER_REJECT;

      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!isVisible(parent)) return NodeFilter.FILTER_REJECT;

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    results.push({ node: current as Text, text: current.textContent!.trim() });
    current = walker.nextNode();
  }
  return results;
}

export type NewContentCallback = (addedText: VisibleTextNode[]) => void;

/**
 * F8: watches for text that appears after the initial page load (pop-ups,
 * toasts, injected alerts) and reports it within the function's own debounce
 * window — callers must still hit the <3s budget end-to-end once translation
 * and voice are wired in.
 */
export function observeNewContent(callback: NewContentCallback, root: Node = document.body): () => void {
  let pending: Set<Node> = new Set();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    const addedNodes = [...pending];
    pending = new Set();
    timer = undefined;

    const found: VisibleTextNode[] = [];
    for (const node of addedNodes) {
      // A bare text node (added, or edited in place by a framework like Vue
      // when a total is recomputed) is read through its parent element.
      const target = node instanceof Text ? node.parentElement : node;
      if (!(target instanceof Element) && !(target instanceof Document)) continue;
      found.push(...extractVisibleText(target as ParentNode));
    }
    if (found.length > 0) callback(found);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        pending.add(mutation.target);
        continue;
      }
      for (const node of mutation.addedNodes) {
        pending.add(node);
      }
    }
    if (pending.size === 0) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  });

  // characterData: values that change in place (a recomputed fee or total,
  // an amount altered after load) must be re-read, not only new elements.
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
