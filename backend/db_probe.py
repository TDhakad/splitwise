import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os
from urllib.parse import quote_plus

load_dotenv("../.env")
url = os.getenv("DATABASE_URL")
password_env = os.getenv("DATABASE_PASSWORD")
password = quote_plus(password_env or "")
if url is None:
    raise RuntimeError("DATABASE_URL is required")
url = url.replace("[PASSWORD]", password).replace("[YOUR-PASSWORD]", password)
url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(url)

async def main():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, description, total_amount, created_at FROM expenses ORDER BY created_at DESC LIMIT 5;"))
        for row in result:
            print(row)

asyncio.run(main())
