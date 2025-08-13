import requests
from fastapi import FastAPI, Query, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uvicorn
import os
import bcrypt
import jwt
from datetime import datetime, timedelta
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

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

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

# Authentication models
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

class TokenData(BaseModel):
    username: Optional[str] = None

def search_cards(query: str, page: int = 1, page_size: int = 20):
    """Search for Pokemon cards using the API"""
    try:
        # Format the query to work with Pokemon TCG API
        # If the query doesn't have a field specifier, assume it's a name search
        formatted_query = query
        if ':' not in query:
            formatted_query = f"name:{query}*"
        
        url = f"{BASE_URL}/cards"
        params = {
            "q": formatted_query,
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

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except jwt.PyJWTError:
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    db = get_db_connection()
    query = "SELECT id, username, email, created_at FROM users WHERE username = %s"
    result = db.execute_query(query, (username,))
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return result[0]

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

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
async def add_card_endpoint(collection_id: int, card_data: dict, current_user: dict = Depends(get_current_user)):
    """API endpoint for adding a card to collection"""
    # Verify user owns this collection
    db = get_db_connection()
    ownership_query = "SELECT id FROM collections WHERE id = %s AND user_id = %s"
    ownership_result = db.execute_query(ownership_query, (collection_id, current_user['id']))
    
    if not ownership_result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You don't own this collection"
        )
    
    result = add_card_to_collection(card_data, collection_id)
    return result

@app.get("/api/collection/{collection_id}")
async def get_collection_endpoint(collection_id: int, current_user: dict = Depends(get_current_user)):
    """API endpoint for getting a user's collection"""
    # Verify user owns this collection
    db = get_db_connection()
    ownership_query = "SELECT id FROM collections WHERE id = %s AND user_id = %s"
    ownership_result = db.execute_query(ownership_query, (collection_id, current_user['id']))
    
    if not ownership_result:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You don't own this collection"
        )
    
    result = get_user_collection(collection_id)
    return {"collection_id": collection_id, "cards": result}

@app.get("/api/collections", response_model=List[dict])
async def get_user_collections(current_user: dict = Depends(get_current_user)):
    """Get all collections for the current user"""
    db = get_db_connection()
    
    query = """
        SELECT id, name, description, created_at, updated_at
        FROM collections 
        WHERE user_id = %s
        ORDER BY created_at DESC
    """
    
    result = db.execute_query(query, (current_user['id'],))
    return result if result else []

@app.post("/api/auth/register", response_model=UserResponse)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    db = get_db_connection()
    
    try:
        # Check if username already exists
        check_query = "SELECT id FROM users WHERE username = %s OR email = %s"
        existing_user = db.execute_query(check_query, (user_data.username, user_data.email))
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Insert new user
        insert_query = """
            INSERT INTO users (username, email, password_hash, created_at, updated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, username, email, created_at
        """
        
        result = db.execute_query(insert_query, (user_data.username, user_data.email, hashed_password))
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Create default collection for user
        collection_query = """
            INSERT INTO collections (name, description, user_id, created_at, updated_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """
        db.execute_query(collection_query, (f"{user_data.username}'s Collection", "Default collection", result[0]['id']))
        
        return result[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/api/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """Login user and return JWT token"""
    db = get_db_connection()
    
    try:
        # Get user by username
        query = "SELECT id, username, password_hash FROM users WHERE username = %s"
        result = db.execute_query(query, (user_data.username,))
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        user = result[0]
        
        # Verify password
        if not verify_password(user_data.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        # Update last login
        update_query = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s"
        db.execute_query(update_query, (user['id'],))
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user['username']}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "BinderBuilder API is running"}

if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=5001) 