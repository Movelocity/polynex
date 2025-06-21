from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import timedelta

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
