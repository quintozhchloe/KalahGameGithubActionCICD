from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from . import schemas, security, database
from .security import get_password_hash, verify_password
from bson import ObjectId
import logging

# 设置日志
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

async def get_user(username: str):
    logger.info(f"Looking up user: {username}")
    user = await database.users_collection.find_one({"username": username})
    if user:
        logger.info(f"User found: {username}")
        return schemas.UserInDB(**user)
    logger.warning(f"User not found: {username}")
    return None

@router.post("/register", response_model=schemas.User)
async def register(user: schemas.UserCreate):
    logger.info(f"Registration attempt for username: {user.username}")
    existing_user = await database.users_collection.find_one({
        "$or": [
            {"username": user.username},
            {"email": user.email}
        ]
    })
    if existing_user:
        logger.warning(f"Registration failed - username or email already exists: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password
    del user_dict["password"]
    
    try:
        result = await database.users_collection.insert_one(user_dict)
        new_user = await database.users_collection.find_one({"_id": result.inserted_id})
        new_user["id"] = str(new_user["_id"])
        logger.info(f"User registered successfully: {user.username}")
        return new_user
    except Exception as e:
        logger.error(f"Error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info(f"Login attempt for username: {form_data.username}")
    try:
        user = await get_user(form_data.username)
        if not user:
            logger.warning(f"Login failed - user not found: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(form_data.password, user.hashed_password):
            logger.warning(f"Login failed - incorrect password for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        logger.info(f"Login successful for user: {form_data.username}")
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
