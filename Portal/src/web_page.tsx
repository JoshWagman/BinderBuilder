import React, { useState } from 'react';
import './App.css';

interface PokemonCard {
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

interface SearchResponse {
  data: PokemonCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&pageSize=20`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: SearchResponse = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setError('Failed to fetch cards. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Pokemon Card Search</h1>
        <p>Search through thousands of Pokemon cards</p>
      </header>

      <main className="App-main">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for Pokemon cards (e.g., 'Charizard', 'Pikachu', 'set.name:base')"
              className="search-input"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="search-button"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching for cards...</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="results-container">
            <h2>Search Results ({searchResults.length} cards)</h2>
            <div className="cards-grid">
              {searchResults.map((card) => (
                <div key={card.id} className="card-item">
                  <img 
                    src={card.images.small} 
                    alt={card.name}
                    className="card-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="card-info">
                    <h3 className="card-name">{card.name}</h3>
                    <p className="card-set">{card.set.name}</p>
                    <p className="card-series">{card.set.series}</p>
                    {card.cardmarket?.prices?.averageSellPrice && (
                      <p className="card-price">
                        ${card.cardmarket.prices.averageSellPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && searchResults.length === 0 && searchQuery && (
          <div className="no-results">
            <p>No cards found for "{searchQuery}". Try a different search term.</p>
            <p className="search-tips">
              <strong>Search tips:</strong> Try searching by Pokemon name, set name, or use filters like "set.name:base" or "subtypes:mega"
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
