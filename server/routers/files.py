from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
import os
import uuid
import shutil
import asyncio
from typing import Optional, List, Dict, Any

from models import UserResponse
from database import db
from auth import get_current_user_id

router = APIRouter(prefix="/api", tags=["文件管理"])

# 文件存储配置
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
THUMBNAIL_DIR = Path("uploads/.thumbnails")
THUMBNAIL_DIR.mkdir(exist_ok=True)

# 允许的文件扩展名
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

# 最大文件大小（50MB）
MAX_FILE_SIZE = 50 * 1024 * 1024

THUMBNAIL_SIZE = (200, 200)  # Width, Height

def scan_uploads_folder():
    """扫描上传文件夹，将未入库的文件导入数据库"""
    try:
        files_to_import = []
        
        # 扫描主uploads目录（没有uploader的文件）
        for file_path in UPLOAD_DIR.glob("*"):
            if file_path.is_file() and not file_path.name.startswith('.'):
                unique_id = file_path.stem
                extension = file_path.suffix
                
                # 检查数据库中是否已存在
                existing = db.get_file_by_id(unique_id)
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
        for user_dir in UPLOAD_DIR.iterdir():
            if user_dir.is_dir() and not user_dir.name.startswith('.'):
                uploader_id = user_dir.name
                
                # 检查用户是否存在，如果不存在则忽略此文件夹
                user_exists = db.get_user_by_id(uploader_id)
                if not user_exists:
                    print(f"忽略文件夹 {uploader_id}：对应用户不存在")
                    continue
                
                for file_path in user_dir.glob("*"):
                    if file_path.is_file():
                        unique_id = file_path.stem
                        extension = file_path.suffix
                        
                        # 检查数据库中是否已存在
                        existing = db.get_file_by_id(unique_id)
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
            db.scan_and_import_files(files_to_import)
            print(f"导入了 {len(files_to_import)} 个文件记录到数据库")
        
    except Exception as e:
        print(f"扫描上传文件夹时出错: {e}")

def get_file_path(unique_id: str, extension: str, uploader_id: Optional[str] = None) -> Path:
    """获取文件的实际路径"""
    if uploader_id:
        # 用户文件夹下的文件
        user_dir = UPLOAD_DIR / uploader_id
        user_dir.mkdir(exist_ok=True)
        return user_dir / f"{unique_id}{extension}"
    else:
        # 主目录下的文件
        return UPLOAD_DIR / f"{unique_id}{extension}"

def get_thumbnail_path(unique_id: str, extension: str) -> Path:
    """获取缩略图路径"""
    return THUMBNAIL_DIR / f"{unique_id}.jpg"

def construct_thumbnail_url(unique_id: str) -> str:
    """构造缩略图URL"""
    return f"/api/resources/thumbnail/{unique_id}.jpg"

def generate_thumbnail(image_path: Path, thumbnail_path: Path) -> bool:
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
        thumbnail = cv2.resize(cropped_img, THUMBNAIL_SIZE, interpolation=cv2.INTER_AREA)

        # Save the thumbnail
        cv2.imwrite(str(thumbnail_path), thumbnail)
        return True
    except Exception as e:
        print(f"Error generating thumbnail for {image_path}: {e}")
        return False

async def create_thumbnail_if_needed(file_path: Path, unique_id: str, extension: str) -> Optional[bool]:
    """为图片创建缩略图（如果是图片的话）"""
    if extension.lower() in ALLOWED_IMAGE_EXTENSIONS:
        thumbnail_path = get_thumbnail_path(unique_id, extension)
        
        # 如果缩略图不存在，则生成
        if not thumbnail_path.exists():
            success = generate_thumbnail(file_path, thumbnail_path)
            if success:
                return True
    
    return None

def check_file_permission(file_record: Dict[str, Any], current_user_id: str, user_role: str) -> bool:
    """检查文件权限（删除权限）"""
    # 管理员可以删除任何文件
    if user_role == "admin":
        return True
    
    # 用户只能删除自己上传的文件
    return file_record.get('uploader_id') == current_user_id

# 启动时扫描文件夹
scan_uploads_folder()

@router.post("/resources/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id)
):
    """上传文件"""
    # 检查文件大小
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小超过限制（最大 {MAX_FILE_SIZE // (1024 * 1024)}MB）"
        )
    
    # 检查文件扩展名
    file_extension = Path(file.filename or "").suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型。支持的类型：{', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # 生成唯一文件ID
    unique_id = str(uuid.uuid4())
    file_path = get_file_path(unique_id, file_extension, current_user_id)
    
    try:
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 生成缩略图（如果是图片）
        await create_thumbnail_if_needed(file_path, unique_id, file_extension)
        
        # 创建文件记录
        file_info = {
            "unique_id": unique_id,
            "original_name": file.filename,
            "extension": file_extension,
            "size": os.path.getsize(file_path),
            "upload_time": datetime.utcnow().isoformat() + 'Z',
            "uploader_id": current_user_id
        }
        
        # 保存到数据库
        db_record = db.create_file_record(file_info)
        
        # 为返回数据动态判断并构造缩略图URL
        if file_extension.lower() in ALLOWED_IMAGE_EXTENSIONS:
            thumbnail_path = get_thumbnail_path(unique_id, file_extension)
            if thumbnail_path.exists():
                db_record['thumbnail'] = construct_thumbnail_url(unique_id)
        
        return {
            "message": "文件上传成功",
            "file": db_record
        }
        
    except Exception as e:
        # 如果保存失败，删除已创建的文件
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件保存失败：{str(e)}"
        )

