from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from sqlalchemy.orm import Session

from fields import (
    UserCreate, UserLogin, UserResponse,
    LoginResponse, RegisterResponse, RegistrationConfig
)
from models.database import get_db
from services import get_user_service_singleton, get_config_service_singleton, UserService, ConfigService
from libs.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user_id, ACCESS_TOKEN_EXPIRE_MINUTES,
    check_login_rate_limit, get_remaining_attempts, get_reset_time,
    record_login_attempt
)

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=LoginResponse)
async def login(
    user_login: UserLogin,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
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
    user_data = user_service.get_user_by_email(db, user_login.email)
    
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


@router.get("/registration-config", response_model=RegistrationConfig)
async def get_registration_config(
    db: Session = Depends(get_db),
    config_service: ConfigService = Depends(get_config_service_singleton)
):
    """获取注册配置（公开接口）"""
    
    allow_registration = config_service.get_site_config_value(db, 'allow_registration', 'true')
    require_invite_code = config_service.get_site_config_value(db, 'require_invite_code', 'false')
    
    return RegistrationConfig(
        allow_registration=allow_registration.lower() == 'true',
        require_invite_code=require_invite_code.lower() == 'true'
    )


@router.post("/register", response_model=RegisterResponse)
async def register(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton),
    config_service: ConfigService = Depends(get_config_service_singleton)
):
    """用户注册"""
    
    # 检查是否允许注册
    allow_registration = config_service.get_site_config_value(db, 'allow_registration', 'true')
    if allow_registration.lower() != 'true':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前不允许注册新用户"
        )
    
    # 检查是否需要邀请码
    require_invite_code = config_service.get_site_config_value(db, 'require_invite_code', 'false')
    if require_invite_code.lower() == 'true':
        invite_code = config_service.get_site_config_value(db, 'invite_code', '')
        
        # 验证邀请码
        if not user_create.invite_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="注册需要邀请码"
            )
        
        if not invite_code or user_create.invite_code != invite_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邀请码无效"
            )
    
    # 检查邮箱是否已存在
    existing_user = user_service.get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 检查用户名是否已存在
    existing_username = user_service.get_user_by_username(db, user_create.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被使用"
        )
    
    # 加密密码
    hashed_password = get_password_hash(user_create.password)
    user_create.password = hashed_password
    
    # 创建用户
    new_user = user_service.create_user(db, user_create)
    
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
async def validate_token(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """验证JWT token并返回当前用户信息"""
    user_data = user_service.get_user_by_id(db, current_user_id)
    
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
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
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
    user_data = user_service.get_user_by_id(db, current_user_id)
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
    success = user_service.update_user(db, current_user_id, {'password': hashed_new_password})
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码更新失败"
        )
    
    return {"message": "密码更新成功"}
