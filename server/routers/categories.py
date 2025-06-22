from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from models import (
    Category, CategoryCreate, CategoryUpdate,
    BatchCategoriesRequest
)
from database import db
from auth import get_current_user_id

router = APIRouter(prefix="/api/categories", tags=["分类管理"])


@router.get("", response_model=List[Category])
async def get_categories():
    """获取所有分类"""
    categories = db.get_all_categories()
    return categories


@router.get("/{name}", response_model=Category)
async def get_category_by_name(name: str):
    """根据名称获取分类"""
    category = db.get_category_by_name(name)
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return category


@router.post("", response_model=Category, status_code=201)
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


@router.put("/{category_id}")
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


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """删除分类"""
    success = db.delete_category(category_id)
    if not success:
        raise HTTPException(status_code=404, detail="分类不存在")

    return {"message": "分类删除成功"}


@router.put("/counts")
async def update_category_counts(current_user_id: str = Depends(get_current_user_id)):
    """更新分类计数"""
    db.update_category_counts()
    return {"message": "分类计数更新成功"}


@router.post("/batch")
async def save_categories_batch(
    batch_request: BatchCategoriesRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """批量保存分类"""
    categories_data = [category.model_dump() for category in batch_request.categories]
    db.save_categories_batch(categories_data)
    return {"message": "分类批量保存成功"} 