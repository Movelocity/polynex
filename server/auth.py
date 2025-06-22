from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import threading
import time

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置
SECRET_KEY = "your-secret-key-here"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7天

# HTTP Bearer 认证
security = HTTPBearer()

# Rate Limiting 配置
LOGIN_RATE_LIMIT_PER_MINUTE = 6  # 每分钟最多6次登录尝试
LOGIN_RATE_WINDOW_MINUTES = 1    # 时间窗口：1分钟

# 存储登录尝试记录的内存缓存
# 格式: {email: [timestamp1, timestamp2, ...]}
login_attempts: Dict[str, List[float]] = {}
login_attempts_lock = threading.Lock()


def clean_expired_attempts(email: str, current_time: float):
    """清理过期的登录尝试记录"""
    cutoff_time = current_time - (LOGIN_RATE_WINDOW_MINUTES * 60)
    if email in login_attempts:
        login_attempts[email] = [
            timestamp for timestamp in login_attempts[email] 
            if timestamp > cutoff_time
        ]
        # 如果列表为空，删除该邮箱的记录
        if not login_attempts[email]:
            del login_attempts[email]


def check_login_rate_limit(email: str) -> bool:
    """
    检查登录速率限制（不记录尝试）
    
    Args:
        email: 用户邮箱
        
    Returns:
        bool: True表示允许登录，False表示超出限制
    """
    current_time = time.time()
    
    with login_attempts_lock:
        # 清理过期的尝试记录
        clean_expired_attempts(email, current_time)
        
        # 检查当前邮箱的登录尝试次数
        attempts_count = len(login_attempts.get(email, []))
        
        return attempts_count < LOGIN_RATE_LIMIT_PER_MINUTE


def record_login_attempt(email: str):
    """
    记录登录尝试
    
    Args:
        email: 用户邮箱
    """
    current_time = time.time()
    
    with login_attempts_lock:
        # 清理过期的尝试记录
        clean_expired_attempts(email, current_time)
        
        # 记录这次登录尝试
        if email not in login_attempts:
            login_attempts[email] = []
        login_attempts[email].append(current_time)


def get_remaining_attempts(email: str) -> int:
    """
    获取剩余的登录尝试次数
    
    Args:
        email: 用户邮箱
        
    Returns:
        int: 剩余尝试次数
    """
    current_time = time.time()
    
    with login_attempts_lock:
        # 清理过期的尝试记录
        clean_expired_attempts(email, current_time)
        
        attempts_count = len(login_attempts.get(email, []))
        return max(0, LOGIN_RATE_LIMIT_PER_MINUTE - attempts_count)


def get_reset_time(email: str) -> Optional[int]:
    """
    获取限制重置时间（秒）
    
    Args:
        email: 用户邮箱
        
    Returns:
        Optional[int]: 距离限制重置的秒数，如果没有限制则返回None
    """
    current_time = time.time()
    
    with login_attempts_lock:
        # 清理过期的尝试记录
        clean_expired_attempts(email, current_time)
        
        if email not in login_attempts or len(login_attempts[email]) < LOGIN_RATE_LIMIT_PER_MINUTE:
            return None
        
        # 找到最早的尝试时间
        earliest_attempt = min(login_attempts[email])
        reset_time = earliest_attempt + (LOGIN_RATE_WINDOW_MINUTES * 60)
        
        return max(0, int(reset_time - current_time))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """验证令牌"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """从令牌中获取当前用户ID"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


# 可选的认证依赖（用于不需要强制认证的端点）
def get_current_user_id_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    """可选的用户认证，如果没有令牌则返回None"""
    if credentials is None:
        return None
    
    try:
        return get_current_user_id(credentials)
    except HTTPException:
        return None
