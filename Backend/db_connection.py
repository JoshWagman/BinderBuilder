import requests
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(title="Pokemon Card API", description="API for searching Pokemon cards")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

POKEMON_DB_API_KEY = "12bb73f9-8f57-4d91-a3f1-06d96bafc221"
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

        print('response', response.json())
        
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching cards: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cards")

def get_card_by_id(card_id: str):
    """Get a specific card by ID"""
    try:
        url = f"{BASE_URL}/cards/{card_id}"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching card {card_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Failed to fetch card {card_id}")

@app.get("/")
async def index():
    """Root endpoint"""
    return {"message": "Welcome to Binder Builder!"}

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

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Pokemon Card API is running"}

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5001)

