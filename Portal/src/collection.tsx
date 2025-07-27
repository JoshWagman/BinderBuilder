import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';

function Collection() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>My Pokemon Collection</h1>
        <p>View and manage your Pokemon card collection</p>
        <Link to="/" className="nav-button">
          ← Back to Search
        </Link>
      </header>

      <main className="App-main">
        <div className="collection-container">
          <div className="collection-stats">
            <h2>Collection Overview</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <h3>Total Cards</h3>
                <p>0</p>
              </div>
              <div className="stat-item">
                <h3>Sets</h3>
                <p>0</p>
              </div>
              <div className="stat-item">
                <h3>Estimated Value</h3>
                <p>$0.00</p>
              </div>
            </div>
          </div>

          <div className="collection-content">
            <div className="empty-collection">
              <h3>Your collection is empty</h3>
              <p>Start building your collection by searching for cards and adding them to your binder!</p>
              <Link to="/" className="primary-button">
                Search for Cards
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Collection;