@echo off
REM push_update.bat - 自动将本地更新提交并推送到远端（请确保已配置好 Git 和远程 origin）
REM 使用方法：在资源管理器双击，或在终端中运行 .\push_update.bat

chcp 65001 >nul
echo.
echo =============================
echo 准备将项目提交并推送到远端仓库
echo 项目目录：%~dp0
echo =============================
echo 1) 显示当前 git 状态...
git -C "%~dp0" status --short --branchnecho.
echo 2) 询问是否继续提交（Y/N）set /p CONTINUE=是否继续并执行 git add/commit/push? (Y/N): if /I not "%CONTINUE%"=="Y" (    echo 取消操作，脚本结束。    pause    exit /b 0)
echo.
echo 3) 执行 git add .git -C "%~dp0" add .if %errorlevel% neq 0 (  echo git add 失败，检查终端输出。  pause  exit /b 1)
echo 4) 准备提交。请在下行输入 commit 信息（回车确认）：set /p MSG=提交信息: if "%MSG%"=="" set MSG=更新个人网站稳定版
git -C "%~dp0" commit -m "%MSG%"if %errorlevel% neq 0 (  echo git commit 可能没有要提交的内容或发生错误。  echo 查看 "git status" 以确认。  git -C "%~dp0" status --short --branch  pause  exit /b 1)
echo 5) 推送到远端 origin main（可能会要求输入用户名/密码或 token）
git -C "%~dp0" push origin mainif %errorlevel% neq 0 (  echo git push 失败。可能需要认证（用户名/Token）、或远端未设置为 origin/main。  echo 请检查远端：  git -C "%~dp0" remote -v  pause  exit /b 1)
echo.
echo 推送成功！Cloudflare Pages 若已绑定会自动开始部署。
echo 请等待几分钟，然后打开 https://personal-website-5xu.pages.dev/ 强制刷新查看最新内容。
echo.pause
exit /b 0