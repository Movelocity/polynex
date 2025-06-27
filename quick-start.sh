#!/bin/bash

# 博客平台快速启动脚本
echo "🚀 欢迎使用博客平台快速启动脚本"
echo "=================================="

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装Python 3.9+"
    exit 1
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装Node.js 16+"
    exit 1
fi

echo "✅ 环境检查通过"

# 设置后端
echo "📦 设置后端环境..."
cd server

# 创建虚拟环境（可选）
if [ ! -d "venv" ]; then
    echo "🔧 创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate 2>/dev/null || echo "⚠️ 虚拟环境激活失败，继续使用系统Python"

# 安装依赖
echo "📥 安装Python依赖..."
pip install -r requirements.txt

# 创建环境配置文件
if [ ! -f ".env" ]; then
    echo "⚙️ 创建环境配置文件..."
    cat > .env << EOF
# 数据库配置
BLOG_DATABASE_URL=sqlite:///./blog_platform.db

# 安全配置
BLOG_SECRET_KEY=your-super-secret-key-change-in-production
BLOG_JWT_ALGORITHM=HS256
BLOG_JWT_EXPIRE_MINUTES=10080

# 服务器配置
BLOG_HOST=0.0.0.0
BLOG_PORT=8765
BLOG_DEBUG=true

# 日志配置
BLOG_LOG_LEVEL=INFO

# CORS配置
BLOG_CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# AI配置 (可选 - 需要设置真实的API Key)
# OPENAI_API_KEY=your-openai-api-key-here
EOF
    echo "✅ 环境配置文件已创建: server/.env"
fi

cd ..

# 设置前端
echo "🎨 设置前端环境..."
cd web

# 安装依赖
echo "📥 安装Node.js依赖..."
npm install

cd ..

echo ""
echo "🎉 项目设置完成！"
echo "=================================="
echo "启动方式："
echo ""
echo "1. 启动后端服务器："
echo "   cd server"
echo "   python main.py"
echo "   访问: http://localhost:8765"
echo ""
echo "2. 启动前端服务器（新开终端）："
echo "   cd web"
echo "   npm run dev"
echo "   访问: http://localhost:5173"
echo ""
echo "📖 API文档: http://localhost:8765/docs"
echo "🔧 交互式文档: http://localhost:8765/redoc"
echo ""
echo "⚠️ 提示："
echo "- 首次使用需要注册账号"
echo "- 管理员权限需要手动在数据库中设置"
echo "- AI功能需要在.env文件中配置API密钥"
echo ""
echo "🎯 享受编码吧！" 