@echo off
chcp 65001 >nul
echo 🚀 欢迎使用博客平台快速启动脚本 (Windows)
echo ==================================

REM 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 未安装，请先安装Python 3.9+
    pause
    exit /b 1
)

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安装，请先安装Node.js 16+
    pause
    exit /b 1
)

echo ✅ 环境检查通过

REM 设置后端
echo 📦 设置后端环境...
cd server

REM 创建虚拟环境（可选）
if not exist "venv" (
    echo 🔧 创建Python虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
call venv\Scripts\activate.bat 2>nul || echo ⚠️ 虚拟环境激活失败，继续使用系统Python

REM 安装依赖
echo 📥 安装Python依赖...
pip install -r requirements.txt

REM 创建环境配置文件
if not exist ".env" (
    echo ⚙️ 创建环境配置文件...
    (
        echo # 数据库配置
        echo BLOG_DATABASE_URL=sqlite:///./blog_platform.db
        echo.
        echo # 安全配置
        echo BLOG_SECRET_KEY=your-super-secret-key-change-in-production
        echo BLOG_JWT_ALGORITHM=HS256
        echo BLOG_JWT_EXPIRE_MINUTES=10080
        echo.
        echo # 服务器配置
        echo BLOG_HOST=0.0.0.0
        echo BLOG_PORT=8765
        echo BLOG_DEBUG=true
        echo.
        echo # 日志配置
        echo BLOG_LOG_LEVEL=INFO
        echo.
        echo # CORS配置
        echo BLOG_CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
        echo.
        echo # AI配置 (可选 - 需要设置真实的API Key^)
        echo # OPENAI_API_KEY=your-openai-api-key-here
    ) > .env
    echo ✅ 环境配置文件已创建: server\.env
)

cd ..

REM 设置前端
echo 🎨 设置前端环境...
cd web

REM 安装依赖
echo 📥 安装Node.js依赖...
npm install

cd ..

echo.
echo 🎉 项目设置完成！
echo ==================================
echo 启动方式：
echo.
echo 1. 启动后端服务器：
echo    cd server
echo    python main.py
echo    访问: http://localhost:8765
echo.
echo 2. 启动前端服务器（新开命令行）：
echo    cd web
echo    npm run dev
echo    访问: http://localhost:5173
echo.
echo 📖 API文档: http://localhost:8765/docs
echo 🔧 交互式文档: http://localhost:8765/redoc
echo.
echo ⚠️ 提示：
echo - 首次使用需要注册账号
echo - 管理员权限需要手动在数据库中设置
echo - AI功能需要在.env文件中配置API密钥
echo.
echo 🎯 享受编码吧！
pause 