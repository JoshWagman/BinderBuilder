import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './authContext';
import { getUserCollections, getCollectionCards } from './api';
import './App.css';

interface CollectionCard {
  id: number;
  pokemon_card_id: string;
  name: string;
  set_name: string;
  series: string;
  image_url: string;
  price: number;
  quantity: number;
  collection_id: number;
  added_at: string;
  collection_name: string;
}

const Collection: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [cards, setCards] = useState<CollectionCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      loadUserCollections();
    }
  }, [user, token]);

  useEffect(() => {
    if (selectedCollection && token) {
      loadCollectionCards();
    }
  }, [selectedCollection, token]);

  const loadUserCollections = async () => {
    try {
      const userCollections = await getUserCollections(token!);
      setCollections(userCollections);
      if (userCollections.length > 0) {
        setSelectedCollection(userCollections[0]);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  const loadCollectionCards = async () => {
    if (!selectedCollection) return;
    
    setIsLoading(true);
    try {
      const collectionData = await getCollectionCards(selectedCollection.id, token!);
      setCards(collectionData.cards || []);
    } catch (error) {
      console.error('Failed to load collection cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    // Clear any local state
    setCollections([]);
    setSelectedCollection(null);
    setCards([]);
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Access Denied</h2>
          <p>You must be logged in to view your collection.</p>
          <Link to="/login" className="auth-button primary-button">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>My Collection</h1>
          </div>
          <div className="header-right">
            <span className="user-info">Welcome, {user.username}!</span>
            <Link to="/" className="nav-button">Back to Search</Link>
            <button onClick={handleLogout} className="nav-button logout-button">Logout</button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="collection-container">
          <div className="collection-header">
            <h2>Your Collections</h2>
            {collections.length > 0 && (
              <div className="collection-selector">
                <label htmlFor="collection-select">Select Collection:</label>
                <select
                  id="collection-select"
                  value={selectedCollection?.id || ''}
                  onChange={(e) => {
                    const collection = collections.find(c => c.id === parseInt(e.target.value));
                    setSelectedCollection(collection);
                  }}
                >
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedCollection && (
            <div className="collection-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Collection Name</span>
                  <span className="stat-value">{selectedCollection.name}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Cards</span>
                  <span className="stat-value">{cards.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Created</span>
                  <span className="stat-value">
                    {new Date(selectedCollection.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading collection...</p>
            </div>
          ) : cards.length > 0 ? (
            <div className="collection-content">
              <h3>Cards in Collection</h3>
              <div className="cards-grid">
                {cards.map((card) => (
                  <div key={card.id} className="card-item">
                    <img src={card.image_url} alt={card.name} className="card-image" />
                    <div className="card-info">
                      <h4>{card.name}</h4>
                      <p>Set: {card.set_name}</p>
                      <p>Series: {card.series}</p>
                      <p>Quantity: {card.quantity}</p>
                      {card.price && <p>Price: ${card.price.toFixed(2)}</p>}
                      <p className="card-date">
                        Added: {new Date(card.added_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-collection">
              <h3>No Cards Yet</h3>
              <p>Your collection is empty. Start building it by searching for Pokemon cards!</p>
              <Link to="/" className="primary-button">
                Search for Cards
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Collection;