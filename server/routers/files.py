from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
import os
import uuid
import shutil

from models import UserResponse
from database import db
from auth import get_current_user_id

router = APIRouter(prefix="/api", tags=["文件管理"])

# 文件存储配置
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 允许的文件扩展名
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

# 最大文件大小（50MB）
MAX_FILE_SIZE = 50 * 1024 * 1024


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
    file_path = UPLOAD_DIR / f"{unique_id}{file_extension}"
    
    try:
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 获取文件信息
        file_info = {
            "unique_id": unique_id,
            "original_name": file.filename,
            "extension": file_extension,
            "size": os.path.getsize(file_path),
            "upload_time": datetime.utcnow().isoformat(),
            "uploader_id": current_user_id,
            "url": f"/api/resources/{unique_id}{file_extension}"
        }
        
        # 这里可以选择将文件信息保存到数据库
        # 目前先返回文件信息
        
        return {
            "message": "文件上传成功",
            "file": file_info
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
    file_path = UPLOAD_DIR / f"{unique_id}.{postfix}"
    
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
        filename=f"{unique_id}.{postfix}"
    )


@router.get("/resources/list")
async def list_user_files(current_user_id: str = Depends(get_current_user_id)):
    """获取当前用户上传的文件列表"""
    files = []
    
    # 遍历上传目录，找到属于当前用户的文件
    # 注意：这是一个简化的实现，实际项目中应该使用数据库存储文件元信息
    for file_path in UPLOAD_DIR.glob("*"):
        if file_path.is_file():
            unique_id = file_path.stem
            extension = file_path.suffix
            
            file_info = {
                "unique_id": unique_id,
                "extension": extension,
                "size": file_path.stat().st_size,
                "upload_time": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                "url": f"/api/resources/{unique_id}{extension}"
            }
            files.append(file_info)
    
    return {"files": files}


@router.delete("/resources/{unique_id}.{postfix}")
async def delete_file(
    unique_id: str, 
    postfix: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """删除文件"""
    file_path = UPLOAD_DIR / f"{unique_id}.{postfix}"
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    try:
        file_path.unlink()
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
    file_path = UPLOAD_DIR / f"{unique_id}{file_extension}"
    
    try:
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
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