import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def get_db_url():
    url = os.getenv("DATABASE_URL", "sqlite:///./splitwise.db")
    if not url.startswith("postgres"):
        return url

    # Fallback to DB_PASSWORD to match the .env file
    password_env = os.getenv("DATABASE_PASSWORD")
    password = quote_plus(password_env)

    # Replace both variants just in case
    url = url.replace("[PASSWORD]", password)
    url = url.replace("[YOUR-PASSWORD]", password)
    
    return url

SQLALCHEMY_DATABASE_URL = get_db_url()

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
