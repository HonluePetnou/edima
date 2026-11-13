import { beforeEach, describe, expect, it } from 'vitest';
import { extractVisibleText, observeNewContent } from './dom-reader';

// jsdom never computes real layout — every element reports a 0x0 rect by
// default. Stub a plausible size so the visibility check in dom-reader.ts
// can do its job; this suite cares about *which* text qualifies, not pixels.
beforeEach(() => {
  Element.prototype.getBoundingClientRect = function () {
    const display = getComputedStyle(this).display;
    const size = display === 'none' ? 0 : 100;
    return { width: size, height: size, top: 0, left: 0, right: size, bottom: size, x: 0, y: 0, toJSON() {} };
  };
  document.body.innerHTML = '';
});

describe('extractVisibleText', () => {
  it('reads the text of a BanqueDémo-style balance card', () => {
    document.body.innerHTML = `
      <div>
        <p>Solde disponible</p>
        <p>245 500 FCFA</p>
        <p>Compte n° •••• 4821</p>
      </div>
    `;
    const found = extractVisibleText().map((n) => n.text);
    expect(found).toEqual(['Solde disponible', '245 500 FCFA', 'Compte n° •••• 4821']);
  });

  it('skips script, style and empty text nodes', () => {
    document.body.innerHTML = `
      <script>console.log('should not appear')</script>
      <style>.a { color: red }</style>
      <p>   </p>
      <p>Retirer</p>
    `;
    const found = extractVisibleText().map((n) => n.text);
    expect(found).toEqual(['Retirer']);
  });

  it('skips text hidden with display: none', () => {
    document.body.innerHTML = `
      <p style="display: none">Caché</p>
      <p>Visible</p>
    `;
    const found = extractVisibleText().map((n) => n.text);
    expect(found).toEqual(['Visible']);
  });
});

describe('observeNewContent', () => {
  it('reports text added after the initial scan', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.getElementById('root')!;

    const seen: string[][] = [];
    const stop = observeNewContent((added) => seen.push(added.map((n) => n.text)));

    const alert = document.createElement('p');
    alert.textContent = 'Ne communiquez jamais votre code secret';
    root.appendChild(alert);

    await new Promise((resolve) => setTimeout(resolve, 200));
    stop();

    expect(seen).toEqual([['Ne communiquez jamais votre code secret']]);
  });

  // Frameworks (Vue on the SAFINUM page) update a value by editing the
  // existing text node, or replacing it with a bare text node.
  it('reports a value edited in place', async () => {
    document.body.innerHTML = '<p id="amount">15 000 FCFA</p>';
    const seen: string[][] = [];
    const stop = observeNewContent((added) => seen.push(added.map((n) => n.text)));

    document.getElementById('amount')!.firstChild!.nodeValue = '150 000 FCFA';
    await new Promise((resolve) => setTimeout(resolve, 200));
    document.getElementById('amount')!.textContent = '1 500 FCFA';
    await new Promise((resolve) => setTimeout(resolve, 200));
    stop();

    expect(seen).toEqual([['150 000 FCFA'], ['1 500 FCFA']]);
  });
});
