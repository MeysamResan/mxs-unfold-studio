import { useWikipediaResource } from './use-wikipedia-resource';
import { readWikipediaFacts, type WikipediaArticle } from './wikipedia-content';

const factsResource = {
  name: 'facts',
  endpoint: (article: WikipediaArticle) => {
    const query = new URLSearchParams({
      action: 'parse',
      page: article.title,
      prop: 'text',
      section: '0',
      redirects: '1',
      disablelimitreport: '1',
      disableeditsection: '1',
      format: 'json',
      formatversion: '2',
      origin: '*',
    });
    return `${article.origin}/w/api.php?${query}`;
  },
  decode: readWikipediaFacts,
};

export function useWikipediaFacts(url: string, active: boolean) {
  return useWikipediaResource(url, active, factsResource);
}
