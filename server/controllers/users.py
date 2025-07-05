from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.orm import Session

from fields import (
    UserCreate, UserUpdate, UserResponse,
    BatchUsersRequest
)
from models.database import get_db
from services import get_user_service_singleton, UserService
from libs.auth import get_current_user_id, get_password_hash

router = APIRouter(prefix="/api/users", tags=["用户管理"])


@router.get("", response_model=List[UserResponse])
async def get_users(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """获取所有用户"""
    users = user_service.get_all_users(db)
    
    return [
        UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            avatar=user.get('avatar'),
            role=user['role'],
            registerTime=user['registerTime']
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """根据ID获取用户"""
    user = user_service.get_user_by_id(db, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserResponse(
        id=user['id'],
        username=user['username'],
        email=user['email'],
        avatar=user.get('avatar'),
        role=user['role'],
        registerTime=user['registerTime']
    )


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """更新用户信息"""
    # 只能更新自己的信息
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能更新自己的信息"
        )
    
    # 检查用户是否存在
    existing_user = user_service.get_user_by_id(db, user_id)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 准备更新数据
    update_data = {}
    if user_update.username is not None:
        update_data['username'] = user_update.username
    if user_update.email is not None:
        update_data['email'] = user_update.email
    if user_update.avatar is not None:
        update_data['avatar'] = user_update.avatar
    
    # 更新用户
    success = user_service.update_user(db, user_id, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="用户更新失败"
        )
    
    return {"message": "用户信息更新成功"}


@router.post("", status_code=201)
async def create_user(
    user_create: UserCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """创建用户"""
    # 检查邮箱是否已存在
    existing_user = user_service.get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 加密密码
    hashed_password = get_password_hash(user_create.password)
    user_create.password = hashed_password
    
    # 创建用户
    user_service.create_user(db, user_create)
    return {"message": "用户创建成功"}


@router.post("/batch")
async def save_users_batch(
    batch_request: BatchUsersRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """批量保存用户"""
    user_service.save_users_batch(db, batch_request.users)
    return {"message": f"成功保存 {len(batch_request.users)} 个用户"}