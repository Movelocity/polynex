from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from models import (
    UserCreate, UserUpdate, UserResponse,
    BatchUsersRequest
)
from database import db
from auth import get_current_user_id, get_password_hash

router = APIRouter(prefix="/api/users", tags=["用户管理"])


@router.get("", response_model=List[UserResponse])
async def get_users(current_user_id: str = Depends(get_current_user_id)):
    """获取所有用户"""
    users = db.get_all_users()
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


@router.get("/current", response_model=UserResponse)
async def get_current_user(current_user_id: str = Depends(get_current_user_id)):
    """获取当前用户"""
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        role=user_data['role'],
        registerTime=user_data['registerTime']
    )


@router.get("/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(email: str):
    """根据邮箱查找用户"""
    user_data = db.get_user_by_email(email)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        role=user_data['role'],
        registerTime=user_data['registerTime']
    )


@router.get("/by-username/{username}", response_model=UserResponse)
async def get_user_by_username(username: str):
    """根据用户名查找用户"""
    user_data = db.get_user_by_username(username)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        role=user_data['role'],
        registerTime=user_data['registerTime']
    )


@router.post("", status_code=201)
async def create_user(user_create: UserCreate, current_user_id: str = Depends(get_current_user_id)):
    """创建用户"""
    # 检查邮箱是否已存在
    existing_user = db.get_user_by_email(user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 加密密码
    hashed_password = get_password_hash(user_create.password)
    user_create.password = hashed_password
    
    # 创建用户
    db.create_user(user_create)
    return {"message": "用户创建成功"}


@router.put("/{user_id}")
async def update_user(
    user_id: str, 
    user_update: UserUpdate, 
    current_user_id: str = Depends(get_current_user_id)
):
    """更新用户"""
    # 只允许用户更新自己的信息
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能更新自己的信息"
        )
    
    updates = user_update.dict(exclude_unset=True)
    
    # 验证用户名唯一性
    if 'username' in updates:
        existing_user = db.get_user_by_username(updates['username'])
        if existing_user and existing_user['id'] != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已被使用"
            )
    
    # 验证邮箱唯一性
    if 'email' in updates:
        existing_user = db.get_user_by_email(updates['email'])
        if existing_user and existing_user['id'] != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被使用"
            )
    
    # 如果更新密码，需要加密
    if 'password' in updates:
        updates['password'] = get_password_hash(updates['password'])
    
    success = db.update_user(user_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    # 返回更新后的用户信息
    updated_user = db.get_user_by_id(user_id)
    return {
        "message": "用户信息更新成功",
        "user": UserResponse(
            id=updated_user['id'],
            username=updated_user['username'],
            email=updated_user['email'],
            avatar=updated_user.get('avatar'),
            role=updated_user['role'],
            registerTime=updated_user['registerTime']
        )
    }


@router.post("/batch")
async def save_users_batch(
    batch_request: BatchUsersRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """批量保存用户"""
    users_data = [user.model_dump() for user in batch_request.users]
    db.save_users_batch(users_data)
    return {"message": "用户批量保存成功"} 