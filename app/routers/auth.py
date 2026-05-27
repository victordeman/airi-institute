from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
import libsql_client

from app.limiter import limiter
from app.database import get_db
from app.models.schemas import Token, UserCreate, User
from app.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=User)
async def register_user(user: UserCreate, db: libsql_client.Client = Depends(get_db)):
    # Check if user already exists
    result = await db.execute("SELECT id FROM users WHERE username = ?", (user.username,))
    if result.rows:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(user.password)
    await db.execute(
        "INSERT INTO users (username, email, full_name, hashed_password, role) VALUES (?, ?, ?, ?, ?)",
        (user.username, user.email, user.full_name, hashed_password, user.role),
    )
    return user

@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: libsql_client.Client = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
