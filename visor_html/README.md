# Visor de Isótopos Puna & Andes

Explorador HTML con 300 registros: 202 propios y 98 bibliográficos. Incluye 275 registros con coordenadas, 297 pares isotópicos completos y 23 orígenes/campañas/publicaciones.

## Uso

Abrir `index.html` en un navegador moderno. Las bibliotecas y los datos están incluidos. Las capas cartográficas y las fuentes de Google necesitan internet; filtros, gráficos y Excel se procesan en el navegador.

También se puede servir desde esta carpeta con `python -m http.server 8765 --bind 127.0.0.1` y abrir http://127.0.0.1:8765.

## Funciones

- Búsqueda por ID, etiqueta, sitio, tipo, origen y notas.
- Procedencia, tipo de agua, publicación/campaña, frecuencia, altura y extensión del mapa.
- Selección múltiple por clic en tipo y publicación; ninguna selección incluye todas las categorías.
- Mapa con registros agrupados por coordenadas, gráfico isotópico, tabla y ficha.
- Ajuste OLS de precipitación y nieve con al menos tres pares y variación en δ¹⁸O.
- Excel de la selección: hojas `Muestras` (26 columnas) y `Resumen Estadístico`, con DOI y calificadores textuales de conductividad y cloruros.

El filtro de extensión visible restringe los registros georreferenciados. Los registros sin coordenadas permanecen incluidos mientras la opción correspondiente esté marcada.

## Validación

Desde esta carpeta: `node verificar_html.cjs`. Desde la raíz del repositorio: `node visor_html/verificar_html.cjs`.

La selección completa produce pendiente 7,70, intercepto 13,96 y R² 0,9421 (56 registros). Es un ajuste exploratorio combinado de diferentes sitios, fechas y fuentes, sin ponderación por precipitación. La denominación LMWL en la interfaz no demuestra representatividad local de toda la selección. La revisión del software no constituye un cotejo científico de las fuentes.

## Actualización de datos

En la carpeta superior se conserva `Isotopos completo2026.csv`, solo en el equipo local (no se sube al repositorio). Ejecutar `ACTUALIZAR_VISOR.bat` o `python actualizar_visor.py` (requiere pandas) para regenerar `data.js`. Las pruebas normales admiten cambios en el número de registros. Para comprobar además los valores de referencia de la versión inicial de 300 registros, ejecutar `node verificar_html.cjs --baseline`.

## Revisión del 14 de septiembre de 2026

Se corrigieron la exclusión de alturas no informadas sin límites numéricos, la conservación de calificadores en Excel, el escape duplicado de texto en la ficha, el resaltado de la muestra en ventanas del mapa, el icono de capas y la ruta de ejecución de las pruebas.

Persisten incidencias en los datos originales: fechas como `29:52.0` o `18/03/20026`, texto como `PeÃ±as` y excesos de deuterio iguales a cero en registros sin par isotópico. Se mantienen los valores originales; requieren cotejo con la fuente antes de corregirlos.

Pruebas de navegador realizadas: carga del mapa y gráfico; filtro bibliográfico (98); exclusión de alturas desconocidas (274); búsqueda de ID 90050 (1); apertura de ficha y selección; búsqueda vacía con descarga deshabilitada; selección múltiple precipitación (39), precipitación + nieve (56), nieve (17); restablecimiento (300). Sin errores de consola en la carga corregida. Revisión visual realizada en escritorio.

La web se actualiza al enviar cambios a `main`: GitHub verifica el `data.js` generado en el equipo y despliega el visor. Para enviarlos desde Windows, ejecutar `PUBLICAR_VISOR.bat` en la carpeta superior.
