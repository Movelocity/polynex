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
    Blog, BlogCreate, BlogUpdate, UserRole,
    Category, CategoryCreate, CategoryUpdate,
    SiteConfig, SiteConfigCreate, SiteConfigUpdate,
    LoginResponse, RegisterResponse,
    BatchUsersRequest, BatchBlogsRequest, BatchCategoriesRequest,
    ErrorResponse, UserStatsResponse, AdminUserUpdate, UserRoleUpdate, AdminPasswordReset
)
from database import db
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user_id, get_current_user_id_optional,
    ACCESS_TOKEN_EXPIRE_MINUTES, check_login_rate_limit,
    get_remaining_attempts, get_reset_time, record_login_attempt
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


# ===== 认证接口 =====

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(user_login: UserLogin):
    """用户登录"""
    # 检查登录速率限制
    if not check_login_rate_limit(user_login.email):
        remaining_attempts = get_remaining_attempts(user_login.email)
        reset_time = get_reset_time(user_login.email)
        
        error_detail = f"登录尝试过于频繁，每分钟最多允许6次登录尝试。"
        if reset_time:
            error_detail += f" 请在{reset_time}秒后重试。"
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_detail,
            headers={
                "X-RateLimit-Limit": "6",
                "X-RateLimit-Remaining": str(remaining_attempts),
                "X-RateLimit-Reset": str(reset_time) if reset_time else "0"
            }
        )
    
    # 记录登录尝试
    record_login_attempt(user_login.email)
    
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
        role=user_data['role'],
        registerTime=user_data['registerTime']
    )
    
    return LoginResponse(user=user_response, token=access_token)


@app.post("/api/auth/register", response_model=RegisterResponse)
async def register(user_create: UserCreate):
    """用户注册"""
    # 检查是否允许注册
    allow_registration = db.get_site_config_value('allow_registration', 'true')
    if allow_registration.lower() != 'true':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前不允许注册新用户"
        )
    
    # 检查是否需要邀请码
    require_invite_code = db.get_site_config_value('require_invite_code', 'false')
    if require_invite_code.lower() == 'true':
        invite_code = db.get_site_config_value('invite_code', '')
        # 这里应该有邀请码验证逻辑，但目前先跳过
        # 实际应用中可以在UserCreate模型中添加invite_code字段
        pass
    
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
        role=new_user['role'],
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
        role=user_data['role'],
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
            role=user['role'],
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
        role=user_data['role'],
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
        role=user_data['role'],
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
        role=user_data['role'],
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
    # 创建博客（不再需要传递用户名，数据库层会自动查询）
    new_blog = db.create_blog(blog_create, current_user_id)
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


# ===== 网站配置管理接口（管理员权限）=====

@app.get("/api/admin/site-config", response_model=List[SiteConfig])
async def get_site_configs(admin_user_id: str = Depends(require_admin_permission)):
    """获取所有网站配置（管理员）"""
    configs = db.get_all_site_configs()
    return configs


@app.get("/api/admin/site-config/{key}", response_model=SiteConfig)
async def get_site_config_by_key(key: str, admin_user_id: str = Depends(require_admin_permission)):
    """根据键获取网站配置（管理员）"""
    config = db.get_site_config_by_key(key)
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")
    return config


@app.put("/api/admin/site-config/{key}")
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


@app.post("/api/admin/site-config")
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


@app.delete("/api/admin/site-config/{key}")
async def delete_site_config(
    key: str,
    admin_user_id: str = Depends(require_admin_permission)
):
    """删除网站配置（管理员）"""
    success = db.delete_site_config(key)
    if not success:
        raise HTTPException(status_code=404, detail="配置不存在")
    return {"message": "配置删除成功"}


# ===== 管理员用户管理接口 =====

@app.get("/api/admin/users", response_model=List[UserResponse])
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


@app.get("/api/admin/users/stats", response_model=UserStatsResponse)
async def get_user_stats_by_admin(admin_user_id: str = Depends(require_admin_permission)):
    """获取用户统计数据（管理员权限）"""
    stats = db.get_user_stats()
    return UserStatsResponse(**stats)


@app.put("/api/admin/users/{user_id}/role")
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


@app.put("/api/admin/users/{user_id}")
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


@app.delete("/api/admin/users/{user_id}")
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


@app.put("/api/admin/users/{user_id}/password")
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


# ===== 开发者数据生成接口 =====

@app.post("/api/dev/generate-sample-data")
async def generate_sample_data(
    force: bool = False,
    admin_user_id: str = Depends(require_admin_permission)
):
    """生成示例数据（开发者/管理员使用）"""
    session = db._get_session()
    try:
        # 检查是否已有用户数据
        user_count = session.query(User).count()
        if user_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="已存在用户数据，如需强制生成请使用 force=true 参数"
            )
        
        # 如果force=true，清空现有数据
        if force:
            session.query(Blog).delete()
            session.query(User).delete()
        
        # 创建示例用户
        from auth import get_password_hash
        
        demo_user = User(
            id='demo-user-1',
            username='博客达人',
            email='demo@example.com',
            password=get_password_hash('demo123'),
            avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
            role=UserRole.ADMIN,
            register_time=datetime.fromisoformat('2024-01-01T00:00:00')
        )
        
        demo1_user = User(
            id='demo1-user-1',
            username='测试用户',
            email='demo1@example.com',
            password=get_password_hash('demo123'),
            avatar=None,
            role=UserRole.USER,
            register_time=datetime.fromisoformat('2024-01-01T00:00:00')
        )
        
        tech_user = User(
            id='tech-user-1',
            username='技术小白',
            email='tech@example.com',
            password=get_password_hash('tech123'),
            avatar='https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
            role=UserRole.USER,
            register_time=datetime.fromisoformat('2024-02-01T00:00:00')
        )
        
        session.add_all([demo_user, demo1_user, tech_user])
        
        # 创建示例博客
        sample_blog = Blog(
            id=db._generate_id(),
            title='FastAPI 快速入门指南',
            content='''# FastAPI 快速入门指南

FastAPI 是一个现代、快速的 Python Web 框架，用于构建 API。

## 主要特性

- **快速**: 非常高的性能，与 NodeJS 和 Go 相当
- **快速编码**: 提高功能开发速度约 200% 至 300%
- **更少 bug**: 减少约 40% 的人为（开发者）导致错误
- **直观**: 极佳的编辑器支持，自动补全无处不在，调试时间更短
- **简易**: 设计的易于使用和学习，阅读文档时间更短
- **简短**: 最小化代码重复，通过不同的参数声明实现丰富功能，bug 更少

## 安装

```bash
pip install fastapi
pip install "uvicorn[standard]"
```

## 创建第一个 API

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
```

这就是一个完整的 FastAPI 应用！''',
            summary='FastAPI 是一个现代、快速的 Python Web 框架，本文介绍了其主要特性和基本使用方法。',
            category='技术',
            tags=['Python', 'FastAPI', 'Web开发', 'API'],
            author_id='demo-user-1',
            create_time=datetime.fromisoformat('2024-06-20T10:00:00'),
            update_time=datetime.fromisoformat('2024-06-20T10:00:00'),
            status='published',
            views=42
        )
        session.add(sample_blog)
        
        session.commit()
        
        # 更新分类计数
        db.update_category_counts()
        
        return {
            "message": "示例数据生成成功",
            "users_created": 3,
            "blogs_created": 1
        }
        
    except Exception as e:
        session.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"数据生成失败：{str(e)}"
        )
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
