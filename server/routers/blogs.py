from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from models import (
    Blog, BlogSummary, BlogCreate, BlogUpdate,
    BatchBlogsRequest
)
from database import db
from auth import get_current_user_id

router = APIRouter(prefix="/api/blogs", tags=["博客管理"])


@router.get("", response_model=List[BlogSummary])
async def get_blogs():
    """获取所有博客摘要（不包含content）"""
    blogs = db.get_all_blogs_summary()
    return blogs


@router.get("/published", response_model=List[BlogSummary])
async def get_published_blogs():
    """获取已发布博客摘要（不包含content）"""
    blogs = db.get_published_blogs_summary()
    return blogs


# 重要：具体路由必须放在通用路由 /{blog_id} 之前！
# 原因：FastAPI按照路由定义顺序进行匹配，如果 /{blog_id} 在前面，
# 访问 /search 时会被匹配为 blog_id="search"，导致查找不存在的博客而返回404
@router.get("/search", response_model=List[BlogSummary])
async def search_blogs(q: str):
    """搜索博客摘要（不包含content）"""
    blogs = db.search_blogs_summary(q)
    return blogs


@router.get("/author/{author_id}", response_model=List[BlogSummary])
async def get_blogs_by_author(author_id: str):
    """根据作者获取博客摘要（不包含content）"""
    blogs = db.get_blogs_by_author_summary(author_id)
    return blogs


@router.get("/category/{category}", response_model=List[BlogSummary])
async def get_blogs_by_category(category: str):
    """根据分类获取博客摘要（不包含content）"""
    blogs = db.get_blogs_by_category_summary(category)
    return blogs


# 通用路由放在最后，避免误匹配具体路由
@router.get("/{blog_id}", response_model=Blog)
async def get_blog_by_id(blog_id: str):
    """根据ID获取博客完整内容"""
    blog = db.get_blog_by_id(blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="博客不存在")
    return blog


@router.post("", response_model=Blog, status_code=201)
async def create_blog(
    blog_create: BlogCreate,
    current_user_id: str = Depends(get_current_user_id)
):
    """创建博客"""
    # 创建博客（不再需要传递用户名，数据库层会自动查询）
    new_blog = db.create_blog(blog_create, current_user_id)
    return new_blog


@router.put("/{blog_id}", response_model=Blog)
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


@router.delete("/{blog_id}")
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


@router.post("/{blog_id}/views")
async def increment_blog_views(blog_id: str):
    """增加博客浏览量"""
    success = db.increment_blog_views(blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="博客不存在")

    return {"message": "浏览量增加成功"}


@router.post("/batch")
async def save_blogs_batch(
    batch_request: BatchBlogsRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """批量保存博客"""
    blogs_data = [blog.model_dump() for blog in batch_request.blogs]
    db.save_blogs_batch(blogs_data)
    return {"message": "博客批量保存成功"} 