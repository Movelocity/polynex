from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from models import (
    SiteConfig, SiteConfigCreate, SiteConfigUpdate,
    UserResponse, UserStatsResponse, AdminUserUpdate, 
    UserRoleUpdate, AdminPasswordReset, InviteCodeConfig, InviteCodeUpdate
)
from database import db
from auth import get_current_user_id, get_password_hash

router = APIRouter(prefix="/api/admin", tags=["管理员"])


# ===== 权限检查函数 =====

def check_admin_permission(current_user_id: str) -> bool:
    """检查用户是否为管理员"""
    user_data = db.get_user_by_id(current_user_id)
    return user_data and user_data['role'] == 'admin'


def require_admin_permission(current_user_id: str = Depends(get_current_user_id)):
    """要求管理员权限的依赖"""
    if not check_admin_permission(current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user_id


# ===== 网站配置管理接口（管理员权限）=====

@router.get("/site-config", response_model=List[SiteConfig])
async def get_site_configs(admin_user_id: str = Depends(require_admin_permission)):
    """获取所有网站配置（管理员）"""
    configs = db.get_all_site_configs()
    return configs


@router.get("/site-config/{key}", response_model=SiteConfig)
async def get_site_config_by_key(key: str, admin_user_id: str = Depends(require_admin_permission)):
    """根据键获取网站配置（管理员）"""
    config = db.get_site_config_by_key(key)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@router.put("/site-config/{key}")
async def update_site_config(
    key: str,
    config_update: SiteConfigUpdate,
    admin_user_id: str = Depends(require_admin_permission)
):
    """更新网站配置（管理员）"""
    success = db.update_site_config(
        key=key, 
        value=config_update.value, 
        description=config_update.description
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
    admin_user_id: str = Depends(require_admin_permission)
):
    """创建网站配置（管理员）"""
    # 检查是否已存在相同的键
    existing_config = db.get_site_config_by_key(config_create.key)
    if existing_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="配置键已存在"
        )
    
    success = db.update_site_config(
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
    admin_user_id: str = Depends(require_admin_permission)
):
    """删除网站配置（管理员）"""
    success = db.delete_site_config(key)
    if not success:
        raise HTTPException(status_code=404, detail="配置不存在")
    return {"message": "配置删除成功"}


# ===== 邀请码配置管理接口（管理员权限）=====

@router.get("/invite-code-config", response_model=InviteCodeConfig)
async def get_invite_code_config(admin_user_id: str = Depends(require_admin_permission)):
    """获取邀请码配置（管理员）"""
    require_invite_code = db.get_site_config_value('require_invite_code', 'false')
    invite_code = db.get_site_config_value('invite_code', '')
    
    return InviteCodeConfig(
        require_invite_code=require_invite_code.lower() == 'true',
        invite_code=invite_code if invite_code else None
    )


@router.put("/invite-code-config")
async def update_invite_code_config(
    config: InviteCodeUpdate,
    admin_user_id: str = Depends(require_admin_permission)
):
    """更新邀请码配置（管理员）"""
    try:
        # 更新是否需要邀请码的配置
        db.update_site_config(
            key='require_invite_code',
            value='true' if config.require_invite_code else 'false',
            description='注册是否需要邀请码'
        )
        
        # 更新邀请码内容
        invite_code_value = config.invite_code if config.invite_code else ''
        db.update_site_config(
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

@router.get("/users", response_model=List[UserResponse])
async def get_all_users_by_admin(admin_user_id: str = Depends(require_admin_permission)):
    """获取所有用户列表（管理员权限）"""
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


@router.get("/users/stats", response_model=UserStatsResponse)
async def get_user_stats_by_admin(admin_user_id: str = Depends(require_admin_permission)):
    """获取用户统计数据（管理员权限）"""
    stats = db.get_user_stats()
    return UserStatsResponse(**stats)


@router.put("/users/{user_id}/role")
async def update_user_role_by_admin(
    user_id: str,
    role_data: UserRoleUpdate,
    admin_user_id: str = Depends(require_admin_permission)
):
    """更新用户角色（管理员权限）"""
    # 不能修改自己的角色
    if user_id == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的角色"
        )
    
    try:
        success = db.update_user_role(user_id, role_data.role.value)
        if not success:
            raise HTTPException(status_code=404, detail="用户不存在")
        return {"message": "用户角色更新成功"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/users/{user_id}")
async def update_user_info_by_admin(
    user_id: str,
    user_updates: AdminUserUpdate,
    admin_user_id: str = Depends(require_admin_permission)
):
    """更新用户信息（管理员权限）"""
    # 将Pydantic模型转换为字典，排除None值
    updates = user_updates.model_dump(exclude_unset=True)
    
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="没有可更新的字段"
        )
    
    # 不能修改自己的角色
    if 'role' in updates and user_id == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的角色"
        )
    
    # 将UserRole枚举转换为字符串
    if 'role' in updates:
        updates['role'] = updates['role'].value
    
    try:
        success = db.update_user_info_by_admin(user_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="用户不存在")
        return {"message": "用户信息更新成功"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/users/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    admin_user_id: str = Depends(require_admin_permission)
):
    """删除用户（管理员权限）"""
    # 不能删除自己
    if user_id == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己的账户"
        )
    
    try:
        success = db.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=404, detail="用户不存在")
        return {"message": "用户删除成功"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/users/{user_id}/password")
async def reset_user_password_by_admin(
    user_id: str,
    password_data: AdminPasswordReset,
    admin_user_id: str = Depends(require_admin_permission)
):
    """重置用户密码（管理员权限）"""
    # 加密新密码
    hashed_password = get_password_hash(password_data.newPassword)
    
    success = db.reset_user_password(user_id, hashed_password)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {"message": "密码重置成功"} 