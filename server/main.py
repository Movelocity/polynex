from fastapi import FastAPI, HTTPException, status, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from datetime import timedelta, datetime
import os
import uuid
import shutil
from pathlib import Path

from models import (
    User, UserCreate, UserUpdate, UserLogin, UserResponse,
    Blog, BlogCreate, BlogUpdate,
    Category, CategoryCreate, CategoryUpdate,
    LoginResponse, RegisterResponse,
    BatchUsersRequest, BatchBlogsRequest, BatchCategoriesRequest,
    ErrorResponse
)
from database import db
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user_id, get_current_user_id_optional,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

app = FastAPI(
    title="博客平台 API",
    description="一个简单的博客平台后端 API",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # 前端开发服务器地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 文件存储配置
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 允许的文件扩展名
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_DOCUMENT_EXTENSIONS

# 最大文件大小（50MB）
MAX_FILE_SIZE = 50 * 1024 * 1024


# ===== 认证接口 =====

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(user_login: UserLogin):
    """用户登录"""
    user_data = db.get_user_by_email(user_login.email)
    
    if not user_data or not verify_password(user_login.password, user_data['password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data['id']}, expires_delta=access_token_expires
    )
    
    # 返回用户信息（不包含密码）
    user_response = UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        registerTime=user_data['registerTime']
    )
    
    return LoginResponse(user=user_response, token=access_token)


@app.post("/api/auth/register", response_model=RegisterResponse)
async def register(user_create: UserCreate):
    """用户注册"""
    # 检查邮箱是否已存在
    existing_user = db.get_user_by_email(user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 检查用户名是否已存在
    existing_username = db.get_user_by_username(user_create.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被使用"
        )
    
    # 加密密码
    hashed_password = get_password_hash(user_create.password)
    user_create.password = hashed_password
    
    # 创建用户
    new_user = db.create_user(user_create)
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user['id']}, expires_delta=access_token_expires
    )
    
    # 返回用户信息（不包含密码）
    user_response = UserResponse(
        id=new_user['id'],
        username=new_user['username'],
        email=new_user['email'],
        avatar=new_user.get('avatar'),
        registerTime=new_user['registerTime']
    )
    
    return RegisterResponse(user=user_response, token=access_token)


@app.post("/api/auth/logout")
async def logout(current_user_id: str = Depends(get_current_user_id)):
    """用户登出"""
    # 在简单实现中，登出只需要客户端删除令牌
    # 在生产环境中，可能需要将令牌加入黑名单
    return {"message": "登出成功"}


@app.get("/api/auth/validate", response_model=UserResponse)
async def validate_token(current_user_id: str = Depends(get_current_user_id)):
    """验证JWT token并返回当前用户信息"""
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        registerTime=user_data['registerTime']
    )


@app.put("/api/auth/password")
async def update_password(
    password_data: dict,
    current_user_id: str = Depends(get_current_user_id)
):
    """更新用户密码"""
    current_password = password_data.get('currentPassword')
    new_password = password_data.get('newPassword')
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码和新密码都不能为空"
        )
    
    # 获取用户信息
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 验证当前密码
    if not verify_password(current_password, user_data['password']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误"
        )
    
    # 更新密码
    hashed_new_password = get_password_hash(new_password)
    success = db.update_user(current_user_id, {'password': hashed_new_password})
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="密码更新失败"
        )
    
    return {"message": "密码更新成功"}


# ===== 用户接口 =====

@app.get("/api/users", response_model=List[UserResponse])
async def get_users(current_user_id: str = Depends(get_current_user_id)):
    """获取所有用户"""
    users = db.get_all_users()
    return [
        UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            avatar=user.get('avatar'),
            registerTime=user['registerTime']
        )
        for user in users
    ]


@app.get("/api/users/current", response_model=UserResponse)
async def get_current_user(current_user_id: str = Depends(get_current_user_id)):
    """获取当前用户"""
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        registerTime=user_data['registerTime']
    )


@app.get("/api/users/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(email: str):
    """根据邮箱查找用户"""
    user_data = db.get_user_by_email(email)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        registerTime=user_data['registerTime']
    )


@app.get("/api/users/by-username/{username}", response_model=UserResponse)
async def get_user_by_username(username: str):
    """根据用户名查找用户"""
    user_data = db.get_user_by_username(username)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return UserResponse(
        id=user_data['id'],
        username=user_data['username'],
        email=user_data['email'],
        avatar=user_data.get('avatar'),
        registerTime=user_data['registerTime']
    )


@app.post("/api/users", status_code=201)
async def create_user(user_create: UserCreate, current_user_id: str = Depends(get_current_user_id)):
    """创建用户"""
    # 检查邮箱是否已存在
    existing_user = db.get_user_by_email(user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )
    
    # 加密密码
    hashed_password = get_password_hash(user_create.password)
    user_create.password = hashed_password
    
    # 创建用户
    db.create_user(user_create)
    return {"message": "用户创建成功"}


