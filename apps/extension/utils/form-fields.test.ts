import { beforeEach, describe, expect, it } from 'vitest';
import { findFormFields } from './form-fields';

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40, x: 0, y: 0, toJSON() {} };
  };
  document.body.innerHTML = '';
});

describe('findFormFields', () => {
  it('reads a field label from its <label for>', () => {
    document.body.innerHTML = `
      <label for="ben">Bénéficiaire</label>
      <input id="ben" type="text" />
    `;
    const [field] = findFormFields();
    expect(field?.label).toBe('Bénéficiaire');
    expect(field?.description).toContain('recevoir');
  });

  it('reads a field label from a wrapping <label>', () => {
    document.body.innerHTML = `
      <label>Montant à envoyer <input type="number" /></label>
    `;
    const [field] = findFormFields();
    expect(field?.label).toBe('Montant à envoyer');
    expect(field?.description).toContain('Combien tu envoies');
  });

  it('falls back to the placeholder, then a generic description', () => {
    document.body.innerHTML = `<input type="text" placeholder="Pour l'anniversaire de Paul" />`;
    const [field] = findFormFields();
    expect(field?.label).toBe("Pour l'anniversaire de Paul");
    expect(field?.description).toContain('Un champ à remplir');
  });

  it('skips hidden and submit/button inputs', () => {
    document.body.innerHTML = `
      <input type="hidden" value="x" />
      <input type="submit" value="Envoyer" />
      <label for="m">Message</label>
      <input id="m" type="text" />
    `;
    const fields = findFormFields();
    expect(fields).toHaveLength(1);
    expect(fields[0]?.label).toBe('Message');
  });

  it('skips fields with no usable label at all', () => {
    document.body.innerHTML = `<input type="text" />`;
    expect(findFormFields()).toHaveLength(0);
  });

  // SAFINUM test page: captions are plain <p> elements above the field,
  // uppercased with CSS — no <label>, id, name or placeholder.
  it('reads the caption shown just above a field', () => {
    document.body.innerHTML = `
      <div>
        <p style="text-transform: uppercase">Montant à envoyer</p>
        <div><input type="number" /><span>FCFA</span></div>
      </div>
      <div>
        <p>Nom du bénéficiaire</p>
        <input type="text" />
      </div>`;
    const fields = findFormFields();
    expect(fields.map((f) => f.label)).toEqual(['Montant à envoyer', 'Nom du bénéficiaire']);
    expect(fields[1]?.description).toContain('recevoir');
  });

  it('ignores a long paragraph above a field', () => {
    document.body.innerHTML = `
      <p>Renseignez les informations du destinataire. Vérifiez toujours le numéro avant de valider le transfert.</p>
      <input type="text" />`;
    expect(findFormFields()).toHaveLength(0);
  });
});
