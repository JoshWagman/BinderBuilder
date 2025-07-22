import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

POKEMON_DB_API_KEY = "12bb73f9-8f57-4d91-a3f1-06d96bafc221"
BASE_URL = "https://api.pokemontcg.io/v2"

headers = {
    "X-Api-Key": POKEMON_DB_API_KEY
}

def search_cards(query, page=1, pageSize=20):
    """Search for Pokemon cards using the API"""
    try:
        url = f"{BASE_URL}/cards"
        params = {
            "q": query,
            "page": page,
            "pageSize": pageSize
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        print('response', response.json())
        
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching cards: {e}")
        return {"error": "Failed to fetch cards", "data": []}

def get_card_by_id(card_id):
    """Get a specific card by ID"""
    try:
        url = f"{BASE_URL}/cards/{card_id}"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching card {card_id}: {e}")
        return {"error": f"Failed to fetch card {card_id}"}

@app.route('/', methods=['GET'])
def index():
    return "Welcome to Binder Builder!", 200

@app.route('/api/search', methods=['GET'])
def search_endpoint():
    """API endpoint for searching cards"""
    query = request.args.get('q=name:', '')
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 20))
    
    if not query:
        return jsonify({"error": "Query parameter 'q' is required"}), 400
    
    result = search_cards(query, page, page_size)
    return jsonify(result)

@app.route('/api/card/<card_id>', methods=['GET'])
def get_card_endpoint(card_id):
    """API endpoint for getting a specific card"""
    result = get_card_by_id(card_id)
    return jsonify(result)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Pokemon Card API is running"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

