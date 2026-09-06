import type { ShowcaseDefinition } from '../core/catalog/types';
import { lightning } from './lightning';

/** Register content here. The viewer has no knowledge of individual subjects. */
export const catalog: readonly ShowcaseDefinition[] = [lightning];

export function findShowcase(id: string): ShowcaseDefinition | undefined {
  return catalog.find((entry) => entry.id === id);
}
