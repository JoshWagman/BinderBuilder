# Pokemon Card Search Frontend

A React-based frontend for searching through Pokemon cards using the Pokemon TCG API.

## Features

- 🔍 Search Pokemon cards by name, set, or other attributes
- 🎨 Beautiful, modern UI with responsive design
- 📱 Mobile-friendly interface
- ⚡ Real-time search results
- 💰 Display card prices (when available)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Python 3.7 or higher
- npm or yarn

### Backend Setup

1. Navigate to the Backend directory:
   ```bash
   cd ../Backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the Flask backend server:
   ```bash
   python db_connection.py
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the React development server:
   ```bash
   npm start
   ```

   The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Use the search bar to find Pokemon cards
3. Try different search terms:
   - Pokemon names: "Charizard", "Pikachu"
   - Set names: "set.name:base", "set.name:generations"
   - Card types: "subtypes:mega", "types:fire"

## API Endpoints

- `GET /api/search?q=<query>` - Search for cards
- `GET /api/card/<id>` - Get a specific card by ID
- `GET /api/health` - Health check

## Search Examples

- `Charizard` - Find all Charizard cards
- `set.name:base` - Find cards from the Base Set
- `subtypes:mega` - Find Mega Evolution cards
- `types:fire` - Find Fire type Pokemon
- `hp:100` - Find cards with 100 HP

## Technologies Used

- **Frontend**: React, TypeScript, CSS3
- **Backend**: Python Flask, requests
- **API**: Pokemon TCG API v2 