@echo off
chcp 65001 > nul
echo ====================================================================
echo  Sincronizando Isotopos completo2026.csv con el Visor HTML...
echo ====================================================================
python "%~dp0actualizar_visor.py"
if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================================
    echo  ¡Listo! Los datos del visor han sido actualizados exitosamente.
    echo  Recarga el visor LOCAL con F5 para ver los cambios.
    echo  Para actualizar la WEB ejecuta PUBLICAR_VISOR.bat.
    echo ====================================================================
) else (
    echo.
    echo [ERROR] Hubo un error al sincronizar los datos. Revisa el archivo CSV.
)
timeout /t 5
