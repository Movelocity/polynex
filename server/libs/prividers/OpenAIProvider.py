from typing import AsyncGenerator, List, Dict, Any
# from openai import AsyncOpenAI
import httpx
import logging
from datetime import datetime
from models.database import AIProviderConfig
import json
import os
# 确保日志目录存在
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
# 移除默认的处理器
logger.handlers = []
# 创建文件处理器
file_handler = logging.FileHandler(f"{log_dir}/openai_provider.log", encoding='utf-8')
file_handler.setLevel(logging.INFO)
# 创建日志格式
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
# 将处理器添加到 logger
logger.addHandler(file_handler)
logger.propagate = False

class OpenAIProvider:
    """OpenAI API 请求类"""
    
    def __init__(
        self, 
        provider_config: AIProviderConfig = None,
    ):
        """
        初始化 OpenAI 服务
        
        Args:
            provider_config: 供应商配置对象
        """
        self.config = provider_config
        # 获取供应商配置
        if not self.config:
            raise ValueError("No provider configuration specified")
        
        # 验证配置
        if not self.config.api_key:
            raise ValueError(f"OpenAI API key is required in configuration: {self.config.name}")
        
        # 处理代理配置
        self.client = None
        proxy_info = ""
        if self.config.proxy and self.config.proxy.get('url'):
            self.client = httpx.AsyncClient(
                proxies=self._get_proxy_url(),
                timeout=httpx.Timeout(30.0),  # 30秒超时
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )

            proxy_info = f"(proxy: {self.config.proxy.get('url', 'Unknown')})"
            # 注意：这里不测试代理连接，因为会阻塞初始化过程
            # 代理的有效性会在实际使用时检测，如果代理无效，会抛出异常
        else:
            self.client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),  # 30秒超时
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )
        
        logger.info(f"初始化供应商配置: {self.config.name} "+proxy_info)
    
    def _get_proxy_url(self) -> str:
        """
        获取代理URL
        """
        proxy_config = self.config.proxy  # 代理配置字典，包含url, username, password
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
            return proxies
        except Exception as e:
            raise ValueError(f"无效的代理配置: {str(e)}")
    
    async def _make_stream_request(self, request_params: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        辅助方法，用于处理流式请求
        
        Args:
            request_params: 请求参数字典
            
        Yields:
            str: 流式响应数据
        """
        async with self.client as client:
            async with client.stream(
                "POST",
                f"{self.config.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json=request_params,
                timeout=30.0
            ) as response:
                async for line in response.aiter_lines():
                    yield line

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
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
        try:
            request_params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
                **kwargs
            }
            
            logger.info(f"(config: {self.config.name}) 开始流式聊天: {json.dumps(request_params, ensure_ascii=False)}")
            
            # 发送初始事件
            yield {
                "type": "start",
                "data": {
                    "model": model,
                    "provider_config": self.config.name,
                    "timestamp": datetime.now().isoformat(),
                }
            }
            
            # 使用辅助方法处理流式请求
            async for line in self._make_stream_request(request_params):
                # print(line)
                logger.info(line)
                try:
                    if line == None or line == "":
                        continue
                    if line.startswith("data: "):
                        line = line[6:]
                    if line == "[DONE]":
                        continue

                    data = json.loads(line)
                    # print(data)
                    
                    if data.get("choices") and data["choices"][0].get("delta"):
                        content = data["choices"][0]["delta"].get("content", "")
                        reasoning_content = data["choices"][0]["delta"].get("reasoning_content", "")
                        
                        # 发送内容片段
                        yield {
                            "type": "content",
                            "data": {
                                "content": content if content else "",  # 确保不是 NoneType
                                "reasoning_content": reasoning_content if reasoning_content else "",
                                "timestamp": datetime.now().isoformat()
                            }
                        }

                    # 检查是否完成
                    if data.get("choices") and data["choices"][0].get("finish_reason"):
                        finish_reason = data["choices"][0]["finish_reason"]
                        usage = data.get("usage", {})
                        
                        # 发送完成事件
                        yield {
                            "type": "done",
                            "data": {
                                "finish_reason": finish_reason,
                                "timestamp": datetime.now().isoformat(),
                                "token_count": usage.get("total_tokens", 0),
                                "prompt_tokens": usage.get("prompt_tokens", 0),
                                "completion_tokens": usage.get("completion_tokens", 0),
                                "provider_config": self.config.name,
                            }
                        }
                        break
                except Exception as e:
                    logger.error(f"处理API流式响应时出错: {str(e)}")
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"流式聊天错误: {error_msg}")
            
            yield {
                "type": "error",
                "data": {
                    "error": error_msg,
                    "timestamp": datetime.now().isoformat(),
                    "provider_config": self.config.name,
                }
            }
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
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
        
        try:
            
            request_params = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
                **kwargs
            }
            
            response = await self.client.chat.completions.create(**request_params)
            
            response_content = response.choices[0].message.content
            finish_reason = response.choices[0].finish_reason
            usage = response.usage
            
            return {
                "content": response_content,
                "model": response.model,
                "finish_reason": finish_reason,
                "usage": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens
                } if usage else None,
                "timestamp": datetime.now().isoformat(),
                "provider_config": self.config.name,
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in chat_completion: {error_msg}")
            
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
                print(json.dumps(response.json()))
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

