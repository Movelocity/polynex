"""
API文档控制器

提供API文档的生成、查看和管理功能
"""

from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import HTMLResponse
from typing import Dict, Any
import json

router = APIRouter(prefix="/api/docs", tags=["API文档"])


@router.get("/", response_class=HTMLResponse, summary="API文档主页")
async def api_docs_home():
    """
    API文档主页
    
    提供系统API的完整文档，包括所有接口的说明、参数、权限要求等信息。
    """
    html_content = """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Polynex API 文档</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f5f7fa;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 30px;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #e1e8ed;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #1a202c;
                margin: 0;
                font-size: 2.5em;
            }
            .header p {
                color: #64748b;
                margin: 10px 0 0 0;
                font-size: 1.1em;
            }
            .section {
                margin-bottom: 40px;
            }
            .section h2 {
                color: #2d3748;
                border-left: 4px solid #3182ce;
                padding-left: 15px;
                margin-bottom: 20px;
            }
            .auth-info {
                background: #f7fafc;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 20px;
                margin-bottom: 30px;
            }
            .auth-info h3 {
                margin-top: 0;
                color: #2d3748;
            }
            .endpoint-group {
                margin-bottom: 30px;
                background: #fafafa;
                border-radius: 6px;
                padding: 20px;
            }
            .endpoint-group h3 {
                margin-top: 0;
                color: #2d3748;
                font-size: 1.3em;
            }
            .endpoint {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                margin-bottom: 15px;
                overflow: hidden;
            }
            .endpoint-header {
                padding: 15px;
                display: flex;
                align-items: center;
                gap: 15px;
                background: #f8f9fa;
                border-bottom: 1px solid #e2e8f0;
            }
            .method {
                padding: 4px 8px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                font-size: 0.8em;
                min-width: 50px;
                text-align: center;
            }
            .method.get { background: #48bb78; }
            .method.post { background: #3182ce; }
            .method.put { background: #ed8936; }
            .method.delete { background: #e53e3e; }
            .endpoint-path {
                font-family: 'Monaco', 'Consolas', monospace;
                color: #2d3748;
                font-weight: 600;
            }
            .endpoint-description {
                padding: 15px;
            }
            .permission-badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75em;
                font-weight: 600;
                margin-left: auto;
            }
            .permission-badge.admin {
                background: #fed7d7;
                color: #c53030;
            }
            .permission-badge.user {
                background: #bee3f8;
                color: #2b6cb0;
            }
            .permission-badge.public {
                background: #c6f6d5;
                color: #276749;
            }
            .note {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
            }
            .swagger-link {
                display: inline-block;
                background: #3182ce;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin-top: 20px;
                transition: background 0.2s;
            }
            .swagger-link:hover {
                background: #2c5282;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Polynex API 文档</h1>
                <p>博客平台后端API接口文档 - 版本 1.0</p>
            </div>

            <div class="section">
                <div class="auth-info">
                    <h3>🔐 认证说明</h3>
                    <p><strong>认证方式：</strong> Bearer Token (JWT)</p>
                    <p><strong>请求头：</strong> <code>Authorization: Bearer &lt;your_token&gt;</code></p>
                    <p><strong>权限等级：</strong></p>
                    <ul>
                        <li><span class="permission-badge public">无需认证</span> - 公开接口，无需登录</li>
                        <li><span class="permission-badge user">用户权限</span> - 需要登录用户权限</li>
                        <li><span class="permission-badge admin">管理员权限</span> - 需要管理员权限</li>
                    </ul>
                </div>
            </div>

            <div class="section">
                <h2>📝 API 接口分组</h2>
                
                <div class="endpoint-group">
                    <h3>🤖 AI供应商管理 (/api/ai)</h3>
                    <p>管理AI服务提供商的配置，包括OpenAI、Claude等</p>
                    
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/ai/providers</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取所有AI供应商配置</strong><br>
                            返回系统中配置的所有AI供应商信息，包括模型列表、配置参数等。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method post">POST</span>
                            <span class="endpoint-path">/api/ai/providers</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>创建AI供应商配置</strong><br>
                            创建新的AI供应商配置，包括API密钥、模型列表等信息。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/ai/providers/{provider_id}</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取指定AI供应商配置</strong><br>
                            根据提供商ID获取详细配置信息。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method put">PUT</span>
                            <span class="endpoint-path">/api/ai/providers/{provider_id}</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>更新AI供应商配置</strong><br>
                            更新指定供应商的配置信息，包括API密钥、模型列表等。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method delete">DELETE</span>
                            <span class="endpoint-path">/api/ai/providers/{provider_id}</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>删除AI供应商配置</strong><br>
                            删除指定的AI供应商配置。注意：删除配置可能会影响使用该配置的代理和会话。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method post">POST</span>
                            <span class="endpoint-path">/api/ai/providers/{provider_id}/test</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>测试AI供应商配置</strong><br>
                            发送测试消息到指定的AI供应商，验证配置是否正确。
                        </div>
                    </div>
                </div>

                <div class="endpoint-group">
                    <h3>🎭 AI代理管理 (/api/agents)</h3>
                    <p>管理AI对话代理，包括创建、配置和使用自定义AI助手</p>
                    
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method post">POST</span>
                            <span class="endpoint-path">/api/agents/agents</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>创建AI代理</strong><br>
                            创建一个新的AI代理配置，包括模型选择、预设消息、应用配置等。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/agents/agents</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取AI代理列表</strong><br>
                            获取当前用户的代理列表，可选择是否包含公开代理。支持分页。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/agents/public</span>
                            <span class="permission-badge public">无需认证</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取公开AI代理列表</strong><br>
                            获取所有公开可用的AI代理列表，供未登录用户浏览。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/agents/agents/{agent_id}</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取AI代理详情</strong><br>
                            获取指定代理的完整配置信息，包括预设消息、模型参数等。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method put">PUT</span>
                            <span class="endpoint-path">/api/agents/agents/{agent_id}</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>更新AI代理</strong><br>
                            更新指定代理的配置信息。只有代理的创建者可以更新代理。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method delete">DELETE</span>
                            <span class="endpoint-path">/api/agents/agents/{agent_id}</span>
                            <span class="permission-badge user">用户权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>删除AI代理</strong><br>
                            删除指定的AI代理。只有代理的创建者可以删除代理。
                        </div>
                    </div>
                </div>

                <div class="endpoint-group">
                    <h3>👑 管理员接口 (/api/admin)</h3>
                    <p>系统管理功能，包括用户管理、配置管理等</p>
                    
                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/admin/users</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取所有用户</strong><br>
                            获取系统中的所有用户信息，包括用户名、邮箱、角色等。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/admin/users/stats</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取用户统计数据</strong><br>
                            获取用户统计信息，包括总用户数、管理员数量、普通用户数量等。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method put">PUT</span>
                            <span class="endpoint-path">/api/admin/users/{user_id}/role</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>更新用户角色</strong><br>
                            更新指定用户的角色（admin 或 user）。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method delete">DELETE</span>
                            <span class="endpoint-path">/api/admin/users/{user_id}</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>删除用户</strong><br>
                            删除指定用户。管理员不能删除自己。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method get">GET</span>
                            <span class="endpoint-path">/api/admin/site-config</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>获取所有网站配置</strong><br>
                            获取系统中的所有配置项，包括配置键、值、描述等信息。
                        </div>
                    </div>

                    <div class="endpoint">
                        <div class="endpoint-header">
                            <span class="method put">PUT</span>
                            <span class="endpoint-path">/api/admin/site-config/{key}</span>
                            <span class="permission-badge admin">管理员权限</span>
                        </div>
                        <div class="endpoint-description">
                            <strong>更新网站配置</strong><br>
                            更新指定键的配置项值和描述。
                        </div>
                    </div>
                </div>
            </div>

            <div class="note">
                <strong>📌 注意事项：</strong>
                <ul>
                    <li>所有需要认证的接口都需要在请求头中包含有效的JWT Token</li>
                    <li>管理员权限接口只能由角色为 "admin" 的用户访问</li>
                    <li>API响应格式统一采用JSON格式</li>
                    <li>错误响应包含详细的错误信息和状态码</li>
                </ul>
            </div>

            <div class="section">
                <h2>🔧 交互式文档</h2>
                <p>如需查看详细的API规范和进行在线测试，请访问：</p>
                <a href="/docs" class="swagger-link">📋 Swagger UI 文档</a>
                <a href="/redoc" class="swagger-link">📚 ReDoc 文档</a>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content


@router.get("/permissions", summary="权限列表说明")
async def get_permissions_info():
    """
    获取权限列表说明
    
    返回系统中所有权限等级的详细说明，包括各个接口的权限要求。
    """
    return {
        "permissions": {
            "public": {
                "name": "公开权限",
                "description": "无需认证即可访问的接口",
                "endpoints": [
                    "GET /api/agents/public - 获取公开AI代理列表",
                    "GET /api/docs/ - API文档主页"
                ]
            },
            "user": {
                "name": "用户权限",
                "description": "需要登录用户身份的接口",
                "requirements": "有效的JWT Token",
                "endpoints": [
                    "GET /api/ai/providers - 获取AI供应商列表",
                    "GET /api/ai/providers/{id} - 获取指定AI供应商",
                    "POST /api/ai/providers/{id}/test - 测试AI供应商",
                    "POST /api/agents/agents - 创建AI代理",
                    "GET /api/agents/agents - 获取AI代理列表",
                    "GET /api/agents/agents/{id} - 获取AI代理详情",
                    "PUT /api/agents/agents/{id} - 更新AI代理",
                    "DELETE /api/agents/agents/{id} - 删除AI代理"
                ]
            },
            "admin": {
                "name": "管理员权限",
                "description": "需要管理员身份的接口",
                "requirements": "有效的JWT Token + 用户角色为admin",
                "endpoints": [
                    "POST /api/ai/providers - 创建AI供应商配置",
                    "PUT /api/ai/providers/{id} - 更新AI供应商配置",
                    "DELETE /api/ai/providers/{id} - 删除AI供应商配置",
                    "GET /api/admin/users - 获取所有用户",
                    "GET /api/admin/users/stats - 获取用户统计",
                    "PUT /api/admin/users/{id}/role - 更新用户角色",
                    "DELETE /api/admin/users/{id} - 删除用户",
                    "GET /api/admin/site-config - 获取网站配置",
                    "PUT /api/admin/site-config/{key} - 更新网站配置"
                ]
            }
        },
        "authentication": {
            "type": "Bearer Token (JWT)",
            "header": "Authorization: Bearer <your_token>",
            "description": "通过登录接口获取Token，然后在请求头中携带"
        }
    }


@router.get("/status", summary="API状态检查")
async def api_status():
    """
    API状态检查
    
    返回API服务的运行状态和版本信息。
    """
    return {
        "status": "running",
        "version": "1.0.0",
        "description": "Polynex API",
        "features": {
            "authentication": "JWT Bearer Token",
            "permissions": ["public", "user", "admin"],
            "ai_providers": "支持多种AI供应商配置",
            "agents": "AI代理管理",
            "admin": "完整的管理员功能"
        },
        "endpoints": {
            "total": 15,
            "public": 3,
            "user_required": 7,
            "admin_required": 5
        }
    } 