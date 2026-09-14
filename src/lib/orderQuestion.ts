import type { IQuestionOption, OptionId } from '../types';

export const OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D'];

// Returns option texts in the host-defined correct sequence (first → last)
export function getItemsInCorrectOrder(q: { options?: IQuestionOption[]; correctOrder?: OptionId[] }): string[] {
  const options = q.options || [];
  const order = q.correctOrder && q.correctOrder.length === options.length ? q.correctOrder : options.map((o) => o.id);
  return order.map((id) => options.find((o) => o.id === id)?.text || '');
}

// Places the correctly ordered items behind shuffled letters, so players see a jumbled A-D list.
// correctOrder lists which letter belongs in position 1, 2, 3, 4.
export function buildShuffledOrderQuestion(items: string[]): { options: IQuestionOption[]; correctOrder: OptionId[] } {
  const letters = OPTION_IDS.slice(0, items.length);
  const perm = items.map((_, i) => i);

  // Re-shuffle if the jumble happens to already be the correct order
  do {
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
  } while (perm.length > 1 && perm.every((v, i) => v === i));

  const options = letters.map((id, slot) => ({ id, text: items[perm[slot]] }));
  const correctOrder = items.map((_, position) => letters[perm.indexOf(position)]);
  return { options, correctOrder };
}

export function isSameOrder(a?: string[] | null, b?: string[] | null): boolean {
  return !!a && !!b && a.length > 0 && a.length === b.length && a.every((v, i) => v === b[i]);
}

export function formatOrder(order?: string[] | null): string {
  return order && order.length ? order.join(' → ') : '—';
}
