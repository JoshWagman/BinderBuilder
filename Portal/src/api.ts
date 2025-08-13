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
  cardmarket?: {
    prices?: {
      averageSellPrice?: number;
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

export interface AddCardResponse {
  message: string;
  card_id: number;
}

export interface Collection {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function searchPokemonCards(query: string, page: number = 1, pageSize: number = 20): Promise<PokemonCard[]> {
  try {
    // Format the query to work with Pokemon TCG API
    // If the query doesn't have a field specifier, assume it's a name search
    let formattedQuery = query;
    if (!query.includes(':')) {
      formattedQuery = `name:${query}*`;
    }
    
    const response = await fetch(`/api/search?q=${encodeURIComponent(formattedQuery)}&page=${page}&pageSize=${pageSize}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching cards:', error);
    throw error;
  }
}

export async function addCardToCollection(collectionId: number, cardData: PokemonCard, token: string): Promise<AddCardResponse> {
  const response = await fetch(`/api/collection/${collectionId}/add-card`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(cardData)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function getUserCollections(token: string): Promise<Collection[]> {
  const response = await fetch('/api/collections', {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function getCollectionCards(collectionId: number, token: string): Promise<any> {
  const response = await fetch(`/api/collection/${collectionId}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}