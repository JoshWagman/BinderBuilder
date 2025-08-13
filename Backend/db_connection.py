import psycopg2
from psycopg2.extras import RealDictCursor
import os
from typing import Optional, Dict, Any, List
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'collections'),
    'user': os.getenv('DB_USER', 'joshwagman'),
    'password': os.getenv('DB_PASSWORD', 'splitgoat')
}

class DatabaseConnection:
    def __init__(self):
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Establish connection to PostgreSQL database"""
        try:
            self.connection = psycopg2.connect(**DB_CONFIG)
            self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            logger.info("Successfully connected to PostgreSQL database")
            return True
        except psycopg2.Error as e:
            logger.error(f"Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> Optional[List[Dict[str, Any]]]:
        """Execute a query and return results"""
        try:
            if not self.connection or self.connection.closed:
                if not self.connect():
                    return None
            
            self.cursor.execute(query, params)
            
            # Check if the query is a SELECT (read-only) or a modification query
            query_upper = query.strip().upper()
            if query_upper.startswith('SELECT'):
                # Read-only query, fetch results
                results = self.cursor.fetchall()
                return [dict(row) for row in results]
            else:
                # Modification query (INSERT, UPDATE, DELETE) - always commit
                self.connection.commit()
                
                # If it has RETURNING clause, fetch the returned data
                if 'RETURNING' in query_upper:
                    results = self.cursor.fetchall()
                    return [dict(row) for row in results]
                else:
                    return None
                
        except psycopg2.Error as e:
            logger.error(f"Error executing query: {e}")
            if self.connection:
                self.connection.rollback()
            return None

    def add_card_to_collection(self, card_data: dict, collection_id: int):
        """Add a card to the collection"""
        logger.info(f'card_data: {card_data}')
        logger.info(f'collection_id: {collection_id}')
        try:
            # Extract card information with safe defaults
            pokemon_card_id = card_data.get('id')
            logger.info(f'pokemon_card_idawd: {pokemon_card_id}')
            name = card_data.get('name')
            logger.info(f'nameawd: {name}')
            set_name = card_data.get('set', {}).get('name')
            logger.info(f'set_nameawd: {set_name}')
            series = card_data.get('set', {}).get('series')
            logger.info(f'seriesawd: {series}')
            image_url = card_data.get('images', {}).get('small')
            logger.info(f'image_urlawd: {image_url}')
            price = card_data.get('cardmarket', {}).get('prices', {}).get('averageSellPrice')
            logger.info(f'priceawd: {price}')

            # Validate required fields
            if not pokemon_card_id or not name:
                logger.error("Missing required card data: id or name")
                return {"message": "Missing required card data", "card_id": None}
            
            query = """
                INSERT INTO cards (pokemon_card_id, name, set_name, series, image_url, price, collection_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (pokemon_card_id, collection_id) 
                DO UPDATE SET quantity = cards.quantity + 1
                RETURNING id
            """

            logger.info(f'query: {query}')
            
            result = self.execute_query(query, (pokemon_card_id, name, set_name, series, image_url, price, collection_id))
            logger.info(f'result: {result}')
            if result:
                return {"message": "Card added to collection successfully", "card_id": result[0]['id']}
            else:
                return {"message": "Failed to add card to collection", "card_id": None}
                
        except Exception as e:
            logger.error(f"Error adding card to collection: {e}")
            return {"message": f"Error adding card to collection: {str(e)}", "card_id": None}
    
    def create_tables(self):
        """Create necessary tables for the BinderBuilder application"""
        tables = {
            'collections': """
                CREATE TABLE IF NOT EXISTS collections (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """,
            'cards': """
                CREATE TABLE IF NOT EXISTS cards (
                    id SERIAL PRIMARY KEY,
                    pokemon_card_id VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    set_name VARCHAR(255),
                    series VARCHAR(255),
                    image_url TEXT,
                    price DECIMAL(10,2),
                    quantity INTEGER DEFAULT 1,
                    collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(pokemon_card_id, collection_id)
                )
            """,
            'users': """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
        }
        
        for table_name, query in tables.items():
            try:
                self.execute_query(query)
                logger.info(f"Table '{table_name}' created successfully")
            except Exception as e:
                logger.error(f"Error creating table '{table_name}': {e}")

# Global database connection instance
db = DatabaseConnection()

def get_db_connection():
    """Get database connection instance"""
    return db

def init_database():
    """Initialize database with required tables"""
    if db.connect():
        db.create_tables()
        db.disconnect()
        logger.info("Database initialization completed")
    else:
        logger.error("Failed to initialize database")

# Test connection function
def test_connection():
    """Test database connection"""
    if db.connect():
        result = db.execute_query("SELECT version();")
        if result:
            logger.info("Database connection test successful")
            logger.info(f"PostgreSQL version: {result[0]['version']}")
        db.disconnect()
        return True
    else:
        logger.error("Database connection test failed")
        return False

if __name__ == "__main__":
    # Test the connection when run directly
    test_connection()
    init_database()

