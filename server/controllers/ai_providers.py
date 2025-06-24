"""
AI供应商配置管理API控制器
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging

from models.database import AIProvider, get_db
from libs.auth import get_current_user_id
from services.ai_provider_service import AIProviderService
from services.openai_service import OpenAIService

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic 模型
class AIProviderConfigCreate(BaseModel):
    name: str
    provider: AIProvider
    base_url: str
    api_key: str
    models: List[str] = []
    default_model: Optional[str] = None
    default_temperature: Optional[float] = 0.7
    default_max_tokens: Optional[int] = 2000
    is_active: bool = True
    is_default: bool = False
    priority: int = 0
    rate_limit_per_minute: Optional[int] = None
    extra_config: dict = {}
    description: Optional[str] = None


class AIProviderConfigUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    models: Optional[List[str]] = None
    default_model: Optional[str] = None
    default_temperature: Optional[float] = None
    default_max_tokens: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    priority: Optional[int] = None
    rate_limit_per_minute: Optional[int] = None
    extra_config: Optional[dict] = None
    description: Optional[str] = None


class AIProviderConfigResponse(BaseModel):
    id: str
    name: str
    provider: AIProvider
    base_url: str
    models: List[str]
    default_model: Optional[str]
    default_temperature: float
    default_max_tokens: int
    is_active: bool
    is_default: bool
    priority: int
    rate_limit_per_minute: Optional[int]
    extra_config: dict
    description: Optional[str]
    create_time: str
    update_time: str


class TestProviderRequest(BaseModel):
    model: Optional[str] = None
    message: str = "Hello, this is a test message."


@router.get("/providers", response_model=List[AIProviderConfigResponse])
async def get_all_providers(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取所有AI供应商配置"""
    try:
        ai_provider_service = AIProviderService(db)
        providers = ai_provider_service.get_all_provider_configs()
        
        return [
            AIProviderConfigResponse(
                id=provider.id,
                name=provider.name,
                provider=provider.provider,
                base_url=provider.base_url,
                models=provider.models,
                default_model=provider.default_model,
                default_temperature=provider.default_temperature,
                default_max_tokens=provider.default_max_tokens,
                is_active=provider.is_active,
                is_default=provider.is_default,
                priority=provider.priority,
                rate_limit_per_minute=provider.rate_limit_per_minute,
                extra_config=provider.extra_config,
                description=provider.description,
                create_time=provider.create_time.isoformat() + 'Z',
                update_time=provider.update_time.isoformat() + 'Z'
            )
            for provider in providers
        ]
    except Exception as e:
        logger.error(f"Error getting providers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get providers: {str(e)}"
        )


@router.post("/providers", response_model=AIProviderConfigResponse)
async def create_provider(
    provider_data: AIProviderConfigCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """创建AI供应商配置"""
    try:
        ai_provider_service = AIProviderService(db)
        
        provider = ai_provider_service.create_provider_config(
            name=provider_data.name,
            provider=provider_data.provider,
            base_url=provider_data.base_url,
            api_key=provider_data.api_key,
            models=provider_data.models,
            default_model=provider_data.default_model,
            default_temperature=provider_data.default_temperature,
            default_max_tokens=provider_data.default_max_tokens,
            is_active=provider_data.is_active,
            is_default=provider_data.is_default,
            priority=provider_data.priority,
            rate_limit_per_minute=provider_data.rate_limit_per_minute,
            extra_config=provider_data.extra_config,
            description=provider_data.description
        )
        
        return AIProviderConfigResponse(
            id=provider.id,
            name=provider.name,
            provider=provider.provider,
            base_url=provider.base_url,
            models=provider.models,
            default_model=provider.default_model,
            default_temperature=provider.default_temperature,
            default_max_tokens=provider.default_max_tokens,
            is_active=provider.is_active,
            is_default=provider.is_default,
            priority=provider.priority,
            rate_limit_per_minute=provider.rate_limit_per_minute,
            extra_config=provider.extra_config,
            description=provider.description,
            create_time=provider.create_time.isoformat() + 'Z',
            update_time=provider.update_time.isoformat() + 'Z'
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating provider: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create provider: {str(e)}"
        )


@router.get("/providers/{provider_id}", response_model=AIProviderConfigResponse)
async def get_provider(
    provider_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """获取指定AI供应商配置"""
    try:
        ai_provider_service = AIProviderService(db)
        provider = ai_provider_service.get_provider_config(provider_id)
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        return AIProviderConfigResponse(
            id=provider.id,
            name=provider.name,
            provider=provider.provider,
            base_url=provider.base_url,
            models=provider.models,
            default_model=provider.default_model,
            default_temperature=provider.default_temperature,
            default_max_tokens=provider.default_max_tokens,
            is_active=provider.is_active,
            is_default=provider.is_default,
            priority=provider.priority,
            rate_limit_per_minute=provider.rate_limit_per_minute,
            extra_config=provider.extra_config,
            description=provider.description,
            create_time=provider.create_time.isoformat() + 'Z',
            update_time=provider.update_time.isoformat() + 'Z'
        )
    except Exception as e:
        logger.error(f"Error getting provider {provider_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get provider: {str(e)}"
        )


@router.put("/providers/{provider_id}", response_model=AIProviderConfigResponse)
async def update_provider(
    provider_id: str,
    provider_data: AIProviderConfigUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """更新AI供应商配置"""
    try:
        ai_provider_service = AIProviderService(db)
        
        update_data = provider_data.model_dump(exclude_unset=True)
        provider = ai_provider_service.update_provider_config(provider_id, update_data)
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        return AIProviderConfigResponse(
            id=provider.id,
            name=provider.name,
            provider=provider.provider,
            base_url=provider.base_url,
            models=provider.models,
            default_model=provider.default_model,
            default_temperature=provider.default_temperature,
            default_max_tokens=provider.default_max_tokens,
            is_active=provider.is_active,
            is_default=provider.is_default,
            priority=provider.priority,
            rate_limit_per_minute=provider.rate_limit_per_minute,
            extra_config=provider.extra_config,
            description=provider.description,
            create_time=provider.create_time.isoformat() + 'Z',
            update_time=provider.update_time.isoformat() + 'Z'
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating provider {provider_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update provider: {str(e)}"
        )


@router.delete("/providers/{provider_id}")
async def delete_provider(
    provider_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """删除AI供应商配置"""
    try:
        ai_provider_service = AIProviderService(db)
        success = ai_provider_service.delete_provider_config(provider_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        return {"message": "Provider deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting provider {provider_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete provider: {str(e)}"
        )


@router.post("/providers/{provider_id}/test")
async def test_provider(
    provider_id: str,
    test_request: TestProviderRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """测试AI供应商配置"""
    try:
        ai_provider_service = AIProviderService(db)
        provider = ai_provider_service.get_provider_config(provider_id)
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        if not provider.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider is not active"
            )
        
        # 目前只支持OpenAI兼容的API测试
        if provider.provider in [AIProvider.OPENAI, AIProvider.CUSTOM]:
            openai_service = OpenAIService(provider_config=provider, db=db)
            
            # 使用指定的模型或默认模型
            model = test_request.model or provider.default_model
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No model specified and no default model configured"
                )
            
            response = await openai_service.chat_completion(
                messages=[{"role": "user", "content": test_request.message}],
                model=model,
                stream=False
            )
            
            return {
                "success": True,
                "message": "Provider test successful",
                "response": response
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Testing not supported for provider type: {provider.provider}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing provider {provider_id}: {str(e)}")
        return {
            "success": False,
            "message": f"Provider test failed: {str(e)}",
            "response": None
        } 