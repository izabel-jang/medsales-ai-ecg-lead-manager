// Google Custom Search API 서비스
export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface NewsSearchResult {
  title: string;
  link: string;
  snippet: string;
  publishedDate?: string;
  source: string;
}

class SearchService {
  private readonly GOOGLE_SEARCH_API_KEY = process.env.VITE_GOOGLE_SEARCH_API_KEY;
  private readonly SEARCH_ENGINE_ID = process.env.VITE_SEARCH_ENGINE_ID;
  private readonly NEWS_API_KEY = process.env.VITE_NEWS_API_KEY;

  // Google Custom Search로 병원 정보 검색
  async searchHospitalInfo(hospitalName: string, query?: string): Promise<SearchResult[]> {
    if (!this.GOOGLE_SEARCH_API_KEY || !this.SEARCH_ENGINE_ID) {
      throw new Error('Google Search API 설정이 필요합니다');
    }

    const searchQuery = query ? `${hospitalName} ${query}` : `${hospitalName} 병원 의료진 진료과`;
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${this.GOOGLE_SEARCH_API_KEY}&cx=${this.SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=10`
      );
      
      const data = await response.json();
      
      if (data.items) {
        return data.items.map((item: any) => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          displayLink: item.displayLink
        }));
      }
      
      return [];
    } catch (error) {
      console.error('병원 검색 실패:', error);
      return [];
    }
  }

  // 의료 AI 뉴스 검색
  async searchMedicalAINews(hospitalName: string): Promise<NewsSearchResult[]> {
    if (!this.NEWS_API_KEY) {
      throw new Error('News API 설정이 필요합니다');
    }

    const searchQuery = `${hospitalName} AI 의료기기 심전도 딥러닝`;

    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=ko&sortBy=publishedAt&apiKey=${this.NEWS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.articles) {
        return data.articles.map((article: any) => ({
          title: article.title,
          link: article.url,
          snippet: article.description || '',
          publishedDate: article.publishedAt,
          source: article.source.name
        }));
      }
      
      return [];
    } catch (error) {
      console.error('뉴스 검색 실패:', error);
      return [];
    }
  }

  // 학술 논문 검색 (CrossRef API)
  async searchAcademicPapers(query: string): Promise<SearchResult[]> {
    const searchQuery = `${query} ECG AI 심전도`;
    
    try {
      const response = await fetch(
        `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&rows=10`
      );
      
      const data = await response.json();
      
      if (data.message && data.message.items) {
        return data.message.items.map((item: any) => ({
          title: item.title?.[0] || 'No Title',
          link: item.URL || '',
          snippet: item.abstract || item['short-container-title']?.[0] || '',
          displayLink: item.URL || ''
        }));
      }
      
      return [];
    } catch (error) {
      console.error('학술 논문 검색 실패:', error);
      return [];
    }
  }

  // 한국 의료 정보 포털 검색
  async searchKoreanMedicalPortals(hospitalName: string): Promise<SearchResult[]> {
    const portals = [
      { name: '건강보험심사평가원', url: 'hira.or.kr' },
      { name: '의료기관정보', url: 'hospital.go.kr' },
      { name: '한국보건산업진흥원', url: 'khidi.or.kr' }
    ];

    const results: SearchResult[] = [];
    
    for (const portal of portals) {
      try {
        const searchQuery = `site:${portal.url} ${hospitalName}`;
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${this.GOOGLE_SEARCH_API_KEY}&cx=${this.SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=5`
        );
        
        const data = await response.json();
        
        if (data.items) {
          const portalResults = data.items.map((item: any) => ({
            title: `[${portal.name}] ${item.title}`,
            link: item.link,
            snippet: item.snippet,
            displayLink: portal.name
          }));
          results.push(...portalResults);
        }
      } catch (error) {
        console.error(`${portal.name} 검색 실패:`, error);
      }
    }
    
    return results;
  }

  // 종합 검색 - 모든 소스를 통합
  async comprehensiveSearch(hospitalName: string): Promise<{
    general: SearchResult[];
    news: NewsSearchResult[];
    academic: SearchResult[];
    medical: SearchResult[];
  }> {
    try {
      const [general, news, academic, medical] = await Promise.all([
        this.searchHospitalInfo(hospitalName),
        this.searchMedicalAINews(hospitalName),
        this.searchAcademicPapers(hospitalName),
        this.searchKoreanMedicalPortals(hospitalName)
      ]);

      return { general, news, academic, medical };
    } catch (error) {
      console.error('종합 검색 실패:', error);
      return {
        general: [],
        news: [],
        academic: [],
        medical: []
      };
    }
  }
}

export const searchService = new SearchService();