import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchPokemonCards, addCardToCollection } from './api';
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
  const [addingCards, setAddingCards] = useState<Set<string>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }
    try {
      const data = await searchPokemonCards(searchQuery);
      setSearchResults(data.data || []);
    } catch (err) {
      setError('Failed to fetch cards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async (card: PokemonCard) => {
    try {
      setAddingCards(prev => new Set(prev).add(card.id));
      
      // Using collection ID 1 (the default collection we created)
      const result = await addCardToCollection(1, card);
      
      // Show success message (you could add a toast notification here)
      alert(`Successfully added ${card.name} to your collection!`);
      
    } catch (err) {
      console.error('Failed to add card to collection:', err);
      alert('Failed to add card to collection. Please try again.');
    } finally {
      setAddingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(card.id);
        return newSet;
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Pokemon Card Search</h1>
            <p>Search through thousands of Pokemon cards</p>
          </div>
          <div className="header-right">
            <Link to="/collection" className="nav-button">
              My Collection
            </Link>
          </div>
        </div>
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
                    <button
                      onClick={() => handleAddToCollection(card)}
                      disabled={addingCards.has(card.id)}
                      className="add-to-collection-button"
                    >
                      {addingCards.has(card.id) ? 'Adding...' : 'Add to Collection'}
                    </button>
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
