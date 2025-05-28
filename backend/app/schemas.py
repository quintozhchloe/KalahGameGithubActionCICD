from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Union
import uuid

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: str
    avatar: Optional[str] = None

class UserInDB(UserBase):
    hashed_password: str
    avatar: Optional[str] = None

class User(UserBase):
    id: str  # MongoDB's _id
    avatar: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "johndoe@example.com",
                "id": "507f1f77bcf86cd799439011",
                "avatar": "/assets/1.png"
            }
        }

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

# 排行榜条目创建模型
class LeaderboardEntryCreate(BaseModel):
    playerName: str
    score: int
    duration: int
    avatar: Optional[str] = "/assets/default-avatar.png"

# 排行榜条目响应模型
class LeaderboardEntry(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    playerName: str
    score: int
    duration: int
    avatar: str
    
    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "playerName": "Player1",
                "score": 100,
                "duration": 300,
                "avatar": "/assets/1.png"
            }
        }




