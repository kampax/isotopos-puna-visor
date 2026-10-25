# Isótopos Puna — visor científico

Visor web de isótopos estables (δ¹⁸O y δ²H) en la Puna Argentina y los Andes Centrales, con datos propios de campo y una compilación bibliográfica.

Web publicada: https://kampax.github.io/isotopos-puna-visor/

- Uso, funciones y pruebas del visor: [visor_html/README.md](visor_html/README.md).
- Generación de datos: `actualizar_visor.py` / `ACTUALIZAR_VISOR.bat` (Python y pandas).

## Datos propios

La planilla original (`Isotopos completo2026.csv`) queda solo en el equipo local y no se sube al repositorio. El visor publica todos los registros, propios y bibliográficos, con sus atributos completos: se ven en el mapa, el gráfico, la tabla y la ficha, y se pueden descargar en Excel.

## Actualización de la web

1. Editar y guardar `Isotopos completo2026.csv` en el equipo, manteniendo columnas e IDs únicos.
2. Para revisar en el equipo: ejecutar `ACTUALIZAR_VISOR.bat` y recargar `visor_html/index.html`.
3. Para actualizar internet: ejecutar `PUBLICAR_VISOR.bat` (requiere Python con pandas, Node.js y Git autenticado). Regenera `visor_html/data.js`, ejecuta las comprobaciones y envía a `main` solo el visor generado.
4. Esperar que termine correctamente la ejecución en https://github.com/kampax/isotopos-puna-visor/actions y recargar la web.

Cada envío a `main` vuelve a verificar el visor y lo publica mediante GitHub Actions. Si una validación falla, no se despliega esa versión.
