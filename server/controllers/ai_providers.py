"""
AI供应商配置管理API控制器
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import logging

from fields.schemas import AIProviderType
from models.database import get_db
from fields.schemas import AIProviderConfigCreate, AIProviderConfigUpdate, AIProviderConfigResponse, TestProviderRequest
from libs.auth import get_current_user_id
from services import get_ai_provider_service_singleton, AIProviderService
from libs.prividers.OpenAIProvider import OpenAIProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai_providers", tags=["AI供应商管理"])


@router.get("/all", response_model=List[AIProviderConfigResponse], summary="获取所有AI供应商配置")
async def get_all_providers(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    ai_provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """
    获取所有AI供应商配置
    
    需要用户登录权限。返回系统中配置的所有AI供应商信息。
    """
    try:
        providers = ai_provider_service.get_all_provider_configs(db, current_user_id)
        
        return [
            AIProviderConfigResponse(
                id=provider.id,
                name=provider.name,
                provider_type=provider.provider_type,
                base_url=provider.base_url,
                api_key=provider.api_key,
                proxy=provider.proxy,
                models=provider.models,
                rpm=provider.rpm,
                extra_config=provider.extra_config,
                description=provider.description,
                creator_id=provider.creator_id,
                access_level=provider.access_level,
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


@router.post("/create", summary="创建AI供应商配置")
async def create_provider(
    provider_data: AIProviderConfigCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    ai_provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """
    创建AI供应商配置
    
    **需要管理员权限**。创建新的AI供应商配置，包括API密钥、模型列表等信息。
    """
    try:
        provider = ai_provider_service.create_provider_config(
            db,
            name=provider_data.name,
            provider_type=provider_data.provider_type.upper(),
            base_url=provider_data.base_url,
            api_key=provider_data.api_key,
            proxy=provider_data.proxy.model_dump() if provider_data.proxy else None,
            models=provider_data.models,
            rpm=provider_data.rpm,
            extra_config=provider_data.extra_config,
            description=provider_data.description,
            creator_id=user_id,
            access_level=provider_data.access_level
        )
        
        return AIProviderConfigResponse(
            id=provider.id,
            name=provider.name,
            provider_type=provider.provider_type,
            base_url=provider.base_url,
            api_key=provider.api_key,
            proxy=provider.proxy,
            models=provider.models,
            rpm=provider.rpm,
            extra_config=provider.extra_config,
            description=provider.description,
            creator_id=provider.creator_id,
            access_level=provider.access_level,
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


@router.get("/details/{provider_id}", response_model=AIProviderConfigResponse, summary="获取指定AI供应商配置")
async def get_provider(
    provider_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    ai_provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """
    获取指定AI供应商配置
    
    需要用户登录权限。根据提供商ID获取详细配置信息。
    """
    try:
        provider = ai_provider_service.get_provider_config(db, provider_id, current_user_id)
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        return AIProviderConfigResponse(
            id=provider.id,
            name=provider.name,
            provider_type=provider.provider_type,
            base_url=provider.base_url,
            api_key=provider.api_key,
            proxy=provider.proxy,
            models=provider.models,
            rpm=provider.rpm,
            extra_config=provider.extra_config,
            description=provider.description,
            creator_id=provider.creator_id,
            access_level=provider.access_level,
            create_time=provider.create_time.isoformat() + 'Z',
            update_time=provider.update_time.isoformat() + 'Z'
        )
    except Exception as e:
        logger.error(f"Error getting provider {provider_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get provider: {str(e)}"
        )


@router.put("/update/{provider_id}", response_model=AIProviderConfigResponse, summary="更新AI供应商配置")
async def update_provider(
    provider_id: str,
    provider_data: AIProviderConfigUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    ai_provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """
    更新AI供应商配置
    
    **需要管理员权限**。更新指定供应商的配置信息，包括API密钥、模型列表等。
    """
    try:
        # 处理代理配置的更新
        update_data = provider_data.model_dump(exclude_unset=True)
        if 'proxy' in update_data and update_data['proxy'] is not None:
            update_data['proxy'] = update_data['proxy'] if isinstance(update_data['proxy'], dict) else update_data['proxy'].model_dump()

        provider = ai_provider_service.update_provider_config(db, user_id, provider_id, update_data)
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        return AIProviderConfigResponse(
            id=provider.id,
            name=provider.name,
            provider_type=provider.provider_type,
            base_url=provider.base_url,
            api_key=provider.api_key,
            proxy=provider.proxy,
            models=provider.models,
            rpm=provider.rpm,
            extra_config=provider.extra_config,
            description=provider.description,
            creator_id=provider.creator_id,
            access_level=provider.access_level,
            create_time=provider.create_time.isoformat() + 'Z',
            update_time=provider.update_time.isoformat() + 'Z'
        )
    except ValueError as e:
        logger.error(f"ValueError updating provider {provider_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        error_msg = str(e) if str(e) else f"Unknown error of type: {type(e).__name__}"
        logger.error(f"Error updating provider {provider_id}: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update provider: {error_msg}"
        )


@router.delete("/delete/{provider_id}", summary="删除AI供应商配置")
async def delete_provider(
    provider_id: str,
    # admin_user_id: str = Depends(require_admin_permission),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    ai_provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """
    删除AI供应商配置
    
    **需要管理员权限**。删除指定的AI供应商配置。注意：删除配置可能会影响使用该配置的代理和会话。
    """
    try:
        success = ai_provider_service.delete_provider_config(db, user_id, provider_id)
        
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


@router.post("/test/{provider_id}", summary="测试AI供应商配置")
async def test_provider(
    provider_id: str,
    test_request: TestProviderRequest,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    ai_provider_service: AIProviderService = Depends(get_ai_provider_service_singleton)
):
    """
    测试AI供应商配置
    
    需要用户登录权限。发送测试消息到指定的AI供应商，验证配置是否正确。
    支持的供应商类型：OpenAI兼容API、自定义API。
    """
    try:
        provider_config = ai_provider_service.get_provider_config(db, provider_id, current_user_id)
        
        if not provider_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        # 目前只支持OpenAI兼容的API测试
        if provider_config.provider_type in [AIProviderType.OPENAI, AIProviderType.CUSTOM]:
            try:
                async with OpenAIProvider(provider_config=provider_config) as openai_service:
                    # 首先测试代理连接（如果配置了代理）
                    if provider_config.proxy:
                        logger.info(f"Provider {provider_config.name} 测试代理连接")
                        proxy_test_success = await openai_service.test_proxy_connection()
                        if not proxy_test_success:
                            return {
                                "success": False,
                                "message": "Proxy connection test failed. Please check your proxy configuration.",
                                "response": None
                            }
                        logger.info(f"Provider {provider_config.name} 代理测试通过")
                    
                    # 使用指定的模型或默认模型
                    model = test_request.model
                    if not model:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="没有指定模型"
                        )
                    
                    response = await openai_service.chat_completion(
                        messages=[{"role": "user", "content": test_request.message}],
                        model=model,
                        stream=False
                    )
                    
                    return {
                        "success": True,
                        "message": "测试成功" + (" (with proxy)" if provider_config.proxy else ""),
                        "response": response
                    }
            except Exception as e:
                # 检查是否是代理相关的错误
                error_message = str(e).lower()
                if any(keyword in error_message for keyword in ['proxy', 'connection', 'tunnel', 'socks']):
                    return {
                        "success": False,
                        "message": f"代理连接失败: {str(e)}",
                        "response": None
                    }
                else:
                    raise
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持测试供应商类型: {provider_config.provider_type}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"测试供应商 {provider_id}: {str(e)}")
        return {
            "success": False,
            "message": f"测试失败: {str(e)}",
            "response": None
        } 