import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './authContext';
import { searchPokemonCards, addCardToCollection, getUserCollections } from './api';
import './App.css';

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

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingCards, setAddingCards] = useState<Set<string>>(new Set());
  const [userCollectionId, setUserCollectionId] = useState<number | null>(null);
  const { user, token, logout, isLoading: authLoading } = useAuth();

  // Get user's collection ID when they log in
  useEffect(() => {
    if (user && token) {
      getUserCollections(token)
        .then(collections => {
          if (collections.length > 0) {
            setUserCollectionId(collections[0].id);
          }
        })
        .catch(error => {
          console.error('Failed to get user collections:', error);
        });
    }
  }, [user, token]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const results = await searchPokemonCards(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCollection = async (card: PokemonCard) => {
    if (!userCollectionId || !token) return;

    try {
      setAddingCards(prev => new Set(prev).add(card.id));
      const result = await addCardToCollection(userCollectionId, card, token);
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

  const handleLogout = () => {
    logout();
    // Clear any local state
    setUserCollectionId(null);
    setSearchResults([]);
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>BinderBuilder</h1>
          </div>
          <div className="header-right">
            {user ? (
              <>
                <span className="user-info">Welcome, {user.username}!</span>
                <Link to="/collection" className="nav-button">My Collection</Link>
                <button onClick={handleLogout} className="nav-button logout-button">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-button">Login</Link>
                <Link to="/register" className="nav-button">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="search-section">
          <h2>Search Pokemon Cards</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for Pokemon cards..."
              className="search-input"
            />
            <button type="submit" className="search-button primary-button" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {searchResults.length > 0 && (
          <div className="results-section">
            <h3>Search Results</h3>
            <div className="cards-grid">
              {searchResults.map((card) => (
                <div key={card.id} className="card-item">
                  <img src={card.images.small} alt={card.name} className="card-image" />
                  <div className="card-info">
                    <h4>{card.name}</h4>
                    <p>Set: {card.set.name}</p>
                    <p>Series: {card.set.series}</p>
                    {user && userCollectionId ? (
                      <button
                        onClick={() => handleAddToCollection(card)}
                        disabled={addingCards.has(card.id)}
                        className="add-to-collection-button"
                      >
                        {addingCards.has(card.id) ? 'Adding...' : 'Add to Collection'}
                      </button>
                    ) : (
                      <Link to="/login" className="add-to-collection-button login-required">
                        Login to Add
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
