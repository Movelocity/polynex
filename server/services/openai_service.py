from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import AsyncOpenAI
import httpx
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from models.database import AIProviderConfig, AIProviderType
from services.ai_provider_service import AIProviderService
from services.llm_request_log_service import get_llm_log_service

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
                self.config = self.provider_service.get_best_provider_config(AIProviderType.OPENAI)
            if not self.config:
                raise ValueError("No active OpenAI provider configuration found. Please add one through the admin panel.")
        else:
            raise ValueError("No database session provided and no provider configuration specified")
        
        # 验证配置
        if not self.config.api_key:
            raise ValueError(f"OpenAI API key is required in configuration: {self.config.name}")
        
        # 处理代理配置
        http_client = None
        if self.config.proxy:
            try:
                http_client = self._create_proxy_client(self.config.proxy)
                logger.info(f"Using proxy configuration for {self.config.name}: {self.config.proxy.get('url', 'Unknown')}")
                
                # 测试代理连接（可选，在初始化时进行简单测试）
                # 注意：这里不进行实际测试，因为会阻塞初始化过程
                # 代理的有效性会在实际使用时检测
                
            except Exception as e:
                error_msg = f"Failed to configure proxy for {self.config.name}: {str(e)}"
                logger.error(error_msg)
                raise ValueError(error_msg)
        
        # 初始化OpenAI客户端
        self.client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            http_client=http_client
        )
        
        logger.info(f"Initialized OpenAI service with config: {self.config.name}")
    
    def _create_proxy_client(self, proxy_config: Dict[str, Any]) -> httpx.AsyncClient:
        """
        创建带有代理配置的httpx客户端
        
        Args:
            proxy_config: 代理配置字典，包含url, username, password
            
        Returns:
            httpx.AsyncClient: 配置了代理的httpx客户端
            
        Raises:
            ValueError: 代理配置无效时抛出
        """
        try:
            proxy_url = proxy_config.get('url')
            if not proxy_url:
                raise ValueError("Proxy URL is required")
            
            username = proxy_config.get('username')
            password = proxy_config.get('password')
            
            # 构建代理配置
            if username and password:
                # 如果有用户名和密码，需要在URL中包含认证信息
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(proxy_url)
                
                # 重构URL以包含认证信息
                netloc = f"{username}:{password}@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
                
                proxy_url_with_auth = urlunparse((
                    parsed.scheme,
                    netloc,
                    parsed.path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment
                ))
                proxies = proxy_url_with_auth
            else:
                proxies = proxy_url
            
            # 创建httpx客户端
            client = httpx.AsyncClient(
                proxies=proxies,
                timeout=httpx.Timeout(30.0),  # 30秒超时
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )
            
            logger.debug(f"Created proxy client with URL: {proxy_url}")
            return client
            
        except Exception as e:
            raise ValueError(f"Invalid proxy configuration: {str(e)}")
    
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
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式聊天接口
        
        Args:
            messages: 消息列表，格式为 [{"role": "user", "content": "..."}]
            model: 使用的模型，默认使用配置中的模型
            temperature: 温度参数，默认使用配置中的温度
            max_tokens: 最大token数，默认使用配置中的最大tokens
            user_id: 用户ID，用于日志记录
            conversation_id: 对话ID，用于日志记录
            agent_id: Agent ID，用于日志记录
            **kwargs: 其他参数
            
        Yields:
            Dict[str, Any]: 流式响应数据
        """
        log_id = None
        log_service = get_llm_log_service()
        
        try:
            # 准备请求参数
            effective_model = self.get_effective_model(model)
            effective_temperature = self.get_effective_temperature(temperature)
            effective_max_tokens = self.get_effective_max_tokens(max_tokens)
            
            request_params = {
                "model": effective_model,
                "messages": messages,
                "temperature": effective_temperature,
                "max_tokens": effective_max_tokens,
                "stream": True,
                **kwargs
            }
            
            # 创建日志记录
            if user_id and self.db:
                log_id = log_service.create_log_async(
                    user_id=user_id,
                    provider_config_id=self.config.id,
                    model=effective_model,
                    request_messages=messages,
                    db=self.db,
                    conversation_id=conversation_id,
                    agent_id=agent_id,
                    temperature=effective_temperature,
                    max_tokens=effective_max_tokens,
                    stream=True,
                    request_params=request_params,
                    extra_metadata={"provider_config_name": self.config.name}
                )
            
            logger.info(f"Starting stream chat with model: {effective_model} (config: {self.config.name}) [log_id: {log_id}]")
            
            # 发送初始事件
            yield {
                "type": "start",
                "data": {
                    "model": effective_model,
                    "provider_config": self.config.name,
                    "timestamp": datetime.utcnow().isoformat(),
                    "log_id": log_id
                }
            }
            
            # 创建流式请求
            stream = await self.client.chat.completions.create(**request_params)
            
            full_response = ""
            total_tokens = 0
            prompt_tokens = 0
            completion_tokens = 0
            
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
                            "timestamp": datetime.now().isoformat()
                        }
                    }
                
                # 检查是否完成
                if chunk.choices and chunk.choices[0].finish_reason:
                    finish_reason = chunk.choices[0].finish_reason
                    
                    # 提取token使用情况（如果可用）
                    if hasattr(chunk, 'usage') and chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens
                        completion_tokens = chunk.usage.completion_tokens
                        total_tokens = chunk.usage.total_tokens
                    else:
                        # 粗略估算token数量
                        completion_tokens = len(full_response.split())
                        prompt_tokens = sum(len(msg['content'].split()) for msg in messages)
                        total_tokens = prompt_tokens + completion_tokens
                    
                    # 更新日志记录
                    if log_id and self.db:
                        log_service.update_log_async(
                            log_id=log_id,
                            db=self.db,
                            response_content=full_response,
                            finish_reason=finish_reason,
                            prompt_tokens=prompt_tokens,
                            completion_tokens=completion_tokens,
                            total_tokens=total_tokens,
                            status="success"
                        )
                    
                    # 发送完成事件
                    yield {
                        "type": "done",
                        "data": {
                            "finish_reason": finish_reason,
                            "full_response": full_response,
                            "timestamp": datetime.now().isoformat(),
                            "token_count": total_tokens,
                            "prompt_tokens": prompt_tokens,
                            "completion_tokens": completion_tokens,
                            "provider_config": self.config.name,
                            "log_id": log_id
                        }
                    }
                    break
                    
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in stream_chat: {error_msg}")
            
            # 更新日志记录为错误状态
            if log_id and self.db:
                log_service.update_log_async(
                    log_id=log_id,
                    db=self.db,
                    status="error",
                    error_message=error_msg
                )
            
            yield {
                "type": "error",
                "data": {
                    "error": error_msg,
                    "timestamp": datetime.utcnow().isoformat(),
                    "provider_config": self.config.name,
                    "log_id": log_id
                }
            }
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        单次聊天完成（非流式）
        
        Args:
            messages: 消息列表
            model: 使用的模型
            temperature: 温度参数
            max_tokens: 最大token数
            user_id: 用户ID，用于日志记录
            conversation_id: 对话ID，用于日志记录
            agent_id: Agent ID，用于日志记录
            **kwargs: 其他参数
            
        Returns:
            Dict[str, Any]: 响应数据
        """
        log_id = None
        log_service = get_llm_log_service()
        
        try:
            # 准备请求参数
            effective_model = self.get_effective_model(model)
            effective_temperature = self.get_effective_temperature(temperature)
            effective_max_tokens = self.get_effective_max_tokens(max_tokens)
            
            request_params = {
                "model": effective_model,
                "messages": messages,
                "temperature": effective_temperature,
                "max_tokens": effective_max_tokens,
                "stream": False,
                **kwargs
            }
            
            # 创建日志记录
            if user_id and self.db:
                log_id = log_service.create_log_async(
                    user_id=user_id,
                    provider_config_id=self.config.id,
                    model=effective_model,
                    request_messages=messages,
                    db=self.db,
                    conversation_id=conversation_id,
                    agent_id=agent_id,
                    temperature=effective_temperature,
                    max_tokens=effective_max_tokens,
                    stream=False,
                    request_params=request_params,
                    extra_metadata={"provider_config_name": self.config.name}
                )
            
            response = await self.client.chat.completions.create(**request_params)
            
            response_content = response.choices[0].message.content
            finish_reason = response.choices[0].finish_reason
            usage = response.usage
            
            # 更新日志记录
            if log_id and self.db and usage:
                log_service.update_log_async(
                    log_id=log_id,
                    db=self.db,
                    response_content=response_content,
                    finish_reason=finish_reason,
                    prompt_tokens=usage.prompt_tokens,
                    completion_tokens=usage.completion_tokens,
                    total_tokens=usage.total_tokens,
                    status="success"
                )
            
            return {
                "content": response_content,
                "model": response.model,
                "finish_reason": finish_reason,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens
                } if usage else None,
                "timestamp": datetime.utcnow().isoformat(),
                "provider_config": self.config.name,
                "log_id": log_id
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in chat_completion: {error_msg}")
            
            # 更新日志记录为错误状态
            if log_id and self.db:
                log_service.update_log_async(
                    log_id=log_id,
                    db=self.db,
                    status="error",
                    error_message=error_msg
                )
            
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
    
    async def test_proxy_connection(self) -> bool:
        """
        测试代理连接是否有效
        
        Returns:
            bool: 代理连接是否有效
        """
        if not self.config.proxy:
            return True  # 没有配置代理，认为是有效的
        
        try:
            # 创建测试客户端
            test_client = self._create_proxy_client(self.config.proxy)
            
            # 尝试通过代理进行一个简单的HTTP请求
            # 这里测试连接到一个公共的测试URL
            test_url = "https://httpbin.org/ip"
            
            async with test_client:
                response = await test_client.get(test_url, timeout=10.0)
                if response.status_code == 200:
                    logger.info(f"Proxy connection test successful for {self.config.name}")
                    return True
                else:
                    logger.warning(f"Proxy connection test failed for {self.config.name}: HTTP {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Proxy connection test failed for {self.config.name}: {str(e)}")
            return False
    
    async def close(self):
        """
        关闭OpenAI客户端和相关资源
        """
        try:
            if hasattr(self.client, '_client') and self.client._client:
                await self.client._client.aclose()
                logger.debug(f"Closed OpenAI client for {self.config.name}")
        except Exception as e:
            logger.warning(f"Error closing OpenAI client for {self.config.name}: {str(e)}")
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
