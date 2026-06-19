from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..auth import create_access_token, get_password_hash, verify_google_token, verify_password
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.User)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    if not user.password:
        raise HTTPException(status_code=400, detail="Password is required")

    hashed_password = await run_in_threadpool(get_password_hash, user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        hashed_password=hashed_password,
        auth_provider="local",
        auth_provider_id=None,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


@router.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalar_one_or_none()
    password_ok = bool(user) and await run_in_threadpool(verify_password, form_data.password, user.hashed_password)
    if not user or not password_ok:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=schemas.Token)
async def google_auth(auth_req: schemas.GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    idinfo = await run_in_threadpool(verify_google_token, auth_req.token)
    if not idinfo:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    email = idinfo.get("email")
    name = idinfo.get("name")
    avatar_url = idinfo.get("picture")
    google_id = idinfo.get("sub")

    result = await db.execute(select(models.User).where(models.User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = models.User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            auth_provider="google",
            auth_provider_id=google_id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
