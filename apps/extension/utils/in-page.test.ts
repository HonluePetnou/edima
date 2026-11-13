import { beforeEach, describe, expect, it } from 'vitest';
import { applyInPage, elementPageText, isEdimaWrite, pageText, restoreAll } from './in-page';

function textNodeOf(id: string): Text {
  return document.getElementById(id)!.firstChild as Text;
}

beforeEach(() => {
  restoreAll();
  document.body.innerHTML = `
    <p id="label">  Bénéficiaire </p>
    <p id="amount">15 000 FCFA</p>
    <p id="sentence">Tu vas envoyer 5 000 FCFA à Paul Mballa.</p>
    <input id="field" value="Loyer" />
    <p id="echo">Loyer</p>`;
});

describe('applyInPage', () => {
  it('rewrites a label, keeps its whitespace, and remembers the original', () => {
    const node = textNodeOf('label');
    expect(applyInPage([{ node, original: 'Bénéficiaire', translated: 'mukousédi' }], new Set())).toBe(1);
    expect(node.nodeValue).toBe('  mukousédi ');
    expect(pageText(node)).toBe('  Bénéficiaire ');
    expect(isEdimaWrite(node)).toBe(true);
    expect(elementPageText(document.getElementById('label'))).toBe('  Bénéficiaire ');
  });

  it('refuses a translation that drops or changes a protected value', () => {
    const node = textNodeOf('sentence');
    const original = node.nodeValue!;
    applyInPage([{ node, original, translated: 'wa loma 50 000 FCFA na Paul Mballa.' }], new Set());
    expect(node.nodeValue).toBe(original);
  });

  it('keeps every value when the translation preserves them', () => {
    const node = textNodeOf('sentence');
    applyInPage([{ node, original: node.nodeValue!, translated: 'wa loma 5 000 FCFA na Paul Mballa.' }], new Set());
    expect(node.nodeValue).toBe('wa loma 5 000 FCFA na Paul Mballa.');
  });

  it('never rewrites an echo of what the user typed', () => {
    const node = textNodeOf('echo');
    applyInPage([{ node, original: 'Loyer', translated: 'something' }], new Set(['loyer']));
    expect(node.nodeValue).toBe('Loyer');
  });

  it('restores the page exactly when the mode is turned off', () => {
    const node = textNodeOf('label');
    applyInPage([{ node, original: 'Bénéficiaire', translated: 'mukousédi' }], new Set());
    restoreAll();
    expect(node.nodeValue).toBe('  Bénéficiaire ');
    expect(isEdimaWrite(node)).toBe(false);
  });

  it('lets the page win when it changes a node Edima rewrote', () => {
    const node = textNodeOf('label');
    applyInPage([{ node, original: 'Bénéficiaire', translated: 'mukousédi' }], new Set());
    node.nodeValue = 'Destinataire'; // the page's framework updates the text
    expect(pageText(node)).toBe('Destinataire');
    expect(isEdimaWrite(node)).toBe(false);
  });
});
