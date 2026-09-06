import { ArrowUpRight } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import { ObjectThumbnail } from './ObjectThumbnail';

const normalizeSearch = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

function CollectionView({
  items,
  activeId,
  onOpen,
  query,
  id,
}: {
  items: readonly ShowcaseDefinition[];
  activeId: string;
  onOpen: (id: string) => void;
  query: string;
  id: string;
}) {
  const searchIndex = useMemo(
    () =>
      items.map((item) => ({
        item,
        text: normalizeSearch(
          [
            item.title,
            item.subtitle,
            item.category,
            item.subcategory,
            item.description,
            item.credits.author,
            ...item.parts.map((part) => part.label),
            item.wikipedia?.title,
          ]
            .filter(Boolean)
            .join(' '),
        ),
      })),
    [items],
  );
  const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const results = searchIndex
    .filter(({ text }) => words.every((word) => text.includes(word)))
    .map(({ item }) => item);

  return (
    <div className="collection" id={id}>
      <p className="collection-result-count" role="status" aria-live="polite" aria-atomic="true">
        {results.length} {results.length === 1 ? 'object' : 'objects'}
        {words.length > 0 ? ' found' : ' in the collection'}
      </p>
      <div className="collection-list">
        {results.map((item) => (
          <button
            className="collection-card"
            key={item.id}
            onClick={() => onOpen(item.id)}
            aria-label={item.title}
            aria-current={item.id === activeId ? 'true' : undefined}
          >
            <ObjectThumbnail item={item} />
            <span className="collection-card-details">
              <span className="collection-card-copy">
                <span className="eyebrow">{item.subcategory ?? item.category}</span>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
              </span>
              {item.id === activeId ? (
                <span className="catalog-current-dot" aria-label="Currently open" />
              ) : (
                <ArrowUpRight size={18} aria-hidden="true" />
              )}
            </span>
          </button>
        ))}
      </div>
      {results.length === 0 && (
        <p className="empty-message">No objects match “{query.trim()}”. Try another search.</p>
      )}
    </div>
  );
}

export const Collection = memo(CollectionView);
