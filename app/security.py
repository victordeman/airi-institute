import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
import libsql_client

from app.database import get_db, to_dict_list
from app.models.schemas import TokenData, User

# Secret keys for JWT
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480 # Extended for development

# AIRI Institute Role Hierarchy & Permissions
ROLE_LEVELS = {
    "super_admin": 100,
    "institute_director": 80,
    "faculty": 50,
    "research_assistant": 40,
    "student": 20,
    "industry_partner": 15,
    "guest": 5
}

def check_permission(user_role: str, resource: str, action: str) -> bool:
    """
    Implements the AIRI Institute RBAC Permissions Matrix.
    """
    level = ROLE_LEVELS.get(user_role, 0)

    if user_role == "super_admin":
        return True

    if resource == "XR Experiences":
        if action == "view":
            return level >= 5
        if action in ["create", "publish"]:
            return level >= 50

    if resource == "Courses":
        if action in ["create", "manage"]:
            return level >= 50

    if resource == "Student Portfolios":
        if action == "view":
            return level >= 40

    if resource == "Research Projects":
        if action in ["create", "publish"]:
            return level >= 50

    if resource == "Users":
        if action in ["create", "assign roles"]:
            return level >= 80

    if resource == "Analytics":
        if action == "view":
            return level >= 20

    if resource == "Consultancy":
        if action == "create":
            return level >= 15

    if resource == "System Config":
        if action == "manage":
            return level >= 100

    if resource == "Audit Log":
        if action == "read":
            return level >= 80

    return False

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(db: libsql_client.Client, username: str):
    result = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
    users = to_dict_list(result)
    if users:
        return users[0]
    return None

async def authenticate_user(db: libsql_client.Client, username: str, password: str):
    user = await get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: libsql_client.Client = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    user = await get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    user_obj = User(**user)
    if user_obj.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user_obj
