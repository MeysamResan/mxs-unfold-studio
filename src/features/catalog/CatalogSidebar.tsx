import { ChevronRight, FolderOpen, Search, X } from 'lucide-react';
import { memo, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ObjectThumbnail } from './ObjectThumbnail';
import { Collection } from './Collection';
import { ScrollArea } from '../../shared/ScrollArea';
import type { CatalogCategory, ShowcaseDefinition } from '../../core/catalog/types';

function CategoryReveal({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    let active = true;
    const animations = ref.current?.getAnimations() ?? [];
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (active) setPresent(false);
    });
    return () => {
      active = false;
    };
  }, [open]);
  return (
    <div
      ref={ref}
      id={id}
      className={`category-reveal ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="category-reveal-clip">{(open || present) && children}</div>
    </div>
  );
}

function CatalogSidebarView({
  items,
  categories,
  activeId,
  onOpen,
  embedded = false,
}: {
  items: readonly ShowcaseDefinition[];
  categories: readonly CatalogCategory[];
  activeId: string;
  onOpen: (id: string) => void;
  embedded?: boolean;
}) {
  const active = items.find((item) => item.id === activeId);
  const [openCategory, setOpenCategory] = useState(active?.category ?? categories[0]?.label ?? '');
  const [openSubcategory, setOpenSubcategory] = useState(active?.subcategory ?? '');
  const prefix = useId();
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const resultsId = `${prefix}-search-results`;
  const clearSearch = () => {
    setQuery('');
    searchInput.current?.focus();
  };

  const objectButton = (item: ShowcaseDefinition) => (
    <button
      key={item.id}
      className={`catalog-object ${item.id === activeId ? 'is-current' : ''}`}
      aria-current={item.id === activeId ? 'true' : undefined}
      aria-label={item.title}
      onClick={() => onOpen(item.id)}
    >
      <ObjectThumbnail item={item} />
      <span className="catalog-object-caption">
        <span>{item.title}</span>
        {item.id === activeId && <span className="catalog-current-dot" aria-hidden="true" />}
      </span>
    </button>
  );

  const contents = (
    <>
      {query.trim() ? (
        <Collection
          items={items}
          activeId={activeId}
          onOpen={onOpen}
          query={query}
          id={resultsId}
        />
      ) : (
        <nav className="category-tree" aria-label="Object categories">
          {categories.map((category, categoryIndex) => {
            const categoryItems = items.filter((item) => item.category === category.label);
            const isOpen = openCategory === category.label;
            const categoryId = `${prefix}-category-${categoryIndex}`;
            return (
              <div className="category-group" key={category.label}>
                <button
                  className="category-parent"
                  aria-expanded={isOpen}
                  aria-controls={categoryId}
                  onClick={() => setOpenCategory(isOpen ? '' : category.label)}
                >
                  <FolderOpen size={16} />
                  <span>{category.label}</span>
                  <small aria-hidden="true">{categoryItems.length}</small>
                  <ChevronRight size={14} className="category-chevron" />
                </button>
                <CategoryReveal id={categoryId} open={isOpen}>
                  <div className="category-children">
                    {category.subcategories.map((subcategory, subcategoryIndex) => {
                      const matching = categoryItems.filter(
                        (item) => item.subcategory === subcategory,
                      );
                      const expanded = openSubcategory === subcategory;
                      const subcategoryId = `${categoryId}-subcategory-${subcategoryIndex}`;
                      return (
                        <div className="subcategory-group" key={subcategory}>
                          <button
                            className={`subcategory-button ${expanded ? 'is-expanded' : ''}`}
                            aria-expanded={expanded}
                            aria-controls={subcategoryId}
                            onClick={() => setOpenSubcategory(expanded ? '' : subcategory)}
                          >
                            <ChevronRight size={13} className="category-chevron" />
                            <span>{subcategory}</span>
                            <small aria-hidden="true">{matching.length}</small>
                          </button>
                          <CategoryReveal id={subcategoryId} open={expanded}>
                            <div className="subcategory-objects">
                              {matching.length ? (
                                matching.map(objectButton)
                              ) : (
                                <p className="category-empty">
                                  No objects in {subcategory.toLowerCase()} yet.
                                </p>
                              )}
                            </div>
                          </CategoryReveal>
                        </div>
                      );
                    })}
                    {categoryItems.filter((item) => !item.subcategory).map(objectButton)}
                  </div>
                </CategoryReveal>
              </div>
            );
          })}
        </nav>
      )}
    </>
  );

  return (
    <aside
      className={`catalog-sidebar ${embedded ? 'catalog-sidebar-embedded' : ''}`}
      aria-label="Collection navigation"
    >
      <div className="catalog-sidebar-heading">
        <div className="catalog-search-field" role="search" aria-label="Collection">
          <Search size={17} aria-hidden="true" />
          <input
            ref={searchInput}
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query) {
                event.preventDefault();
                event.stopPropagation();
                clearSearch();
              }
            }}
            placeholder="Search collection…"
            aria-label="Search collection"
            aria-controls={query.trim() ? resultsId : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {embedded ? (
        contents
      ) : (
        <ScrollArea
          fill
          className="catalog-scroll"
          contentClassName="catalog-scroll-content"
          aria-label="Collection contents"
        >
          {contents}
        </ScrollArea>
      )}
    </aside>
  );
}

export const CatalogSidebar = memo(CatalogSidebarView);
