from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    hashed_password: str

class User(UserBase):
    id: str  # MongoDB的_id
    
    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "johndoe@example.com",
                "id": "507f1f77bcf86cd799439011"
            }
        }

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None