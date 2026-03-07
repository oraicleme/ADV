import type { ImageSearchProvider, ImageSearchResult } from './types';

const MOCK_CATALOG: Record<string, ImageSearchResult[]> = {
  samsung: [
    {
      id: 'mock-samsung-1',
      url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200',
      description: 'Samsung Galaxy smartphone',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
    {
      id: 'mock-samsung-2',
      url: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=200',
      description: 'Samsung phone product shot',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
  ],
  iphone: [
    {
      id: 'mock-iphone-1',
      url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=200',
      description: 'Apple iPhone',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
    {
      id: 'mock-iphone-2',
      url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=200',
      description: 'iPhone product photo',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
  ],
  nike: [
    {
      id: 'mock-nike-1',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
      description: 'Nike shoe',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
  ],
  laptop: [
    {
      id: 'mock-laptop-1',
      url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200',
      description: 'Laptop computer',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
  ],
  headphones: [
    {
      id: 'mock-headphones-1',
      url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
      description: 'Headphones',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
  ],
  bosch: [
    {
      id: 'mock-bosch-1',
      url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200',
      description: 'Bosch appliance',
      source: 'mock',
      attribution: 'Mock image for demo purposes',
      width: 800,
      height: 600,
    },
  ],
};

function findMatches(query: string, limit: number): ImageSearchResult[] {
  const lower = query.toLowerCase();
  const results: ImageSearchResult[] = [];

  for (const [keyword, items] of Object.entries(MOCK_CATALOG)) {
    if (lower.includes(keyword)) {
      results.push(...items);
    }
  }

  return results.slice(0, limit);
}

export class MockImageSearchProvider implements ImageSearchProvider {
  async search(query: string, limit = 3): Promise<ImageSearchResult[]> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300));
    return findMatches(query, limit);
  }
}
