@echo off
chcp 65001 > nul
cd /d "%~dp0"
python actualizar_visor.py
if errorlevel 1 goto error
node visor_html\verificar_html.cjs
if errorlevel 1 goto error
git add -- "visor_html/data.js" "visor_html/index.html"
if errorlevel 1 goto error
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Actualizar datos del visor"
    if errorlevel 1 goto error
)
git push origin main
if errorlevel 1 goto error
echo.
echo Cambios enviados. GitHub Pages actualizara la web al terminar la publicacion.
echo Estado: https://github.com/kampax/isotopos-puna-visor/actions
echo Visor: https://kampax.github.io/isotopos-puna-visor/
pause
exit /b 0
:error
echo No se completo la actualizacion. Revisa el mensaje anterior.
pause
exit /b 1
