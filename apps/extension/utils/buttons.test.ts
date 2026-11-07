import { beforeEach, describe, expect, it } from 'vitest';
import { describeElement, findInteractiveElements } from './buttons';

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 40, top: 0, left: 0, right: 100, bottom: 40, x: 0, y: 0, toJSON() {} };
  };
  document.body.innerHTML = '';
});

describe('findInteractiveElements', () => {
  it('finds buttons, links and submit inputs, nothing else', () => {
    document.body.innerHTML = `
      <button>Retirer</button>
      <a href="/aide">Aide</a>
      <input type="submit" value="Confirmer" />
      <span>Pas interactif</span>
    `;
    const labels = findInteractiveElements().map((el) => el.tagName);
    expect(labels).toEqual(['BUTTON', 'A', 'INPUT']);
  });
});

describe('describeElement', () => {
  it('uses the known action for a glossary button label', () => {
    document.body.innerHTML = `<button>Envoyer de l'argent</button>`;
    const button = document.querySelector('button')!;
    const described = describeElement(button);
    expect(described?.label).toBe("Envoyer de l'argent");
    expect(described?.description).toContain("envoyer de l'argent à quelqu'un");
  });

  it('falls back to a generic description for an unknown label', () => {
    document.body.innerHTML = `<button>Partager par e-mail</button>`;
    const button = document.querySelector('button')!;
    const described = describeElement(button);
    expect(described?.description).toContain('Partager par e-mail');
  });

  it('returns null for an element with no usable label', () => {
    document.body.innerHTML = `<button><svg></svg></button>`;
    const button = document.querySelector('button')!;
    expect(describeElement(button)).toBeNull();
  });
});
