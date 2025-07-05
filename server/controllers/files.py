from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
import os
import uuid
import shutil
from typing import List
from sqlalchemy.orm import Session
import mimetypes

from fields.schemas import UserResponse, FileInfo, PaginatedResponse
from services import get_user_service_singleton, get_file_service_singleton, FileService, UserService
from models.database import get_db
from libs.auth import get_current_user_id

router = APIRouter(prefix="/api/resources", tags=["文件管理"])

def init_file_system():
    """初始化文件系统（启动时调用）"""
    try:
        from models.database import SessionLocal
        
        # 创建数据库会话
        db_session = SessionLocal()
        try:
            file_service = get_file_service_singleton()
            file_service.scan_uploads_folder(db_session)
        finally:
            db_session.close()
        
    except Exception as e:
        print(f"初始化文件系统时出错: {e}")

# 启动时初始化文件系统
init_file_system()

@router.post("/upload", response_model=FileInfo)
async def upload_file(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """上传文件"""
    # 读取文件内容
    contents = await file.read()
    
    # 检查文件大小
    if not file_service.validate_file_size(len(contents)):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件大小不能超过 {file_service.MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # 检查文件扩展名
    file_extension = os.path.splitext(file.filename)[1].lower()
    if not file_service.validate_file_extension(file_extension):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {file_extension}"
        )
    
    # 保存文件
    file_record = file_service.save_uploaded_file(db, contents, file.filename, current_user_id)
    
    return FileInfo(
        uniqueId=file_record['unique_id'],
        originalName=file_record['original_name'],
        extension=file_record['extension'],
        size=file_record['size'],
        uploadTime=file_record['upload_time'],
        uploaderId=file_record['uploader_id']
    )

@router.get("/list")
async def get_file_list(
    page: int = 1,
    page_size: int = 10,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """获取用户上传的文件列表（分页）- 兼容前端调用"""
    result = file_service.get_files_with_urls(db, current_user_id, page, page_size)
    
    return {
        "files": result['files'],
        "pagination": result['pagination']
    }

@router.get("/thumbnail/{file_id}")
async def get_thumbnail(
    file_id: str,
    db: Session = Depends(get_db),
    file_service = Depends(get_file_service_singleton)
):
    """获取文件缩略图"""
    # 从file_id中提取unique_id (去除.jpg后缀)
    unique_id = file_id.replace('.jpg', '')
    thumbnail_path = file_service.get_thumbnail_path(unique_id, '.jpg')
    
    if not thumbnail_path.exists():
        raise HTTPException(status_code=404, detail="缩略图不存在")
    
    return FileResponse(
        path=thumbnail_path,
        media_type="image/jpeg"
    )

@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """下载文件"""
    file_record = file_service.get_file_by_id(db, file_id)
    
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    file_path = file_service.get_file_path(file_id, file_record['extension'], file_record.get('uploader_id'))
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 确定MIME类型
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        filename=file_record['original_name'],
        media_type=mime_type
    )

@router.get("/my-files")
async def get_my_files(
    page: int = 1,
    page_size: int = 10,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """获取用户上传的文件列表（分页）"""
    result = file_service.get_files_by_uploader(db, current_user_id, page, page_size)
    
    files = [
        FileInfo(
            uniqueId=file_record['unique_id'],
            originalName=file_record['original_name'],
            extension=file_record['extension'],
            size=file_record['size'],
            uploadTime=file_record['upload_time'],
            uploaderId=file_record['uploader_id']
        )
        for file_record in result['files']
    ]
    
    return PaginatedResponse(
        items=files,
        pagination=result['pagination']
    )

@router.get("", response_model=List[FileInfo])
async def get_all_files(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """获取所有文件（管理员权限）"""
    # 这里可以添加管理员权限检查
    files = file_service.get_all_files(db)
    
    return [
        FileInfo(
            uniqueId=file_record['unique_id'],
            originalName=file_record['original_name'],
            extension=file_record['extension'],
            size=file_record['size'],
            uploadTime=file_record['upload_time'],
            uploaderId=file_record['uploader_id']
        )
        for file_record in files
    ]

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """删除文件"""
    file_record = file_service.get_file_by_id(db, file_id)
    
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 检查权限：只能删除自己的文件
    if file_record['uploader_id'] != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己的文件"
        )
    
    # 删除文件
    success = file_service.delete_file_with_cleanup(db, file_id, current_user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="文件删除失败")
    
    return {"message": "文件删除成功"}

@router.post("/user-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton),
    user_service: UserService = Depends(get_user_service_singleton)
):
    """上传用户头像"""
    # 检查文件大小（头像限制更小一些）
    if file.size and not file_service.validate_file_size(file.size, is_avatar=True):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"头像文件大小超过限制（最大 {file_service.MAX_AVATAR_SIZE // (1024 * 1024)}MB）"
        )
    
    # 检查文件扩展名（只允许图片）
    file_extension = Path(file.filename or "").suffix.lower()
    if not file_service.validate_file_extension(file_extension, is_avatar=True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"头像只支持图片格式：{', '.join(file_service.ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # 生成唯一文件ID
    unique_id = str(uuid.uuid4())
    file_path = file_service.get_file_path(unique_id, file_extension, current_user_id)
    
    try:
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 生成缩略图
        await file_service.create_thumbnail_if_needed(file_path, unique_id, file_extension)
        
        # 创建文件记录
        file_info = {
            "unique_id": unique_id,
            "original_name": file.filename,
            "extension": file_extension,
            "size": os.path.getsize(file_path),
            "upload_time": datetime.now().isoformat() + 'Z',
            "uploader_id": current_user_id
        }
        
        # 保存到数据库
        file_service.create_file_record(db, file_info)
        
        # 构建头像URL
        avatar_url = file_service.construct_file_url(unique_id, file_extension)
        
        # 更新用户头像
        success = user_service.update_user(db, current_user_id, {'avatar': avatar_url})
        if not success:
            # 如果更新失败，删除已上传的文件
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        # 获取更新后的用户信息
        user_data = user_service.get_user_by_id(db, current_user_id)
        
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

@router.get("/{file_id}")
async def get_file_direct(
    file_id: str,
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service_singleton)
):
    """直接访问文件 - 格式: unique_id.extension"""
    # 解析文件ID和扩展名
    if '.' not in file_id:
        raise HTTPException(status_code=400, detail="无效的文件ID格式")
    
    unique_id, extension = file_id.rsplit('.', 1)
    extension = '.' + extension
    
    file_record = file_service.get_file_by_id(db, unique_id)
    
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    file_path = file_service.get_file_path(unique_id, extension, file_record.get('uploader_id'))
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 确定MIME类型
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        media_type=mime_type
    )

 