"""
用户服务模块

负责用户相关的数据库操作
"""

from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from models.database import User, UserRole
from fields import UserCreate


class UserService:
    """用户服务类"""
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _user_to_dict(self, user: User) -> Dict[str, Any]:
        """将User对象转换为字典"""
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'password': user.password,
            'avatar': user.avatar,
            'role': user.role.value,
            'registerTime': user.register_time.isoformat() + 'Z'
        }
    
    def get_all_users(self, db: Session) -> List[Dict[str, Any]]:
        """获取所有用户"""
        users = db.query(User).all()
        return [self._user_to_dict(user) for user in users]
    
    def get_user_by_id(self, db: Session, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户"""
        user = db.query(User).filter(User.id == user_id).first()
        return self._user_to_dict(user) if user else None
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取用户"""
        user = db.query(User).filter(User.email == email).first()
        return self._user_to_dict(user) if user else None
    
    def get_user_by_username(self, db: Session, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名获取用户"""
        user = db.query(User).filter(User.username == username).first()
        return self._user_to_dict(user) if user else None
    
    def create_user(self, db: Session, user_data: UserCreate) -> Dict[str, Any]:
        """创建新用户"""
        # 检查是否是第一个用户（自动设为管理员）
        user_count = db.query(User).count()
        role = UserRole.ADMIN if user_count == 0 else UserRole.USER
        
        new_user = User(
            id=self._generate_id(),
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            avatar=user_data.avatar,
            role=role,
            register_time=datetime.now()
        )
        
        db.add(new_user)
        db.commit()
        
        return self._user_to_dict(new_user)
    
    def update_user(self, db: Session, user_id: str, updates: Dict[str, Any]) -> bool:
        """更新用户信息"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        for key, value in updates.items():
            if hasattr(user, key.replace('Time', '_time')):  # 处理registerTime字段
                attr_name = key.replace('Time', '_time') if 'Time' in key else key
                setattr(user, attr_name, value)
        
        db.commit()
        return True
    
    def delete_user(self, db: Session, user_id: str) -> bool:
        """删除用户"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        db.delete(user)
        db.commit()
        return True
    
    def update_user_role(self, db: Session, user_id: str, role: str) -> bool:
        """更新用户角色"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # 验证角色值
        if role not in ['admin', 'user']:
            raise ValueError("无效的角色类型")
        
        user.role = UserRole(role)
        db.commit()
        return True
    
    def get_user_stats(self, db: Session) -> Dict[str, int]:
        """获取用户统计数据"""
        total_count = db.query(User).count()
        admin_count = db.query(User).filter(User.role == UserRole.ADMIN).count()
        user_count = db.query(User).filter(User.role == UserRole.USER).count()
        
        return {
            'total': total_count,
            'admins': admin_count,
            'users': user_count
        }
    
    def save_users_batch(self, db: Session, users: List[Dict[str, Any]]):
        """批量保存用户"""
        # 清空现有用户
        db.query(User).delete()
        
        # 添加新用户
        for user_data in users:
            user = User(
                id=user_data['id'],
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password'],
                avatar=user_data.get('avatar'),
                role=UserRole(user_data.get('role', 'user')),
                register_time=datetime.fromisoformat(user_data['registerTime'].replace('Z', ''))
            )
            db.add(user)
        
        db.commit()
    
    def reset_user_password(self, db: Session, user_id: str, new_password: str) -> bool:
        """重置用户密码"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.password = new_password
        db.commit()
        return True

_user_service = None
# 单例获取函数，只在首次需要时创建实例
def get_user_service_singleton() -> UserService:
    """获取用户服务单例"""
    global _user_service
    if _user_service is None:
        _user_service = UserService()
    return _user_service
