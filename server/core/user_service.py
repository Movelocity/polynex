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
    
    def __init__(self, db: Session):
        self.db = db
    
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
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """获取所有用户"""
        users = self.db.query(User).all()
        return [self._user_to_dict(user) for user in users]
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户"""
        user = self.db.query(User).filter(User.id == user_id).first()
        return self._user_to_dict(user) if user else None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取用户"""
        user = self.db.query(User).filter(User.email == email).first()
        return self._user_to_dict(user) if user else None
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名获取用户"""
        user = self.db.query(User).filter(User.username == username).first()
        return self._user_to_dict(user) if user else None
    
    def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """创建新用户"""
        # 检查是否是第一个用户（自动设为管理员）
        user_count = self.db.query(User).count()
        role = UserRole.ADMIN if user_count == 0 else UserRole.USER
        
        new_user = User(
            id=self._generate_id(),
            username=user_data.username,
            email=user_data.email,
            password=user_data.password,
            avatar=user_data.avatar,
            role=role,
            register_time=datetime.utcnow()
        )
        
        self.db.add(new_user)
        self.db.commit()
        
        return self._user_to_dict(new_user)
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """更新用户信息"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        for key, value in updates.items():
            if hasattr(user, key.replace('Time', '_time')):  # 处理registerTime字段
                attr_name = key.replace('Time', '_time') if 'Time' in key else key
                setattr(user, attr_name, value)
        
        self.db.commit()
        return True
    
    def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        self.db.delete(user)
        self.db.commit()
        return True
    
    def update_user_role(self, user_id: str, role: str) -> bool:
        """更新用户角色"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # 验证角色值
        if role not in ['admin', 'user']:
            raise ValueError("无效的角色类型")
        
        user.role = UserRole(role)
        self.db.commit()
        return True
    
    def get_user_stats(self) -> Dict[str, int]:
        """获取用户统计数据"""
        total_count = self.db.query(User).count()
        admin_count = self.db.query(User).filter(User.role == UserRole.ADMIN).count()
        user_count = self.db.query(User).filter(User.role == UserRole.USER).count()
        
        return {
            'total': total_count,
            'admins': admin_count,
            'users': user_count
        }
    
    def save_users_batch(self, users: List[Dict[str, Any]]):
        """批量保存用户"""
        # 清空现有用户
        self.db.query(User).delete()
        
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
            self.db.add(user)
        
        self.db.commit()
    
    def reset_user_password(self, user_id: str, new_password: str) -> bool:
        """重置用户密码"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        user.password = new_password
        self.db.commit()
        return True 