@router.get("/resources/{unique_id}.{postfix}")
async def get_file(unique_id: str, postfix: str):
    """获取文件（不需要认证）"""
    # 从数据库获取文件信息
    file_record = db.get_file_by_id(unique_id)
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    file_path = get_file_path(unique_id, f".{postfix}", file_record.get('uploader_id'))
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 根据文件扩展名设置适当的media_type
    extension = f".{postfix.lower()}"
    media_type = "application/octet-stream"  # 默认类型
    
    if extension in ALLOWED_IMAGE_EXTENSIONS:
        media_type_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", 
            ".png": "image/png",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
            ".webp": "image/webp"
        }
        media_type = media_type_map.get(extension, "image/jpeg")
    elif extension == ".pdf":
        media_type = "application/pdf"
    elif extension in {".txt", ".md"}:
        media_type = "text/plain"
    elif extension in {".doc", ".docx"}:
        media_type = "application/msword"
    
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_record.get('original_name', f"{unique_id}.{postfix}")
    )

@router.get("/resources/thumbnail/{unique_id}.jpg")
async def get_thumbnail(unique_id: str):
    """获取缩略图"""
    # 从数据库获取文件信息
    file_record = db.get_file_by_id(unique_id)
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 检查是否为图片文件
    if file_record['extension'].lower() not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只有图片文件才有缩略图"
        )
    
    thumbnail_path = get_thumbnail_path(unique_id, file_record['extension'])
    
    # 如果缩略图不存在，则临时生成
    if not thumbnail_path.exists():
        original_file_path = get_file_path(unique_id, file_record['extension'], file_record.get('uploader_id'))
        if original_file_path.exists():
            success = generate_thumbnail(original_file_path, thumbnail_path)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="缩略图生成失败"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="原始文件不存在"
            )
    
    return FileResponse(
        path=thumbnail_path,
        media_type="image/jpeg",
        filename=f"thumbnail_{unique_id}.jpg"
    )

@router.get("/resources/list")
async def list_user_files(current_user_id: str = Depends(get_current_user_id)):
    """获取当前用户上传的文件列表"""
    try:
        files = db.get_files_by_uploader(current_user_id)
        
        # 为每个文件动态判断并构造缩略图URL
        for file in files:
            if file['extension'].lower() in ALLOWED_IMAGE_EXTENSIONS:
                thumbnail_path = get_thumbnail_path(file['unique_id'], file['extension'])
                if thumbnail_path.exists():
                    file['thumbnail'] = construct_thumbnail_url(file['unique_id'])
        
        return {"files": files}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取文件列表失败：{str(e)}"
        )

@router.delete("/resources/{unique_id}.{postfix}")
async def delete_file(
    unique_id: str, 
    postfix: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """删除文件"""
    # 从数据库获取文件信息
    file_record = db.get_file_by_id(unique_id)
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 获取当前用户信息以检查权限
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在"
        )
    
    # 检查删除权限
    if not check_file_permission(file_record, current_user_id, user_data['role']):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限删除此文件"
        )
    
    try:
        # 删除物理文件
        file_path = get_file_path(unique_id, f".{postfix}", file_record.get('uploader_id'))
        if file_path.exists():
            file_path.unlink()
        
        # 删除缩略图（如果存在）
        if file_record['extension'].lower() in ALLOWED_IMAGE_EXTENSIONS:
            thumbnail_path = get_thumbnail_path(unique_id, file_record['extension'])
            if thumbnail_path.exists():
                thumbnail_path.unlink()
        
        # 从数据库删除记录
        db.delete_file_record(unique_id)
        
        return {"message": "文件删除成功"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件删除失败：{str(e)}"
        )

@router.post("/users/avatar/upload")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id)
):
    """上传用户头像"""
    # 检查文件大小（头像限制更小一些）
    MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB
    if file.size and file.size > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"头像文件大小超过限制（最大 {MAX_AVATAR_SIZE // (1024 * 1024)}MB）"
        )
    
    # 检查文件扩展名（只允许图片）
    file_extension = Path(file.filename or "").suffix.lower()
    if file_extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"头像只支持图片格式：{', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # 生成唯一文件ID
    unique_id = str(uuid.uuid4())
    file_path = get_file_path(unique_id, file_extension, current_user_id)
    
    try:
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 生成缩略图
        await create_thumbnail_if_needed(file_path, unique_id, file_extension)
        
        # 创建文件记录
        file_info = {
            "unique_id": unique_id,
            "original_name": file.filename,
            "extension": file_extension,
            "size": os.path.getsize(file_path),
            "upload_time": datetime.utcnow().isoformat() + 'Z',
            "uploader_id": current_user_id
        }
        
        # 保存到数据库
        db.create_file_record(file_info)
        
        # 构建头像URL
        avatar_url = f"/api/resources/{unique_id}{file_extension}"
        
        # 更新用户头像
        success = db.update_user(current_user_id, {'avatar': avatar_url})
        if not success:
            # 如果更新失败，删除已上传的文件
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        # 获取更新后的用户信息
        user_data = db.get_user_by_id(current_user_id)
        
        return {
            "message": "头像上传成功",
            "avatar_url": avatar_url,
            "user": UserResponse(
                id=user_data['id'],
                username=user_data['username'],
                email=user_data['email'],
                avatar=user_data.get('avatar'),
                role=user_data['role'],
                registerTime=user_data['registerTime']
            )
        }
        
    except Exception as e:
        # 如果保存失败，删除已创建的文件
        if file_path.exists():
            file_path.unlink()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"头像上传失败：{str(e)}"
        ) 