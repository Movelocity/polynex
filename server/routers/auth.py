from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from datetime import timedelta

from models import (
    UserCreate, UserLogin, UserResponse,
    LoginResponse, RegisterResponse
)
from database import db
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user_id, ACCESS_TOKEN_EXPIRE_MINUTES,
    check_login_rate_limit, get_remaining_attempts, get_reset_time,
    record_login_attempt
)

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=LoginResponse)
async def login(user_login: UserLogin):
    """用户登录"""
    # 检查登录速率限制
    if not check_login_rate_limit(user_login.email):
        remaining_attempts = get_remaining_attempts(user_login.email)
        reset_time = get_reset_time(user_login.email)
        
        error_detail = f"登录尝试过于频繁，每分钟最多允许6次登录尝试。"
        if reset_time:
            error_detail += f" 请在{reset_time}秒后重试。"
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_detail,
            headers={
                "X-RateLimit-Limit": "6",
                "X-RateLimit-Remaining": str(remaining_attempts),
                "X-RateLimit-Reset": str(reset_time) if reset_time else "0"
            }
        )
    
    # 记录登录尝试
    record_login_attempt(user_login.email)
    
    user_data = db.get_user_by_email(user_login.email)
    
    if not user_data or not verify_password(user_login.password, user_data['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data['id']}, expires_delta=access_token_expires
    )
    
    # 返回用户信息（不包含密码）
    user_response = UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        role=user_data['role'],
        registerTime=user_data['registerTime']
    )
    
    return LoginResponse(user=user_response, token=access_token)


@router.post("/register", response_model=RegisterResponse)
async def register(user_create: UserCreate):
    """用户注册"""
    # 检查是否允许注册
    allow_registration = db.get_site_config_value('allow_registration', 'true')
    if allow_registration.lower() != 'true':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前不允许注册新用户"
        )
    
    # 检查是否需要邀请码
    require_invite_code = db.get_site_config_value('require_invite_code', 'false')
    if require_invite_code.lower() == 'true':
        invite_code = db.get_site_config_value('invite_code', '')
        # 这里应该有邀请码验证逻辑，但目前先跳过
        # 实际应用中可以在UserCreate模型中添加invite_code字段
        pass
    
    # 检查邮箱是否已存在
    existing_user = db.get_user_by_email(user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 检查用户名是否已存在
    existing_username = db.get_user_by_username(user_create.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被使用"
        )
    
    # 加密密码
    hashed_password = get_password_hash(user_create.password)
    user_create.password = hashed_password
    
    # 创建用户
    new_user = db.create_user(user_create)
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user['id']}, expires_delta=access_token_expires
    )
    
    # 返回用户信息（不包含密码）
    user_response = UserResponse(
        id=new_user['id'],
        username=new_user['username'],
        email=new_user['email'],
        avatar=new_user.get('avatar'),
        role=new_user['role'],
        registerTime=new_user['registerTime']
    )
    
    return RegisterResponse(user=user_response, token=access_token)


@router.post("/logout")
async def logout(current_user_id: str = Depends(get_current_user_id)):
    """用户登出"""
    # 在简单实现中，登出只需要客户端删除令牌
    # 在生产环境中，可能需要将令牌加入黑名单
    return {"message": "登出成功"}


@router.get("/validate", response_model=UserResponse)
async def validate_token(current_user_id: str = Depends(get_current_user_id)):
    """验证JWT token并返回当前用户信息"""
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        role=user_data['role'],
        registerTime=user_data['registerTime']
    )


@router.put("/password")
async def update_password(
    password_data: dict,
    current_user_id: str = Depends(get_current_user_id)
):
    """更新用户密码"""
    current_password = password_data.get('currentPassword')
    new_password = password_data.get('newPassword')
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码和新密码都不能为空"
        )
    
    # 获取用户信息
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 验证当前密码
    if not verify_password(current_password, user_data['password']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误"
        )
    
    # 更新密码
    hashed_new_password = get_password_hash(new_password)
    success = db.update_user(current_user_id, {'password': hashed_new_password})
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码更新失败"
        )
    
    return {"message": "密码更新成功"} 