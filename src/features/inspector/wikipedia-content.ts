export interface WikipediaArticle {
  title: string;
  url: string;
  origin: string;
}

export interface WikipediaSummary {
  title: string;
  extract: string;
  url: string;
  language: string;
  direction: 'ltr' | 'rtl';
}

export interface WikipediaFact {
  label: string;
  value: string;
}

export function getWikipediaArticle(value: string): WikipediaArticle | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !/^[a-z][a-z0-9-]*\.wikipedia\.org$/.test(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      !url.pathname.startsWith('/wiki/')
    )
      return null;
    const title = decodeURIComponent(url.pathname.slice(6)).replaceAll('_', ' ').trim();
    if (!title) return null;
    url.search = '';
    url.hash = '';
    return { title, url: url.href, origin: url.origin };
  } catch {
    return null;
  }
}

export function readWikipediaSummary(value: unknown, article: WikipediaArticle): WikipediaSummary {
  if (!value || typeof value !== 'object') throw new Error('Invalid Wikipedia summary');
  const data = value as Record<string, unknown>;
  if (
    typeof data.title !== 'string' ||
    !data.title.trim() ||
    typeof data.extract !== 'string' ||
    !data.extract.trim() ||
    data.type === 'disambiguation'
  )
    throw new Error('Wikipedia summary unavailable');
  const source = new URL(article.url);
  source.pathname = `/wiki/${encodeURIComponent(data.title.replaceAll(' ', '_'))}`;
  return {
    title: data.title,
    extract: data.extract,
    url: source.href,
    language: typeof data.lang === 'string' ? data.lang : source.hostname.split('.')[0],
    direction: data.dir === 'rtl' ? 'rtl' : 'ltr',
  };
}

// These are display-label aliases, never locally supplied historical values.
const factFields: readonly { label: string; source: readonly string[] }[] = [
  { label: 'Origin', source: ['place of origin', 'country of origin', 'origin'] },
  { label: 'Designed', source: ['designed', 'design date', 'year designed'] },
  { label: 'Production years', source: ['produced', 'production date', 'production years'] },
  { label: 'Introduced', source: ['introduced', 'introduction', 'first produced'] },
  { label: 'Ammunition', source: ['cartridge', 'cartridges', 'ammunition'] },
  { label: 'Manufacturer', source: ['manufacturer', 'manufacturers'] },
  { label: 'Type', source: ['type'] },
  { label: 'Action', source: ['action'] },
  { label: 'Feed system', source: ['feed system'] },
];

function plainText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy
    .querySelectorAll(
      'script, style, template, noscript, img, picture, source, iframe, object, embed, svg, math, .reference, .noprint, .sortkey, [hidden], [aria-hidden="true"]',
    )
    .forEach((node) => node.remove());
  copy.querySelectorAll('br').forEach((node) => node.replaceWith('\n'));
  copy.querySelectorAll('li').forEach((node) => node.append('\n'));
  return (copy.textContent ?? '')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' · ');
}

/** Read text only; the inert fragment and all remote media remain outside the live document. */
export function readWikipediaFacts(value: unknown): WikipediaFact[] {
  if (!value || typeof value !== 'object') throw new Error('Invalid Wikipedia facts');
  const parse = (value as { parse?: unknown }).parse;
  if (!parse || typeof parse !== 'object') throw new Error('Wikipedia facts unavailable');
  const data = parse as { title?: unknown; text?: unknown };
  if (typeof data.title !== 'string' || !data.title.trim() || typeof data.text !== 'string') {
    throw new Error('Invalid Wikipedia facts');
  }

  const fragment = document.createElement('template');
  fragment.innerHTML = data.text;
  const table = fragment.content.querySelector('table.infobox');
  const values = new Map<string, string[]>();
  for (const row of table?.querySelectorAll('tr') ?? []) {
    if (row.closest('table') !== table || row.matches('.infobox-hiddenrow, [hidden]')) continue;
    const label = row.querySelector(':scope > th');
    const cell = row.querySelector(':scope > td');
    if (!label || !cell) continue;
    const key = plainText(label)
      .toLowerCase()
      .replace(/[:\s]+$/g, '');
    const text = plainText(cell);
    if (!key || !text) continue;
    const entries = values.get(key) ?? [];
    if (!entries.includes(text)) entries.push(text);
    values.set(key, entries);
  }

  const facts: WikipediaFact[] = [{ label: 'Name', value: data.title }];
  for (const field of factFields) {
    const entries = field.source.flatMap((key) => values.get(key) ?? []);
    if (entries.length)
      facts.push({ label: field.label, value: [...new Set(entries)].join(' · ') });
  }
  return facts;
}
