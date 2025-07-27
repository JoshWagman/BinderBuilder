// Portal/src/api.ts

export interface PokemonCard {
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    name: string;
    series: string;
  };
  cardmarket: {
    prices: {
      averageSellPrice: number;
    };
  };
}

export interface SearchResponse {
  data: PokemonCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

export async function searchPokemonCards(searchQuery: string): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=name:${encodeURIComponent(searchQuery)}*&pageSize=20`,
  {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}