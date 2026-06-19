import os
from urllib.parse import quote_plus
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def get_db_url():
    url = os.getenv("DATABASE_URL", "sqlite:///./splitwise.db")
    if not url.startswith("postgres"):
        if url.startswith("sqlite+aiosqlite"):
            return url
        if url.startswith("sqlite:///"):
            return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
        return url

    # Fallback to DB_PASSWORD to match the .env file
    password_env = os.getenv("DATABASE_PASSWORD")
    password = quote_plus(password_env or "")

    # Replace both variants just in case
    url = url.replace("[PASSWORD]", password)
    url = url.replace("[YOUR-PASSWORD]", password)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    return url

SQLALCHEMY_DATABASE_URL = get_db_url()

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_async_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=5,
        max_overflow=5,
        pool_timeout=30,
        pool_recycle=1800
    )

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as db:
        yield db

async def create_database_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
