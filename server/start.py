#!/usr/bin/env python3
"""
博客平台后端服务启动脚本
"""

import uvicorn
import os
import sys

def main():
    """启动 FastAPI 服务"""
    print("🚀 启动博客平台后端服务...")
    print("📍 服务地址: http://localhost:8765")
    print("📖 API 文档: http://localhost:8765/docs")
    print("🔧 交互式文档: http://localhost:8765/redoc")
    print("=" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8765,
            reload=True,  # 开发模式下自动重载
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
