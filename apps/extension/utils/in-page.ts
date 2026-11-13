// Optional "traduire dans la page" mode: rewrites the page's own *labels*
// in the chosen language, in place, the way the SAFINUM protocol expects
// ("L'extension doit analyser et traduire la page telle qu'elle est").
//
// Guarantees:
// - Only whole text nodes that matched a glossary term, a template phrase
//   or a verified IA line are rewritten — never an amount, number, name,
//   reference or anything the user typed.
// - Every protected value of the original must survive verbatim in the
//   rewritten text, or the node is left untouched (F10).
// - The page's own wording is remembered per node: everything Edima reads
//   (recap, alerts, form captions, D4) keeps reading the French original
//   through pageText(), and turning the mode off restores it exactly.
// - If the page itself changes a node we rewrote (Vue recomputing a total),
//   the page wins: the new value becomes the original again.

import { extractProtectedValues, verifyValuesIntact } from 'edima-shared';

const originals = new WeakMap<Text, string>();
const written = new WeakMap<Text, string>();
const tracked = new Set<Text>();

/** True when this node currently shows a value Edima wrote. */
export function isEdimaWrite(node: Node): boolean {
  return node instanceof Text && written.has(node) && written.get(node) === node.nodeValue;
}

/** The page's own text for a text node, even after Edima rewrote it. */
export function pageText(node: Text): string {
  if (written.has(node)) {
    if (written.get(node) === node.nodeValue) return originals.get(node) ?? node.nodeValue ?? '';
    // The page changed it since: its new value is the original now.
    forget(node);
  }
  return node.nodeValue ?? '';
}

/** textContent of an element, as the page wrote it (see pageText). */
export function elementPageText(el: Element | null | undefined): string {
  if (!el) return '';
  let out = '';
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out += pageText(n as Text);
  return out;
}

function forget(node: Text) {
  originals.delete(node);
  written.delete(node);
  tracked.delete(node);
}

const EDITABLE = 'input, textarea, select, option, [contenteditable], [contenteditable="true"]';

export interface InPageCandidate {
  node: Text;
  /** Trimmed page text of the node. */
  original: string;
  translated: string;
}

/** Rewrites each candidate node; returns how many nodes now show a translation. */
export function applyInPage(candidates: InPageCandidate[], userValues: Set<string>): number {
  let count = 0;
  for (const { node, original, translated } of candidates) {
    if (!node.isConnected || !translated || translated === original) continue;
    if (node.parentElement?.closest(EDITABLE)) continue;
    if (userValues.has(original.toLowerCase())) continue; // echo of what the user typed

    const { values } = extractProtectedValues(original);
    if (!verifyValuesIntact(translated, values)) continue;

    const full = pageText(node);
    const next = full.replace(original, translated);
    if (node.nodeValue !== next) {
      if (!written.has(node)) originals.set(node, full);
      written.set(node, next);
      tracked.add(node);
      node.nodeValue = next;
    }
    count++;
  }
  return count;
}

/** Puts back the page's own text on every node Edima rewrote. */
export function restoreAll(): void {
  for (const node of [...tracked]) {
    if (node.isConnected && written.get(node) === node.nodeValue) node.nodeValue = originals.get(node) ?? node.nodeValue;
    forget(node);
  }
}

/** Nodes rewritten but no longer wanted (e.g. after a language switch with no translation). */
export function restoreExcept(keep: Set<Text>): void {
  for (const node of [...tracked]) {
    if (keep.has(node)) continue;
    if (node.isConnected && written.get(node) === node.nodeValue) node.nodeValue = originals.get(node) ?? node.nodeValue;
    forget(node);
  }
}
