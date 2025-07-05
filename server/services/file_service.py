"""
文件服务模块

负责文件记录相关的数据库操作和文件业务逻辑
"""

from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
import uuid
import math
import os

from models.database import FileRecord


class FileService:
    """文件服务类"""
    
    # 文件存储配置
    UPLOAD_DIR = Path("uploads")
    THUMBNAIL_DIR = Path("uploads/.thumbnails")
    
    # 允许的文件扩展名
    ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"}
    ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS
    
    # 最大文件大小（50MB）
    MAX_FILE_SIZE = 50 * 1024 * 1024
    MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB
    
    THUMBNAIL_SIZE = (200, 200)  # Width, Height
    
    def __init__(self):
        super().__init__()
        # 确保目录存在
        self.UPLOAD_DIR.mkdir(exist_ok=True)
        self.THUMBNAIL_DIR.mkdir(exist_ok=True)
    
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
    
    def get_file_path(self, unique_id: str, extension: str, uploader_id: Optional[str] = None) -> Path:
        """获取文件的实际路径"""
        if uploader_id:
            # 用户文件夹下的文件
            user_dir = self.UPLOAD_DIR / uploader_id
            user_dir.mkdir(exist_ok=True)
            return user_dir / f"{unique_id}{extension}"
        else:
            # 主目录下的文件
            return self.UPLOAD_DIR / f"{unique_id}{extension}"
    
    def get_thumbnail_path(self, unique_id: str, extension: str) -> Path:
        """获取缩略图路径"""
        return self.THUMBNAIL_DIR / f"{unique_id}.jpg"
    
    def construct_thumbnail_url(self, unique_id: str) -> str:
        """构造缩略图URL"""
        return f"/api/resources/thumbnail/{unique_id}.jpg"
    
    def construct_file_url(self, unique_id: str, extension: str) -> str:
        """构造文件URL"""
        return f"/api/resources/{unique_id}{extension}"
    
    def generate_thumbnail(self, image_path: Path, thumbnail_path: Path) -> bool:
        """Generate a thumbnail for an image."""
        try:
            import cv2
            
            # Read the image
            img = cv2.imread(str(image_path))
            if img is None:
                return False

            # Get image dimensions
            height, width = img.shape[:2]

            # Crop to square from center
            if width > height:
                # Landscape image
                start_x = (width - height) // 2
                start_y = 0
                crop_size = height
            else:
                # Portrait image
                start_x = 0
                start_y = (height - width) // 2
                crop_size = width

            # Crop the image to a square
            cropped_img = img[start_y:start_y+crop_size, start_x:start_x+crop_size]

            # Resize the square image
            thumbnail = cv2.resize(cropped_img, self.THUMBNAIL_SIZE, interpolation=cv2.INTER_AREA)

            # Save the thumbnail
            cv2.imwrite(str(thumbnail_path), thumbnail)
            return True
        except Exception as e:
            print(f"Error generating thumbnail for {image_path}: {e}")
            return False
    
    async def create_thumbnail_if_needed(self, file_path: Path, unique_id: str, extension: str) -> Optional[bool]:
        """为图片创建缩略图（如果是图片的话）"""
        if extension.lower() in self.ALLOWED_IMAGE_EXTENSIONS:
            thumbnail_path = self.get_thumbnail_path(unique_id, extension)
            
            # 如果缩略图不存在，则生成
            if not thumbnail_path.exists():
                success = self.generate_thumbnail(file_path, thumbnail_path)
                if success:
                    return True
        
        return None
    
    def check_file_permission(self, file_record: Dict[str, Any], current_user_id: str, user_role: str) -> bool:
        """检查文件权限（删除权限）"""
        # 管理员可以删除任何文件
        if user_role == "admin":
            return True
        
        # 用户只能删除自己上传的文件
        return file_record.get('uploader_id') == current_user_id
    
    def validate_file_size(self, file_size: int, is_avatar: bool = False) -> bool:
        """验证文件大小"""
        max_size = self.MAX_AVATAR_SIZE if is_avatar else self.MAX_FILE_SIZE
        return file_size <= max_size
    
    def validate_file_extension(self, extension: str, is_avatar: bool = False) -> bool:
        """验证文件扩展名"""
        if is_avatar:
            return extension.lower() in self.ALLOWED_IMAGE_EXTENSIONS
        return extension.lower() in self.ALLOWED_EXTENSIONS
    
    def scan_uploads_folder(self, db: Session):
        """扫描上传文件夹，将未入库的文件导入数据库"""
        try:
            from .user_service import get_user_service_singleton
            user_service = get_user_service_singleton()
            files_to_import = []
            
            # 扫描主uploads目录（没有uploader的文件）
            for file_path in self.UPLOAD_DIR.glob("*"):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    unique_id = file_path.stem
                    extension = file_path.suffix
                    
                    # 检查数据库中是否已存在
                    existing = self.get_file_by_id(db, unique_id)
                    if not existing:
                        files_to_import.append({
                            'unique_id': unique_id,
                            'original_name': file_path.name,
                            'extension': extension,
                            'size': file_path.stat().st_size,
                            'upload_time': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat() + 'Z',
                            'uploader_id': None,  # 主目录文件没有uploader
                        })
            
            # 扫描用户文件夹（以uploader_id为文件夹名的文件）
            for user_dir in self.UPLOAD_DIR.iterdir():
                if user_dir.is_dir() and not user_dir.name.startswith('.'):
                    uploader_id = user_dir.name
                    
                    # 检查用户是否存在，如果不存在则忽略此文件夹
                    user_exists = user_service.get_user_by_id(db, uploader_id)
                    if not user_exists:
                        print(f"忽略文件夹 {uploader_id}：对应用户不存在")
                        continue
                    
                    for file_path in user_dir.glob("*"):
                        if file_path.is_file():
                            unique_id = file_path.stem
                            extension = file_path.suffix
                            
                            # 检查数据库中是否已存在
                            existing = self.get_file_by_id(db, unique_id)
                            if not existing:
                                files_to_import.append({
                                    'unique_id': unique_id,
                                    'original_name': file_path.name,
                                    'extension': extension,
                                    'size': file_path.stat().st_size,
                                    'upload_time': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat() + 'Z',
                                    'uploader_id': uploader_id
                                })
            
            # 批量导入到数据库
            if files_to_import:
                self.scan_and_import_files(db, files_to_import)
                print(f"导入了 {len(files_to_import)} 个文件记录到数据库")
                
        except Exception as e:
            print(f"扫描上传文件夹时出错: {e}")
    
    def save_uploaded_file(self, db: Session, file_contents: bytes, filename: str, uploader_id: str) -> Dict[str, Any]:
        """保存上传的文件并创建记录"""
        # 生成唯一文件名
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(filename)[1].lower()
        file_path = self.get_file_path(unique_id, file_extension, uploader_id)
        
        # 保存文件
        with open(file_path, "wb") as buffer:
            buffer.write(file_contents)
        
        # 记录到数据库
        file_data = {
            'unique_id': unique_id,
            'original_name': filename,
            'extension': file_extension,
            'size': len(file_contents),
            'upload_time': datetime.now().isoformat() + 'Z',
            'uploader_id': uploader_id
        }
        
        file_record = self.create_file_record(db, file_data)
        return file_record
    
    def delete_file_with_cleanup(self, db: Session, file_id: str, current_user_id: str, user_role: str = None) -> bool:
        """删除文件并清理文件系统"""
        file_record = self.get_file_by_id(db, file_id)
        
        if not file_record:
            return False
        
        # 检查权限（如果提供了用户角色）
        if user_role is not None and not self.check_file_permission(file_record, current_user_id, user_role):
            return False
        
        # 删除文件系统中的文件
        file_path = self.get_file_path(file_id, file_record['extension'], file_record.get('uploader_id'))
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # 删除缩略图
        if file_record['extension'].lower() in self.ALLOWED_IMAGE_EXTENSIONS:
            thumbnail_path = self.get_thumbnail_path(file_id, file_record['extension'])
            if thumbnail_path.exists():
                thumbnail_path.unlink()
        
        # 删除数据库记录
        return self.delete_file_record(db, file_id)
    
    def get_files_with_urls(self, db: Session, uploader_id: str, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """获取文件列表并包含URL信息"""
        result = self.get_files_by_uploader(db, uploader_id, page, page_size)
        
        files = []
        for file_record in result['files']:
            # 构造文件URL
            file_url = self.construct_file_url(file_record['unique_id'], file_record['extension'])
            
            # 为图片文件构造缩略图URL
            thumbnail_url = None
            if file_record['extension'].lower() in self.ALLOWED_IMAGE_EXTENSIONS:
                thumbnail_url = self.construct_thumbnail_url(file_record['unique_id'])
            
            files.append({
                "unique_id": file_record['unique_id'],
                "original_name": file_record['original_name'],
                "extension": file_record['extension'],
                "size": file_record['size'],
                "upload_time": file_record['upload_time'],
                "uploader_id": file_record['uploader_id'],
                "url": file_url,
                "thumbnail": thumbnail_url
            })
        
        return {
            "files": files,
            "pagination": result['pagination']
        }

    def create_file_record(self, db: Session, file_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建文件记录"""
        new_file = FileRecord(
            unique_id=file_data['unique_id'],
            original_name=file_data['original_name'],
            extension=file_data['extension'],
            size=file_data['size'],
            upload_time=datetime.fromisoformat(file_data['upload_time'].replace('Z', '')) if isinstance(file_data.get('upload_time'), str) else datetime.now(),
            uploader_id=file_data.get('uploader_id')
        )
        
        db.add(new_file)
        db.commit()
        
        return self._file_to_dict(new_file)
    
    def get_file_by_id(self, db: Session, unique_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取文件记录"""
        file_record = db.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
        return self._file_to_dict(file_record) if file_record else None
    
    def get_files_by_uploader(self, db: Session, uploader_id: str, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """根据上传者ID获取文件记录（分页）"""
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 查询总数
        total = db.query(FileRecord).filter(FileRecord.uploader_id == uploader_id).count()
        
        # 查询当前页数据
        files = db.query(FileRecord).filter(
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
    
    def get_all_files(self, db: Session) -> List[Dict[str, Any]]:
        """获取所有文件记录"""
        files = db.query(FileRecord).order_by(FileRecord.upload_time.desc()).all()
        return [self._file_to_dict(file_record) for file_record in files]
    
    def update_file_record(self, db: Session, unique_id: str, updates: Dict[str, Any]) -> bool:
        """更新文件记录"""
        file_record = db.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
        if not file_record:
            return False
        
        for key, value in updates.items():
            if hasattr(file_record, key):
                setattr(file_record, key, value)
        
        db.commit()
        return True
    
    def delete_file_record(self, db: Session, unique_id: str) -> bool:
        """删除文件记录"""
        file_record = db.query(FileRecord).filter(FileRecord.unique_id == unique_id).first()
        if not file_record:
            return False
        
        db.delete(file_record)
        db.commit()
        return True
    
    def scan_and_import_files(self, db: Session, files_data: List[Dict[str, Any]]):
        """批量导入文件记录（用于启动时扫描）"""
        for file_data in files_data:
            # 检查文件是否已存在
            existing = db.query(FileRecord).filter(FileRecord.unique_id == file_data['unique_id']).first()
            if not existing:
                new_file = FileRecord(
                    unique_id=file_data['unique_id'],
                    original_name=file_data['original_name'],
                    extension=file_data['extension'],
                    size=file_data['size'],
                    upload_time=datetime.fromisoformat(file_data['upload_time'].replace('Z', '')) if isinstance(file_data.get('upload_time'), str) else datetime.now(),
                    uploader_id=file_data.get('uploader_id')
                )
                db.add(new_file)
        
        db.commit()

_file_service = None
# 单例获取函数
def get_file_service_singleton() -> FileService:
    """获取文件服务单例"""
    global _file_service
    if _file_service is None:
        _file_service = FileService()
    return _file_service