@app.put("/api/users/{user_id}")
async def update_user(
    user_id: str, 
    user_update: UserUpdate, 
    current_user_id: str = Depends(get_current_user_id)
):
    """更新用户"""
    # 只允许用户更新自己的信息
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能更新自己的信息"
        )
    
    # 如果更新密码，需要加密
    updates = user_update.dict(exclude_unset=True)
    if 'password' in updates:
        updates['password'] = get_password_hash(updates['password'])
    
    success = db.update_user(user_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {"message": "用户信息更新成功"}


@app.post("/api/users/batch")
async def save_users_batch(
    batch_request: BatchUsersRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """批量保存用户"""
    users_data = [user.model_dump() for user in batch_request.users]
    db.save_users_batch(users_data)
    return {"message": "用户批量保存成功"}


# ===== 博客接口 =====

@app.get("/api/blogs", response_model=List[Blog])
async def get_blogs():
    """获取所有博客"""
    blogs = db.get_all_blogs()
    return blogs


@app.get("/api/blogs/published", response_model=List[Blog])
async def get_published_blogs():
    """获取已发布博客"""
    blogs = db.get_published_blogs()
    return blogs


@app.get("/api/blogs/{blog_id}", response_model=Blog)
async def get_blog_by_id(blog_id: str):
    """根据ID获取博客"""
    blog = db.get_blog_by_id(blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="博客不存在")
    return blog


@app.get("/api/blogs/author/{author_id}", response_model=List[Blog])
async def get_blogs_by_author(author_id: str):
    """根据作者获取博客"""
    blogs = db.get_blogs_by_author(author_id)
    return blogs


@app.get("/api/blogs/category/{category}", response_model=List[Blog])
async def get_blogs_by_category(category: str):
    """根据分类获取博客"""
    blogs = db.get_blogs_by_category(category)
    return blogs


@app.get("/api/blogs/search", response_model=List[Blog])
async def search_blogs(q: str):
    """搜索博客"""
    blogs = db.search_blogs(q)
    return blogs


@app.post("/api/blogs", response_model=Blog, status_code=201)
async def create_blog(
    blog_create: BlogCreate,
    current_user_id: str = Depends(get_current_user_id)
):
    """创建博客"""
    # 获取当前用户信息
    user_data = db.get_user_by_id(current_user_id)
    if not user_data:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 创建博客
    new_blog = db.create_blog(blog_create, current_user_id, user_data['username'])
    return new_blog


@app.put("/api/blogs/{blog_id}", response_model=Blog)
async def update_blog(
    blog_id: str,
    blog_update: BlogUpdate,
    current_user_id: str = Depends(get_current_user_id)
):
    """更新博客"""
    # 检查博客是否存在
    existing_blog = db.get_blog_by_id(blog_id)
    if not existing_blog:
        raise HTTPException(status_code=404, detail="博客不存在")

    # 检查是否是博客作者
    if existing_blog['authorId'] != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能更新自己的博客"
        )

    # 更新博客
    updates = blog_update.model_dump(exclude_unset=True)
    success = db.update_blog(blog_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="博客不存在")

    # 返回更新后的博客
    updated_blog = db.get_blog_by_id(blog_id)
    return updated_blog


@app.delete("/api/blogs/{blog_id}")
async def delete_blog(
    blog_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """删除博客"""
    # 检查博客是否存在
    existing_blog = db.get_blog_by_id(blog_id)
    if not existing_blog:
        raise HTTPException(status_code=404, detail="博客不存在")

    # 检查是否是博客作者
    if existing_blog['authorId'] != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己的博客"
        )

    # 删除博客
    success = db.delete_blog(blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="博客不存在")

    return {"message": "博客删除成功"}


@app.post("/api/blogs/{blog_id}/views")
async def increment_blog_views(blog_id: str):
    """增加博客浏览量"""
    success = db.increment_blog_views(blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="博客不存在")

    return {"message": "浏览量增加成功"}


@app.post("/api/blogs/batch")
async def save_blogs_batch(
    batch_request: BatchBlogsRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """批量保存博客"""
    blogs_data = [blog.model_dump() for blog in batch_request.blogs]
    db.save_blogs_batch(blogs_data)
    return {"message": "博客批量保存成功"}


# ===== 分类接口 =====

@app.get("/api/categories", response_model=List[Category])
async def get_categories():
    """获取所有分类"""
    categories = db.get_all_categories()
    return categories


@app.get("/api/categories/{name}", response_model=Category)
async def get_category_by_name(name: str):
    """根据名称获取分类"""
    category = db.get_category_by_name(name)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return category


@app.post("/api/categories", response_model=Category, status_code=201)
async def create_category(
    category_create: CategoryCreate,
    current_user_id: str = Depends(get_current_user_id)
):
    """创建分类"""
    # 检查分类名是否已存在
    existing_category = db.get_category_by_name(category_create.name)
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类名已存在"
        )

    new_category = db.create_category(category_create)
    return new_category


@app.put("/api/categories/{category_id}")
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_user_id: str = Depends(get_current_user_id)
):
    """更新分类"""
    updates = category_update.model_dump(exclude_unset=True)
    success = db.update_category(category_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="分类不存在")

    return {"message": "分类更新成功"}


@app.delete("/api/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """删除分类"""
    success = db.delete_category(category_id)
    if not success:
        raise HTTPException(status_code=404, detail="分类不存在")

    return {"message": "分类删除成功"}


@app.put("/api/categories/counts")
async def update_category_counts(current_user_id: str = Depends(get_current_user_id)):
    """更新分类计数"""
    db.update_category_counts()
    return {"message": "分类计数更新成功"}


@app.post("/api/categories/batch")
async def save_categories_batch(
    batch_request: BatchCategoriesRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """批量保存分类"""
    categories_data = [category.model_dump() for category in batch_request.categories]
    db.save_categories_batch(categories_data)
    return {"message": "分类批量保存成功"}


# ===== 文件存储接口 =====

@app.post("/api/resources/upload")
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


@app.get("/api/resources/{unique_id}.{postfix}")
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


@app.get("/api/resources/list")
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


@app.delete("/api/resources/{unique_id}.{postfix}")
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


@app.post("/api/users/avatar/upload")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
