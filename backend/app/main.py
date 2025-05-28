from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .security import get_current_user
from . import auth, schemas, database
import os
import uuid
import shutil
from typing import List
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 明确指定前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件配置
if not os.path.exists("static/assets"):
    os.makedirs("static/assets", exist_ok=True)
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# 包含认证路由
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Kalah Game API"}

# 添加排行榜接口
@app.get("/leaderboard", response_model=List[schemas.LeaderboardEntry])
async def get_leaderboard():
    try:
        logger.info("Fetching leaderboard data")
        leaderboard = await database.leaderboard_collection.find().sort("score", -1).to_list(10)
        logger.info(f"Fetched {len(leaderboard)} leaderboard entries")
        return leaderboard
    except Exception as e:
        logger.error(f"Error fetching leaderboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leaderboard: {str(e)}"
        )

@app.post("/leaderboard", response_model=schemas.LeaderboardEntry)
async def add_leaderboard_entry(entry: schemas.LeaderboardEntryCreate):
    try:
        logger.info(f"Adding leaderboard entry: {entry.dict()}")
        
        # 确保avatar字段有值
        if not entry.avatar:
            entry.avatar = "/assets/default-avatar.png"
            
        # 创建新的排行榜条目
        new_entry = entry.dict()
        result = await database.leaderboard_collection.insert_one(new_entry)
        
        # 获取创建的条目
        created_entry = await database.leaderboard_collection.find_one({"_id": result.inserted_id})
        logger.info(f"Successfully added leaderboard entry with ID: {result.inserted_id}")
        
        return created_entry
    except Exception as e:
        logger.error(f"Error adding leaderboard entry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding leaderboard entry: {str(e)}"
        )

@app.get("/users/me", response_model=schemas.User)
async def get_current_user_info(current_user: schemas.User = Depends(get_current_user)):
    return current_user

@app.post("/users/upload-avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_user)
):
    try:
        # Create unique filename
        file_extension = os.path.splitext(avatar.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"uploads/avatars/{unique_filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
        
        # Update user avatar
        avatar_url = f"/uploads/avatars/{unique_filename}"
        await database.users_collection.update_one(
            {"username": current_user.username},
            {"$set": {"avatar": avatar_url}}
        )
        
        # 获取服务器基础URL
        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        full_avatar_url = f"{base_url}{avatar_url}"
        
        return {"avatar_url": avatar_url, "full_url": full_avatar_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading avatar: {str(e)}"
        )

@app.get("/protected")
async def protected_route(current_user: schemas.User = Depends(get_current_user)):
    return {"message": "This is a protected route", "user": current_user.username}

@app.put("/users/update-profile")
async def update_profile(
    user_data: schemas.UserUpdate,
    current_user: schemas.User = Depends(get_current_user)
):
    try:
        # 检查用户名是否已存在
        if user_data.username != current_user.username:
            existing_user = await database.users_collection.find_one({"username": user_data.username})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
        
        # 检查邮箱是否已存在
        if user_data.email != current_user.email:
            existing_email = await database.users_collection.find_one({"email": user_data.email})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
        
        # 更新用户资料
        update_data = {k: v for k, v in user_data.dict().items() if v is not None}
        
        await database.users_collection.update_one(
            {"username": current_user.username},
            {"$set": update_data}
        )
        
        # 获取更新后的用户资料
        updated_user = await database.users_collection.find_one({"username": user_data.username})
        if not updated_user:
            updated_user = await database.users_collection.find_one({"username": current_user.username})
        
        return {
            "message": "Profile updated successfully",
            "user": schemas.User(**updated_user)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )

# 初始化数据库索引
@app.on_event("startup")
async def startup_db_client():
    await database.create_indexes()
    print("Database indexes created successfully")
