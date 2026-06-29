@echo off
chcp 65001 >nul
title JobPilot v2 - 启动中...
cls

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║       🚀 JobPilot v2 一键启动            ║
echo  ║       求职助手 · 局域网共享版             ║
echo  ╚══════════════════════════════════════════╝
echo.

:: 获取本机局域网 IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "192.168"') do (
    set LAN_IP=%%a
    goto :got_ip
)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LAN_IP=%%a
    goto :got_ip
)
set LAN_IP= 127.0.0.1
:got_ip
set LAN_IP=%LAN_IP: =%

echo  📡 本机局域网地址: %LAN_IP%
echo.

:: 检查端口是否已占用
netstat -ano | findstr ":8000 " >nul 2>&1
if %errorlevel%==0 (
    echo  ⚠  后端端口 8000 已被占用，跳过启动...
) else (
    echo  [1/2] 启动后端 FastAPI (端口 8000)...
    start "JobPilot-Backend" cmd /k "cd /d "%~dp0backend" && set LAN_MODE=true && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
)

netstat -ano | findstr ":3000 " >nul 2>&1
if %errorlevel%==0 (
    echo  ⚠  前端端口 3000 已被占用，跳过启动...
) else (
    echo  [2/2] 启动前端 Next.js (端口 3000)...
    start "JobPilot-Frontend" cmd /k "npm run dev --prefix "%~dp0frontend""
    timeout /t 5 /nobreak >nul
)

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✅ 启动完成！访问地址：                                  ║
echo  ║                                                            ║
echo  ║  🖥  本机访问:   http://localhost:3000                    ║
echo  ║  📱  局域网访问: http://%LAN_IP%:3000          ║
echo  ║                                                            ║
echo  ║  💡 把局域网地址发给同学，确保在同一WiFi下即可访问        ║
echo  ║                                                            ║
echo  ║  API文档:   http://localhost:8000/docs                    ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: 等待片刻后打开浏览器
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo  按任意键关闭此窗口（服务在后台继续运行）...
pause >nul
