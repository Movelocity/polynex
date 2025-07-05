from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.orm import Session

from fields import (
    Category, CategoryCreate, CategoryUpdate,
    BatchCategoriesRequest
)
from models.database import get_db
from services import get_category_service_singleton, CategoryService
from libs.auth import get_current_user_id

router = APIRouter(prefix="/api/categories", tags=["分类管理"])


@router.get("", response_model=List[Category])
async def get_categories(
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """获取所有分类"""
    categories = category_service.get_all_categories(db)
    return categories


@router.get("/{category_name}", response_model=Category)
async def get_category_by_name(
    category_name: str,
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """根据名称获取分类"""
    category = category_service.get_category_by_name(db, category_name)
    
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    return category


@router.post("", response_model=Category, status_code=201)
async def create_category(
    category_create: CategoryCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """创建分类"""
    # 检查分类名称是否已存在
    existing_category = category_service.get_category_by_name(db, category_create.name)
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类名称已存在"
        )
    
    new_category = category_service.create_category(db, category_create)
    return new_category


@router.put("/{category_id}")
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """更新分类"""
    updates = category_update.model_dump(exclude_unset=True)
    success = category_service.update_category(db, category_id, updates)
    
    if not success:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    return {"message": "分类更新成功"}


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """删除分类"""
    success = category_service.delete_category(db, category_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    return {"message": "分类删除成功"}


@router.post("/batch")
async def save_categories_batch(
    batch_request: BatchCategoriesRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """批量保存分类"""
    categories_data = [category.model_dump() for category in batch_request.categories]
    category_service.save_categories_batch(db, categories_data)
    return {"message": "分类批量保存成功"}


@router.post("/update-counts")
async def update_category_counts(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    category_service: CategoryService = Depends(get_category_service_singleton)
):
    """更新分类计数"""
    category_service.update_category_counts(db)
    return {"message": "分类计数更新成功"}