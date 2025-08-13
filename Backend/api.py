import requests
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv
from db_connection import get_db_connection

# Load environment variables
load_dotenv()

app = FastAPI(title="BinderBuilder API", description="API for Pokemon card collection management")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

POKEMON_DB_API_KEY = os.getenv("POKEMON_DB_API_KEY")
if not POKEMON_DB_API_KEY:
    raise ValueError("POKEMON_DB_API_KEY environment variable is not set")

BASE_URL = "https://api.pokemontcg.io/v2"

headers = {
    "X-Api-Key": POKEMON_DB_API_KEY
}

# Pydantic models for type safety
class PokemonCard(BaseModel):
    id: str
    name: str
    images: dict
    set: dict
    cardmarket: Optional[dict] = None

class SearchResponse(BaseModel):
    data: List[PokemonCard]
    page: int
    pageSize: int
    count: int
    totalCount: int

class CollectionCard(BaseModel):
    pokemon_card_id: str
    name: str
    set_name: Optional[str] = None
    series: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    quantity: int = 1
    collection_id: int

def search_cards(query: str, page: int = 1, page_size: int = 20):
    """Search for Pokemon cards using the API"""
    try:
        url = f"{BASE_URL}/cards"
        params = {
            "q": query,
            "page": page,
            "pageSize": page_size
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail="Failed to fetch cards")

def get_card_by_id(card_id: str):
    """Get a specific card by ID"""
    try:
        url = f"{BASE_URL}/cards/{card_id}"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=404, detail=f"Failed to fetch card {card_id}")

def add_card_to_collection(card_data: dict, collection_id: int):
    """Add a card to the user's collection"""
    db = get_db_connection()
    
    try:
        # Use the database connection method
        result = db.add_card_to_collection(card_data, collection_id)
        
        if result and result.get('card_id'):
            return {"message": result['message'], "card_id": result['card_id']}
        else:
            # Log the actual error message
            error_msg = result.get('message', 'Failed to add card to collection') if result else 'Failed to add card to collection'
            raise HTTPException(status_code=500, detail=error_msg)
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to add card to collection")

def get_user_collection(collection_id: int):
    """Get all cards in a user's collection"""
    db = get_db_connection()
    
    query = """
        SELECT c.*, col.name as collection_name
        FROM cards c
        JOIN collections col ON c.collection_id = col.id
        WHERE c.collection_id = %s
        ORDER BY c.added_at DESC
    """
    
    result = db.execute_query(query, (collection_id,))
    return result if result else []

@app.get("/")
async def index():
    """Root endpoint"""
    return {"message": "Welcome to BinderBuilder API!"}

@app.get("/api/search")
async def search_endpoint(
    q: str = Query(..., description="Search query"),
    page: int = Query(1, description="Page number"),
    pageSize: int = Query(20, description="Number of results per page")
):
    """API endpoint for searching cards"""
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
    
    result = search_cards(q, page, pageSize)
    return result

@app.get("/api/card/{card_id}")
async def get_card_endpoint(card_id: str):
    """API endpoint for getting a specific card"""
    result = get_card_by_id(card_id)
    return result

@app.post("/api/collection/{collection_id}/add-card")
async def add_card_endpoint(collection_id: int, card_data: dict):
    """API endpoint for adding a card to collection"""
    result = add_card_to_collection(card_data, collection_id)
    return result

@app.get("/api/collection/{collection_id}")
async def get_collection_endpoint(collection_id: int):
    """API endpoint for getting a user's collection"""
    result = get_user_collection(collection_id)
    return {"collection_id": collection_id, "cards": result}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "BinderBuilder API is running"}

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5001) 