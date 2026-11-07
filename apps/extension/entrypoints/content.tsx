import { render } from 'preact';
import { extractVisibleText, observeNewContent } from '../utils/dom-reader';
import EdimaBadge from '../components/EdimaBadge';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // Safety rule from the cahier des charges: by default the page's own DOM is
    // never written to. Every bit of Edima UI lives inside one Shadow DOM host,
    // isolated from the host page's styles and scripts.
    const ui = await createShadowRootUi(ctx, {
      name: 'edima-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        render(<EdimaBadge />, container);
      },
      onRemove(container) {
        if (container) render(null, container);
      },
    });
    ui.mount();

    const initialText = extractVisibleText();
    console.debug(`[Edima] ${initialText.length} visible text node(s) on load`);

    observeNewContent((added) => {
      console.debug(`[Edima] ${added.length} new text node(s) detected`, added.map((t) => t.text));
    });
  },
});
