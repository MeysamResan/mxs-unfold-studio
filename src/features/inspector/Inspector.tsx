import { ChevronRight, Layers3 } from 'lucide-react';
import { memo } from 'react';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import { WikipediaReference } from './WikipediaReference';
import { ScrollArea } from '../../shared/ScrollArea';

function InspectorView({
  definition,
  selectedPart,
  onSelect,
}: {
  definition: ShowcaseDefinition;
  selectedPart: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <aside id="object-information" className="inspector" aria-label="Object information">
      <ScrollArea
        fill
        className="inspector-scroll"
        contentClassName="inspector-content"
        aria-label="Object details panel"
      >
        {definition.wikipedia ? (
          <WikipediaReference key={definition.wikipedia.url} reference={definition.wikipedia} />
        ) : (
          <p className="reference-status">No Wikipedia article linked yet.</p>
        )}
        <div className="parts-heading">
          <span>
            <Layers3 size={14} /> Visual groups
          </span>
          <span>{String(definition.parts.length).padStart(2, '0')}</span>
        </div>
        <div className="part-list">
          {definition.parts.map((part, index) => (
            <button
              key={part.id}
              className={`part-button ${selectedPart === part.id ? 'is-selected' : ''}`}
              aria-pressed={selectedPart === part.id}
              onClick={() => onSelect(part.id)}
            >
              <span className="part-number">{String(index + 1).padStart(2, '0')}</span>
              <span>{part.label}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

export const Inspector = memo(InspectorView);
