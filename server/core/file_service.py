"""
文件服务模块

负责文件记录相关的数据库操作
"""

from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import math

from models.database import FileRecord


class FileService:
    """文件服务类"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_id(self) -> str:
        """生成唯一ID"""
        return str(uuid.uuid4())
    
    def _file_to_dict(self, file_record: FileRecord) -> Dict[str, Any]:
        """将FileRecord对象转换为字典"""
        return {
            'unique_id': file_record.unique_id,
            'original_name': file_record.original_name,
            'extension': file_record.extension,
            'size': file_record.size,
            'upload_time': file_record.upload_time.isoformat() + 'Z',
            'uploader_id': file_record.uploader_id
        }
    
    def create_file_record(self, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建文件记录"""
        new_file = FileRecord(
            unique_id=file_data['unique_id'],
            original_name=file_data['original_name'],
            extension=file_data['extension'],
            size=file_data['size'],
            upload_time=datetime.fromisoformat(file_data['upload_time'].replace('Z', '')) if isinstance(file_data.get('upload_time'), str) else datetime.utcnow(),
            uploader_id=file_data.get('uploader_id')
        )
        
        self.db.add(new_file)
        self.db.commit()
        
        return self._file_to_dict(new_file)
    
    def get_file_by_id(self, unique_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取文件记录"""
        file_record = self.db.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
        return self._file_to_dict(file_record) if file_record else None
    
    def get_files_by_uploader(self, uploader_id: str, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """根据上传者ID获取文件记录（分页）"""
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 查询总数
        total = self.db.query(FileRecord).filter(FileRecord.uploader_id == uploader_id).count()
        
        # 查询当前页数据
        files = self.db.query(FileRecord).filter(
            FileRecord.uploader_id == uploader_id
        ).order_by(
            FileRecord.upload_time.desc()
        ).offset(offset).limit(page_size).all()
        
        # 计算总页数
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return {
            'files': [self._file_to_dict(file_record) for file_record in files],
            'pagination': {
                'current_page': page,
                'page_size': page_size,
                'total_items': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
    
    def get_all_files(self) -> List[Dict[str, Any]]:
        """获取所有文件记录"""
        files = self.db.query(FileRecord).order_by(FileRecord.upload_time.desc()).all()
        return [self._file_to_dict(file_record) for file_record in files]
    
    def update_file_record(self, unique_id: str, updates: Dict[str, Any]) -> bool:
        """更新文件记录"""
        file_record = self.db.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
        if not file_record:
            return False
        
        for key, value in updates.items():
            if hasattr(file_record, key):
                setattr(file_record, key, value)
        
        self.db.commit()
        return True
    
    def delete_file_record(self, unique_id: str) -> bool:
        """删除文件记录"""
        file_record = self.db.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
        if not file_record:
            return False
        
        self.db.delete(file_record)
        self.db.commit()
        return True
    
    def scan_and_import_files(self, files_data: List[Dict[str, Any]]):
        """批量导入文件记录（用于启动时扫描）"""
        for file_data in files_data:
            # 检查文件是否已存在
            existing = self.db.query(FileRecord).filter(FileRecord.unique_id == file_data['unique_id']).first()
            if not existing:
                new_file = FileRecord(
                    unique_id=file_data['unique_id'],
                    original_name=file_data['original_name'],
                    extension=file_data['extension'],
                    size=file_data['size'],
                    upload_time=datetime.fromisoformat(file_data['upload_time'].replace('Z', '')) if isinstance(file_data.get('upload_time'), str) else datetime.utcnow(),
                    uploader_id=file_data.get('uploader_id')
                )
                self.db.add(new_file)
        
        self.db.commit() 