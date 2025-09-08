import React, { useState, useEffect, useMemo } from 'react';
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
  const [viewMode, setViewMode] = useState<'list' | 'binder'>('list');
  const [selectedCardForModal, setSelectedCardForModal] = useState<CollectionCard | null>(null);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState<'none' | 'next' | 'prev'>('none');

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
    setSelectedCardForModal(null);
  };

  const totalCards = useMemo(() => cards.reduce((sum, card) => sum + (card.quantity || 0), 0), [cards]);

  const expandedCards = useMemo(() => {
    const duplicates: CollectionCard[] = [];
    for (const card of cards) {
      const count = Math.max(0, card.quantity || 0);
      for (let i = 0; i < count; i++) {
        duplicates.push(card);
      }
    }
    return duplicates;
  }, [cards]);

  const spreads = useMemo(() => {
    const pages: CollectionCard[][] = [];
    let current: CollectionCard[] = [];
    expandedCards.forEach((c) => {
      if (current.length === 18) {
        pages.push(current);
        current = [];
      }
      current.push(c);
    });
    if (current.length > 0) pages.push(current);
    return pages;
  }, [expandedCards]);

  useEffect(() => {
    // Reset to first spread when cards change or leaving/entering binder view
    setCurrentSpreadIndex(0);
  }, [spreads.length, viewMode]);

  const goToNextSpread = () => {
    if (currentSpreadIndex < Math.max(0, spreads.length - 1)) {
      setIsFlipping('next');
      setTimeout(() => {
        setCurrentSpreadIndex((i) => Math.min(i + 1, spreads.length - 1));
        setIsFlipping('none');
      }, 450);
    }
  };

  const goToPrevSpread = () => {
    if (currentSpreadIndex > 0) {
      setIsFlipping('prev');
      setTimeout(() => {
        setCurrentSpreadIndex((i) => Math.max(i - 1, 0));
        setIsFlipping('none');
      }, 450);
    }
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
            <div className="view-selector">
              <label htmlFor="view-select">View:</label>
              <select
                id="view-select"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'list' | 'binder')}
              >
                <option value="list">List view</option>
                <option value="binder">Binder view</option>
              </select>
            </div>
          </div>

          {selectedCollection && (
            <div className="collection-stats">
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Collection Name: </span>
                  <span className="stat-value">{selectedCollection.name}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Cards: </span>
                  <span className="stat-value">{totalCards}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Created: </span>
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
          ) : viewMode === 'list' ? (
            cards.length > 0 ? (
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
            )
          ) : expandedCards.length > 0 ? (
            <div className="binder-container">
              <div className="binder-controls">
                <button className="binder-arrow left" onClick={goToPrevSpread} disabled={currentSpreadIndex === 0} aria-label="Previous spread">‹</button>
                <div className={`binder-spread ${isFlipping === 'next' ? 'flip-next' : ''} ${isFlipping === 'prev' ? 'flip-prev' : ''}`}>
                  {(() => {
                    const spreadCards = spreads[currentSpreadIndex] || [];
                    const left = spreadCards.slice(0, 9);
                    const right = spreadCards.slice(9, 18);
                    return (
                      <>
                        <div className="binder-page">
                          {left.map((card, idx) => (
                            <div key={`L${currentSpreadIndex}-${idx}-${card.id}`} className="binder-slot" onClick={() => setSelectedCardForModal(card)}>
                              <img src={card.image_url} alt={card.name} />
                            </div>
                          ))}
                          {Array.from({ length: 9 - left.length }).map((_, i) => (
                            <div key={`L-pad-${currentSpreadIndex}-${i}`} className="binder-slot empty"></div>
                          ))}
                        </div>
                        <div className="binder-page">
                          {right.map((card, idx) => (
                            <div key={`R${currentSpreadIndex}-${idx}-${card.id}`} className="binder-slot" onClick={() => setSelectedCardForModal(card)}>
                              <img src={card.image_url} alt={card.name} />
                            </div>
                          ))}
                          {Array.from({ length: 9 - right.length }).map((_, i) => (
                            <div key={`R-pad-${currentSpreadIndex}-${i}`} className="binder-slot empty"></div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button className="binder-arrow right" onClick={goToNextSpread} disabled={currentSpreadIndex >= spreads.length - 1} aria-label="Next spread">›</button>
              </div>
              <div className="binder-page-indicator">Page {spreads.length === 0 ? 0 : currentSpreadIndex + 1} / {spreads.length}</div>
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
      {selectedCardForModal && (
        <div className="modal-overlay" onClick={() => setSelectedCardForModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCardForModal(null)}>×</button>
            <div className="modal-content">
              <img src={selectedCardForModal.image_url} alt={selectedCardForModal.name} />
              <div className="modal-info">
                <h4>{selectedCardForModal.name}</h4>
                <p>Set: {selectedCardForModal.set_name}</p>
                <p>Series: {selectedCardForModal.series}</p>
                {selectedCardForModal.price && <p>Price: ${selectedCardForModal.price.toFixed(2)}</p>}
                <p>Quantity: {selectedCardForModal.quantity}</p>
                <p>Added: {new Date(selectedCardForModal.added_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collection;