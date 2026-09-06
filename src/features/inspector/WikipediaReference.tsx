import { ArrowUpRight, RotateCw } from 'lucide-react';
import type { ShowcaseDefinition } from '../../core/catalog/types';
import { useElementVisible } from '../../shared/use-element-visible';
import { usePageActive } from '../../shared/use-page-active';
import { useWikipediaSummary } from './use-wikipedia-summary';
import { useWikipediaFacts } from './use-wikipedia-facts';

export function WikipediaReference({
  reference,
}: {
  reference: NonNullable<ShowcaseDefinition['wikipedia']>;
}) {
  const [element, visible] = useElementVisible<HTMLElement>();
  const pageActive = usePageActive();
  const active = visible && pageActive;
  const { article, state, retry } = useWikipediaSummary(reference.url, active);
  const facts = useWikipediaFacts(reference.url, active);
  const summary = state.status === 'ready' ? state.data : null;
  const source = summary?.url ?? article?.url;

  return (
    <section ref={element} className="wikipedia-reference" aria-label="Wikipedia reference">
      <div className="reference-content" lang={summary?.language} dir={summary?.direction}>
        <h1>{summary?.title ?? article?.title ?? 'Article unavailable'}</h1>
        <section
          className="reference-section"
          aria-label="Quick facts"
          aria-busy={facts.state.status === 'loading'}
        >
          <h2>Quick facts</h2>
          {facts.state.status === 'ready' ? (
            <dl className="reference-facts">
              {facts.state.data.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : facts.state.status === 'error' ? (
            <div className="reference-error" role="status">
              <p>Quick facts couldn’t be loaded.</p>
              {article && (
                <button className="reference-retry" onClick={facts.retry}>
                  <RotateCw size={14} />
                  Retry quick facts
                </button>
              )}
            </div>
          ) : (
            <p className="reference-status" role="status">
              Loading quick facts…
            </p>
          )}
        </section>
        <section
          className="reference-section"
          aria-label="Summary"
          aria-busy={state.status === 'loading'}
        >
          <h2>Summary</h2>
          {summary ? (
            <p className="reference-summary">{summary.extract}</p>
          ) : state.status === 'error' ? (
            <div className="reference-error" role="status">
              <p>Wikipedia couldn’t be loaded.</p>
              {article && (
                <button className="reference-retry" onClick={retry}>
                  <RotateCw size={14} />
                  Try again
                </button>
              )}
            </div>
          ) : (
            <p className="reference-status" role="status">
              Loading from Wikipedia…
            </p>
          )}
        </section>
      </div>
      {source && (
        <a className="reference-link" href={source} target="_blank" rel="noreferrer">
          Read on Wikipedia
          <ArrowUpRight size={14} />
        </a>
      )}
    </section>
  );
}
