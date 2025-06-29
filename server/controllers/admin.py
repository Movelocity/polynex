from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.orm import Session

from fields import (
    SiteConfig, SiteConfigCreate, SiteConfigUpdate,
    UserResponse, InviteCodeConfig, InviteCodeUpdate,
    SiteConfigResponse
)
from models.database import get_db
from services import UserService, ConfigService
from libs.auth import get_password_hash, require_admin_permission

router = APIRouter(prefix="/api/admin", tags=["管理员权限接口"])


# ===== 网站配置管理接口（管理员权限）=====

@router.get("/site-config", response_model=List[SiteConfigResponse], summary="获取所有网站配置")
async def get_site_configs(
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """
    获取所有网站配置
    
    **需要管理员权限**。获取系统中的所有配置项，包括配置键、值、描述等信息。
    """
    config_service = ConfigService(db)
    configs = config_service.get_all_site_configs()
    
    return [
        SiteConfigResponse(
            id=config['id'],
            key=config['key'],
            value=config['value'],
            description=config['description'],
            createTime=config['createTime'],
            updateTime=config['updateTime']
        )
        for config in configs
    ]


@router.get("/site-config/{key}", response_model=SiteConfig, summary="根据键获取网站配置")
async def get_site_config_by_key(
    key: str, 
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """
    根据键获取网站配置
    
    **需要管理员权限**。根据配置键获取特定的配置项信息。
    """
    config_service = ConfigService(db)
    config = config_service.get_site_config_by_key(key)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@router.put("/site-config/{key}", summary="更新网站配置")
async def update_site_config(
    key: str,
    config_update: SiteConfigUpdate,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """
    更新网站配置
    
    **需要管理员权限**。更新指定键的配置项值和描述。
    """
    config_service = ConfigService(db)
    success = config_service.update_site_config(
        key,
        config_update.value,
        config_update.description
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="配置更新失败"
        )
    
    return {"message": "配置更新成功"}


@router.post("/site-config")
async def create_site_config(
    config_create: SiteConfigCreate,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """创建网站配置（管理员）"""
    config_service = ConfigService(db)
    
    # 检查是否已存在相同的键
    existing_config = config_service.get_site_config_by_key(config_create.key)
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="配置键已存在"
        )
    
    success = config_service.update_site_config(
        key=config_create.key,
        value=config_create.value,
        description=config_create.description
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="配置创建失败"
        )
    return {"message": "配置创建成功"}


@router.delete("/site-config/{key}")
async def delete_site_config(
    key: str,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """删除网站配置（管理员权限）"""
    config_service = ConfigService(db)
    success = config_service.delete_site_config(key)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="配置不存在"
        )
    
    return {"message": "配置删除成功"}


# ===== 邀请码配置管理接口（管理员权限）=====

@router.get("/invite-code-config", response_model=InviteCodeConfig)
async def get_invite_code_config(
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """获取邀请码配置（管理员）"""
    config_service = ConfigService(db)
    require_invite_code = config_service.get_site_config_value('require_invite_code', 'false')
    invite_code = config_service.get_site_config_value('invite_code', '')
    
    return InviteCodeConfig(
        require_invite_code=require_invite_code.lower() == 'true',
        invite_code=invite_code if invite_code else None
    )


@router.put("/invite-code-config")
async def update_invite_code_config(
    config: InviteCodeUpdate,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """更新邀请码配置（管理员）"""
    try:
        config_service = ConfigService(db)
        
        # 更新是否需要邀请码的配置
        config_service.update_site_config(
            key='require_invite_code',
            value='true' if config.require_invite_code else 'false',
            description='注册是否需要邀请码'
        )
        
        # 更新邀请码内容
        invite_code_value = config.invite_code if config.invite_code else ''
        config_service.update_site_config(
            key='invite_code',
            value=invite_code_value,
            description='邀请码内容'
        )
        
        return {"message": "邀请码配置更新成功"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="邀请码配置更新失败"
        )


# ===== 管理员用户管理接口 =====

@router.get("/users", response_model=List[UserResponse], summary="获取所有用户")
async def get_all_users(
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """
    获取所有用户
    
    **需要管理员权限**。获取系统中的所有用户信息，包括用户名、邮箱、角色等。
    """
    user_service = UserService(db)
    users = user_service.get_all_users()
    
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


@router.get("/users/stats", summary="获取用户统计数据")
async def get_user_stats(
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """
    获取用户统计数据
    
    **需要管理员权限**。获取用户统计信息，包括总用户数、管理员数量、普通用户数量等。
    """
    user_service = UserService(db)
    stats = user_service.get_user_stats()
    return stats


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_data: dict,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """更新用户角色（管理员权限）"""
    role = role_data.get('role')
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="角色不能为空"
        )
    
    user_service = UserService(db)
    success = user_service.update_user_role(user_id, role)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {"message": "用户角色更新成功"}


@router.put("/users/{user_id}")
async def update_user_info_by_admin(
    user_id: str,
    updates: dict,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """管理员更新用户信息"""
    user_service = UserService(db)
    
    # 如果更新密码，需要加密
    if 'password' in updates:
        updates['password'] = get_password_hash(updates['password'])
    
    success = user_service.update_user(user_id, updates)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {"message": "用户信息更新成功"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """删除用户（管理员权限）"""
    # 防止删除自己
    if user_id == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己"
        )
    
    user_service = UserService(db)
    success = user_service.delete_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {"message": "用户删除成功"}


@router.put("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    password_data: dict,
    admin_user_id: str = Depends(require_admin_permission),
    db: Session = Depends(get_db)
):
    """重置用户密码（管理员权限）"""
    new_password = password_data.get('password')
    if not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不能为空"
        )
    
    user_service = UserService(db)
    hashed_password = get_password_hash(new_password)
    success = user_service.reset_user_password(user_id, hashed_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return {"message": "密码重置成功"} 