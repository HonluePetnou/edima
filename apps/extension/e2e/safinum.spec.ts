// F-10: the jury's own test page, walked end to end exactly like a real
// demo — solde → frais → bénéficiaire → récapitulatif → confirmation —
// with Edima's reported state checked at each step.
//
// State is read through the background service worker's own
// `chrome.tabs.sendMessage(tab.id, {type:'edima:request-state'})` call —
// the exact message the side panel sends — rather than by opening
// sidepanel.html as a page. A side panel isn't a tab: opening it as one for
// the test would itself become the "active tab" and break the very
// `chrome.tabs.query({active:true})` lookup Edima and this test both rely on.
import type { BrowserContext } from '@playwright/test';
import { expect, test } from './fixtures';
import type { PageTranslatedMessage } from '../utils/messages';

const SAFINUM_URL = 'https://safinum.cm/hackathon-test';

async function requestState(context: BrowserContext) {
  const background = context.serviceWorkers()[0];
  if (!background) throw new Error('Extension service worker not found — is the extension loaded?');
  return background.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return null;
    return (await chrome.tabs.sendMessage(tab.id, { type: 'edima:request-state' })) as unknown;
  }) as Promise<PageTranslatedMessage | null>;
}

test('full SAFINUM transfer flow is read correctly end to end', async ({ context, page }) => {
  await page.goto(SAFINUM_URL);

  // Floating mascot renders inside a Shadow DOM on the page itself —
  // Playwright's locator engine pierces it like any other element.
  await expect(page.locator('.edima-fab-btn')).toBeVisible({ timeout: 15_000 });

  // ---- Étape 1: Solde ----
  let state = await requestState(context);
  expect(state?.recap).toBeNull();
  // \s matches the narrow no-break space (U+202F) the page uses as its
  // thousands separator — Edima must preserve it exactly (F10), not just a
  // plain space, so the match has to tolerate it rather than assume U+0020.
  const soldeLine = state?.lines.find((l) => /250\s*000\s*FCFA/.test(l.original));
  expect(soldeLine, 'le solde affiché doit être repéré sur la page').toBeTruthy();

  // ---- Étape 2: Frais ----
  await page.getByRole('button', { name: 'Effectuer un transfert' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // ---- Étape 3: Bénéficiaire ----
  await expect(page.getByText('jamais été utilisé')).toBeVisible();
  // Edima's own MutationObserver debounces 150ms (dom-reader.ts) before it
  // re-scans — the text can be on the page slightly before Edima has
  // caught up, so poll rather than read state exactly once.
  await expect
    .poll(async () => {
      state = await requestState(context);
      return state?.warnings.some((w) => w.includes('jamais')) ?? false;
    }, { message: 'F7: le bénéficiaire jamais utilisé doit remonter comme avertissement' })
    .toBe(true);

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // ---- Étape 4: Récapitulatif ----
  // Not getByText('Récapitulatif') alone: the step-progress breadcrumb
  // carries that same word on every step, not just this one.
  await expect(page.getByText('Vérifiez les informations avant de confirmer')).toBeVisible();
  await expect
    .poll(async () => {
      state = await requestState(context);
      return state?.step?.id;
    }, { message: "Edima doit classer cet écran comme l'étape récapitulatif" })
    .toBe('recapitulatif');
  expect(state?.recap?.montant ?? '').toMatch(/25\s*000/);
  expect(state?.recap?.frais).toBeTruthy();
  expect(state?.recap?.total ?? '').toMatch(/25\s*000/);
  expect(state?.recap?.beneficiaire).toContain('Jean-Paul Mbarga');
  // D4/F-3: nothing was typed on a formulaire amount field on this run, and
  // montant + frais = total here, so there must be no false mismatch alert.
  expect(state?.consistency?.status).not.toBe('mismatch');

  // ---- Étape 5: Confirmation ----
  await page.getByRole('checkbox', { name: /informations ci-dessus sont correctes/ }).check();
  await page.getByRole('button', { name: 'Confirmer le transfert' }).click();
  await expect(page.getByText('Transfert effectué')).toBeVisible();
});
