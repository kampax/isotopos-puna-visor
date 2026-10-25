/**
 * Visor de Isótopos Andinos - Generador de Exportación Excel (.xlsx) y CSV
 * Adaptado para Isotopos completo2026.csv
 */
'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.IsotopeExport = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {

  const EXPORT_COLUMNS = [
    ['id', 'ID Maestro'],
    ['etiqueta', 'Etiqueta'],
    ['vega', 'Sitio / Vega'],
    ['ele', 'Altura (m s. n. m.)'],
    ['time', 'Fecha de muestreo'],
    ['latitud', 'Latitud (Y)'],
    ['longitud', 'Longitud (X)'],
    ['conductividad', 'Conductividad (µS/cm)'],
    ['ce_us_cm', 'C. Eléctrica (µS/cm)'],
    ['ce_raw', 'C. Eléctrica (texto original)'],
    ['ppm_cl', 'ppm Cl'],
    ['ppm_cl_raw', 'Cloruro (texto original)'],
    ['d18O', 'δ¹⁸O (‰ VSMOW)'],
    ['d2H', 'δ²H (‰ VSMOW)'],
    ['d_exceso', 'd-excess (‰)'],
    ['ph', 'pH'],
    ['caudal', 'Caudal'],
    ['tipo_label', 'Tipo de muestra'],
    ['tipo', 'Tipo (código)'],
    ['tipo_original', 'Tipo original'],
    ['origen', 'Origen / Campaña / Publicación'],
    ['dato', 'Procedencia (propio/bibliografía)'],
    ['frequencia', 'Frecuencia'],
    ['nota', 'Notas'],
    ['foto', 'Foto (referencia original)'],
    ['doi', 'DOI']
  ];

  function widths(headers, rows, cap = 50) {
    return headers.map((header, i) => ({
      wch: Math.min(
        cap,
        Math.max(
          12,
          String(header).length + 2,
          ...rows.slice(0, 300).map(row => String(row[i] ?? '').length + 2)
        )
      )
    }));
  }

  function doiUrl(raw) {
    const doi = String(raw || '').trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
    return /^10\.\d{4,9}\/\S+$/i.test(doi) ? `https://doi.org/${doi}` : null;
  }

  function addLinks(ws, headers, rows, XLSX) {
    const colDoi = headers.indexOf('DOI');
    if (colDoi >= 0) {
      rows.forEach((row, i) => {
        const raw = row[colDoi];
        const target = doiUrl(raw);
        if (target) {
          const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c: colDoi })];
          if (cell) cell.l = { Target: target };
        }
      });
    }
  }

  function applyFormats(ws, headers, rowCount, XLSX) {
    const formats = {
      'ID Maestro': '0',
      'Altura (m s. n. m.)': '0',
      'Latitud (Y)': '0.000000',
      'Longitud (X)': '0.000000',
      'Conductividad (µS/cm)': '0.0',
      'C. Eléctrica (µS/cm)': '0.0',
      'ppm Cl': '0.00',
      'δ¹⁸O (‰ VSMOW)': '0.00',
      'δ²H (‰ VSMOW)': '0.00',
      'd-excess (‰)': '0.00',
      'pH': '0.00'
    };

    for (const [colName, format] of Object.entries(formats)) {
      const c = headers.indexOf(colName);
      if (c < 0) continue;
      for (let r = 1; r <= rowCount; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && typeof cell.v === 'number') {
          cell.z = format;
        }
      }
    }
  }

  /**
   * Genera el libro Excel (.xlsx) completo
   */
  function toWorkbook(rows, XLSX) {
    const wb = XLSX.utils.book_new();

    // 1. Hoja principal de datos
    const headers = EXPORT_COLUMNS.map(c => c[1]);
    const keys = EXPORT_COLUMNS.map(c => c[0]);
    const dataRows = rows.map(r => keys.map(k => r[k] ?? ''));

    const wsData = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    wsData['!cols'] = widths(headers, dataRows);
    applyFormats(wsData, headers, dataRows.length, XLSX);
    addLinks(wsData, headers, dataRows, XLSX);
    XLSX.utils.book_append_sheet(wb, wsData, 'Muestras');

    // 2. Hoja de resumen estadístico
    const validO18 = rows.map(r => r.d18O).filter(v => v !== null && !isNaN(v));
    const validD = rows.map(r => r.d2H).filter(v => v !== null && !isNaN(v));
    const validDex = rows.map(r => r.d_exceso).filter(v => v !== null && !isNaN(v));
    const validEle = rows.map(r => r.ele).filter(v => v !== null && !isNaN(v));

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const minVal = arr => arr.length ? Math.min(...arr) : null;
    const maxVal = arr => arr.length ? Math.max(...arr) : null;

    const summaryData = [
      ['RESUMEN ESTADÍSTICO DE LA SELECCIÓN FILTRADA'],
      ['Fecha de generación', new Date().toLocaleString('es-AR')],
      ['Total de muestras seleccionadas', rows.length],
      [''],
      ['Variable', 'N válidos', 'Mínimo', 'Promedio', 'Máximo'],
      ['δ¹⁸O (‰ VSMOW)', validO18.length, minVal(validO18), avg(validO18), maxVal(validO18)],
      ['δ²H (‰ VSMOW)', validD.length, minVal(validD), avg(validD), maxVal(validD)],
      ['d-excess (‰)', validDex.length, minVal(validDex), avg(validDex), maxVal(validDex)],
      ['Altura (m s. n. m.)', validEle.length, minVal(validEle), avg(validEle), maxVal(validEle)],
      [''],
      ['DISTRIBUCIÓN POR TIPO DE AGUA'],
      ['Tipo', 'Cantidad', '% del total']
    ];

    const typeCounts = {};
    rows.forEach(r => {
      const lbl = r.tipo_label || r.tipo || 'Sin clasificar';
      typeCounts[lbl] = (typeCounts[lbl] || 0) + 1;
    });

    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([t, count]) => {
      summaryData.push([t, count, (count / rows.length * 100).toFixed(1) + '%']);
    });

    summaryData.push(['']);
    summaryData.push(['DISTRIBUCIÓN POR ORIGEN / CAMPAÑA']);
    summaryData.push(['Origen', 'Cantidad', '% del total']);

    const originCounts = {};
    rows.forEach(r => {
      const o = r.origen || 'Sin origen';
      originCounts[o] = (originCounts[o] || 0) + 1;
    });

    Object.entries(originCounts).sort((a, b) => b[1] - a[1]).forEach(([o, count]) => {
      summaryData.push([o, count, (count / rows.length * 100).toFixed(1) + '%']);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Estadístico');

    return wb;
  }

  function downloadExcel(rows, filename, XLSX) {
    const wb = toWorkbook(rows, XLSX);
    XLSX.writeFile(wb, filename || 'Isotopos_Completo_2026.xlsx');
  }

  return {
    toWorkbook,
    downloadExcel
  };
});
