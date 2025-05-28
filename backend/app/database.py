from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# 使用本地MongoDB连接字符串
MONGO_DETAILS = os.getenv("MONGO_URI", "mongodb://localhost:27017")
logger.info(f"Connecting to MongoDB at: {MONGO_DETAILS}")

try:
    client = AsyncIOMotorClient(MONGO_DETAILS, serverSelectionTimeoutMS=5000)
    # 验证连接
    client.server_info()
    logger.info("Successfully connected to MongoDB")
    database = client.KGDB  # 修改为KGDB数据库
    users_collection = database.get_collection("users")  # 用户集合
    leaderboard_collection = database.get_collection("leaderboard")  # 排行榜集合
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise

# 创建索引以确保用户名和电子邮件的唯一性
async def create_indexes():
    try:
        await users_collection.create_index("username", unique=True)
        await users_collection.create_index("email", unique=True)
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        raise
