import { useWikipediaResource } from './use-wikipedia-resource';
import { readWikipediaSummary, type WikipediaArticle } from './wikipedia-content';

const summaryResource = {
  name: 'summary',
  endpoint: (article: WikipediaArticle) =>
    `${article.origin}/api/rest_v1/page/summary/${encodeURIComponent(article.title.replaceAll(' ', '_'))}`,
  decode: readWikipediaSummary,
};

export function useWikipediaSummary(url: string, active: boolean) {
  return useWikipediaResource(url, active, summaryResource);
}
