import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

# 密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def create_test_user():
    # 连接到MongoDB
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.KGDB
    users_collection = db.users_collection
    
    # 检查用户是否已存在
    existing_user = await users_collection.find_one({"username": "testuser"})
    if existing_user:
        print("Test user already exists")
        return
    
    # 创建测试用户
    test_user = {
        "username": "testuser",
        "email": "testuser@example.com",
        "hashed_password": get_password_hash("password123")
    }
    
    result = await users_collection.insert_one(test_user)
    print(f"Test user created with ID: {result.inserted_id}")

if __name__ == "__main__":
    asyncio.run(create_test_user())