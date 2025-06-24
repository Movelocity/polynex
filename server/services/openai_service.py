import os
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import AsyncOpenAI
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from models.database import AIProviderConfig, AIProvider
from services.ai_provider_service import AIProviderService

logger = logging.getLogger(__name__)

class OpenAIService:
    """OpenAI API 服务类"""
    
    def __init__(self, 
                 provider_config: AIProviderConfig = None,
                 provider_config_id: str = None,
                 db: Session = None):
        """
        初始化 OpenAI 服务
        
        Args:
            provider_config: 供应商配置对象
            provider_config_id: 供应商配置ID
            db: 数据库会话
        """
        self.db = db
        self.provider_service = AIProviderService(db) if db else None
        
        # 获取供应商配置
        if provider_config:
            self.config = provider_config
        elif provider_config_id and self.provider_service:
            self.config = self.provider_service.get_provider_config(provider_config_id)
            if not self.config:
                raise ValueError(f"AI provider config not found: {provider_config_id}")
        elif self.provider_service:
            # 使用默认配置
            self.config = self.provider_service.get_default_provider_config()
            if not self.config:
                # 如果没有默认配置，使用最佳配置
                self.config = self.provider_service.get_best_provider_config(AIProvider.OPENAI)
            if not self.config:
                raise ValueError("No active OpenAI provider configuration found. Please add one through the admin panel.")
        else:
            raise ValueError("No database session provided and no provider configuration specified")
        
        # 验证配置
        if not self.config.api_key:
            raise ValueError(f"OpenAI API key is required in configuration: {self.config.name}")
        
        # 初始化OpenAI客户端
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url
        )
        
        logger.info(f"Initialized OpenAI service with config: {self.config.name}")
    
    def get_effective_model(self, model: str = None) -> str:
        """获取有效的模型名称"""
        return model or self.config.default_model or "gpt-3.5-turbo"
    
    def get_effective_temperature(self, temperature: float = None) -> float:
        """获取有效的温度参数"""
        return temperature if temperature is not None else (self.config.default_temperature or 0.7)
    
    def get_effective_max_tokens(self, max_tokens: int = None) -> int:
        """获取有效的最大tokens"""
        return max_tokens if max_tokens is not None else (self.config.default_max_tokens or 2000)
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式聊天接口
        
        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]
            model: 使用的模型，默认使用配置中的模型
            temperature: 温度参数，默认使用配置中的温度
            max_tokens: 最大token数，默认使用配置中的最大tokens
            **kwargs: 其他参数
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        try:
            # 准备请求参数
            request_params = {
                "model": self.get_effective_model(model),
                "messages": messages,
                "temperature": self.get_effective_temperature(temperature),
                "max_tokens": self.get_effective_max_tokens(max_tokens),
                "stream": True,
                **kwargs
            }
            
            logger.info(f"Starting stream chat with model: {request_params['model']} (config: {self.config.name})")
            
            # 发送初始事件
            yield {
                "type": "start",
                "data": {
                    "model": request_params['model'],
                    "provider_config": self.config.name,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # 创建流式请求
            stream = await self.client.chat.completions.create(**request_params)
            
            full_response = ""
            
            # 处理流式响应
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    
                    # 发送内容片段
                    yield {
                        "type": "content",
                        "data": {
                            "content": content,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                    }
                
                # 检查是否完成
                if chunk.choices and chunk.choices[0].finish_reason:
                    finish_reason = chunk.choices[0].finish_reason
                    
                    # 发送完成事件
                    yield {
                        "type": "done",
                        "data": {
                            "finish_reason": finish_reason,
                            "full_response": full_response,
                            "timestamp": datetime.utcnow().isoformat(),
                            "token_count": len(full_response.split()),  # 粗略估算
                            "provider_config": self.config.name
                        }
                    }
                    break
                    
        except Exception as e:
            logger.error(f"Error in stream_chat: {str(e)}")
            yield {
                "type": "error",
                "data": {
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                    "provider_config": self.config.name
                }
            }
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        单次聊天完成（非流式）
        
        Args:
            messages: 消息列表
            model: 使用的模型
            temperature: 温度参数
            max_tokens: 最大token数
            **kwargs: 其他参数
            
        Returns:
            Dict[str, Any]: 响应数据
        """
        try:
            request_params = {
                "model": self.get_effective_model(model),
                "messages": messages,
                "temperature": self.get_effective_temperature(temperature),
                "max_tokens": self.get_effective_max_tokens(max_tokens),
                "stream": False,
                **kwargs
            }
            
            response = await self.client.chat.completions.create(**request_params)
            
            return {
                "content": response.choices[0].message.content,
                "model": response.model,
                "finish_reason": response.choices[0].finish_reason,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                } if response.usage else None,
                "timestamp": datetime.utcnow().isoformat(),
                "provider_config": self.config.name
            }
            
        except Exception as e:
            logger.error(f"Error in chat_completion: {str(e)}")
            raise
    
    async def validate_api_key(self) -> bool:
        """
        验证 API 密钥是否有效
        
        Returns:
            bool: 密钥是否有效
        """
        try:
            response = await self.client.models.list()
            return len(response.data) > 0
        except Exception as e:
            logger.error(f"API key validation failed for config {self.config.name}: {str(e)}")
            return False
    
    def get_provider_info(self) -> Dict[str, Any]:
        """
        获取供应商配置信息
        
        Returns:
            Dict[str, Any]: 供应商信息
        """
        return {
            "config_id": self.config.id,
            "name": self.config.name,
            "provider": self.config.provider.value,
            "base_url": self.config.base_url,
            "default_model": self.config.default_model,
            "models": self.config.models,
            "is_default": self.config.is_default,
            "priority": self.config.priority
        }


# 服务工厂函数
def get_openai_service(
    provider_config: AIProviderConfig = None,
    provider_config_id: str = None,
    db: Session = None
) -> OpenAIService:
    """
    获取 OpenAI 服务实例
    
    Args:
        provider_config: 供应商配置对象
        provider_config_id: 供应商配置ID
        db: 数据库会话
        
    Returns:
        OpenAIService: 服务实例
    """
    return OpenAIService(
        provider_config=provider_config,
        provider_config_id=provider_config_id,
        db=db
    ) 