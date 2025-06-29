"""
配置服务模块

负责网站配置相关的数据库操作
"""

from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from models.database import SiteConfig


class ConfigService:
    """配置服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _config_to_dict(self, config: SiteConfig) -> Dict[str, Any]:
        """将SiteConfig对象转换为字典"""
        return {
            'id': config.id,
            'key': config.key,
            'value': config.value,
            'description': config.description,
            'createTime': config.create_time.isoformat() + 'Z',
            'updateTime': config.update_time.isoformat() + 'Z'
        }
    
    def get_all_site_configs(self) -> List[Dict[str, Any]]:
        """获取所有网站配置"""
        configs = self.db.query(SiteConfig).all()
        return [self._config_to_dict(config) for config in configs]
    
    def get_site_config_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        """根据键获取网站配置"""
        config = self.db.query(SiteConfig).filter(SiteConfig.key == key).first()
        return self._config_to_dict(config) if config else None
    
    def get_site_config_value(self, key: str, default: str = None) -> Optional[str]:
        """获取网站配置值"""
        config = self.db.query(SiteConfig).filter(SiteConfig.key == key).first()
        return config.value if config else default
    
    def update_site_config(self, key: str, value: str, description: str = None) -> bool:
        """更新或创建网站配置"""
        config = self.db.query(SiteConfig).filter(SiteConfig.key == key).first()
        
        if config:
            # 更新现有配置
            config.value = value
            if description is not None:
                config.description = description
            config.update_time = datetime.utcnow()
        else:
            # 创建新配置
            config = SiteConfig(
                id=self._generate_id(),
                key=key,
                value=value,
                description=description or "",
                create_time=datetime.utcnow(),
                update_time=datetime.utcnow()
            )
            self.db.add(config)
        
        self.db.commit()
        return True
    
    def delete_site_config(self, key: str) -> bool:
        """删除网站配置"""
        config = self.db.query(SiteConfig).filter(SiteConfig.key == key).first()
        if not config:
            return False
        
        self.db.delete(config)
        self.db.commit()
        return True
    
    def initialize_default_configs(self):
        """初始化默认配置"""
        # 检查是否已有配置数据
        if self.db.query(SiteConfig).count() > 0:
            return
        
        # 创建默认网站配置
        default_configs = [
            SiteConfig(
                id=self._generate_id(),
                key='allow_registration',
                value='true',
                description='是否允许用户注册',
                create_time=datetime.utcnow(),
                update_time=datetime.utcnow()
            ),
            SiteConfig(
                id=self._generate_id(),
                key='require_invite_code',
                value='false',
                description='注册是否需要邀请码',
                create_time=datetime.utcnow(),
                update_time=datetime.utcnow()
            ),
            SiteConfig(
                id=self._generate_id(),
                key='invite_code',
                value='',
                description='邀请码内容',
                create_time=datetime.utcnow(),
                update_time=datetime.utcnow()
            )
        ]
        
        self.db.add_all(default_configs)
        self.db.commit() 