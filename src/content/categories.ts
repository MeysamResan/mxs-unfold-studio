import type { CatalogCategory, ShowcaseDefinition } from '../core/catalog/types';

/** Empty subcategories are visible so the collection can grow without changing navigation. */
const categoryOrder: readonly CatalogCategory[] = [
  {
    label: 'Firearms',
    subcategories: [
      'Sidearms',
      'Rifles',
      'Assault rifles',
      'Battle rifles',
      'Shotguns',
      'Submachine guns',
      'Machine guns',
    ],
  },
];

/** Include new content categories automatically; use categoryOrder to curate their order. */
export function getCatalogCategories(items: readonly ShowcaseDefinition[]): CatalogCategory[] {
  const groups = new Map(categoryOrder.map((group) => [group.label, new Set(group.subcategories)]));
  for (const item of items) {
    const subcategories = groups.get(item.category) ?? new Set<string>();
    if (item.subcategory) subcategories.add(item.subcategory);
    groups.set(item.category, subcategories);
  }
  return Array.from(groups, ([label, subcategories]) => ({
    label,
    subcategories: [...subcategories],
  }));
}
