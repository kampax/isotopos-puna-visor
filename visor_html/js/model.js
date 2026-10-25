/**
 * Visor de Isótopos Andinos - Modelo de Datos, Filtros y Regresión LMWL
 * Basado en Isotopos completo2026.csv
 */
(function (root) {
  'use strict';

  // Valida si un registro tiene coordenadas geográficas numéricas válidas
  const geo = r =>
    Number.isFinite(r.latitud) &&
    Number.isFinite(r.longitud) &&
    Math.abs(r.latitud) <= 90 &&
    Math.abs(r.longitud) <= 180;

  // Valida si un registro posee el par isotópico d18O y d2H
  const pair = r =>
    Number.isFinite(r.d18O) &&
    Number.isFinite(r.d2H);

  /**
   * Aplica los criterios de filtrado sobre el dataset
   * @param {Array} data - Lista completa de registros
   * @param {Object} f - Configuración de filtros
   * @returns {Array} Registros que satisfacen los filtros
   */
  function filter(data, f) {
    const search = f.search ? f.search.trim().toLowerCase() : '';

    return data.filter(r => {
      // Búsqueda textual rápida
      if (search) {
        const textToMatch = `${r.id} ${r.etiqueta || ''} ${r.vega || ''} ${r.tipo_label || ''} ${r.tipo || ''} ${r.tipo_original || ''} ${r.origen || ''} ${r.nota || ''} ${r.dato || ''}`.toLowerCase();
        if (!textToMatch.includes(search)) return false;
      }

      // Filtro por Procedencia del Dato (propio / bibliografía)
      if (f.dataType && f.dataType !== 'all') {
        if (r.dato !== f.dataType) return false;
      }

      // Filtro por Tipo de Muestra
      if (f.type && f.type.length && !f.type.includes(r.tipo)) return false;

      // Filtro por Origen / Campaña / Publicación
      if (f.origin && f.origin.length && !f.origin.includes(r.origen)) return false;
      if (f.ownOrigin?.length || f.bibliographyOrigin?.length) {
        const selected = r.dato === 'propio' ? f.ownOrigin : f.bibliographyOrigin;
        if (!selected?.includes(r.origen)) return false;
      }

      // Filtro por Frecuencia (unique / monthly)
      if (f.frequency && f.frequency !== 'all') {
        if (r.frequencia !== f.frequency) return false;
      }

      // Filtro por Rango de Altura (m s. n. m.)
      if (f.min !== null || f.max !== null || f.unknownHeight === false) {
        if (!Number.isFinite(r.ele)) {
          if (!f.unknownHeight) return false;
        } else {
          if (f.min !== null && r.ele < f.min) return false;
          if (f.max !== null && r.ele > f.max) return false;
        }
      }

      // Muestras sin coordenadas (si noCoords es falso y no tiene coords, se excluye)
      if (!geo(r)) {
        if (!f.noCoords) return false;
      }

      // Filtro por Bounding Box visible del mapa
      if (f.bounds && geo(r)) {
        const [s, w, n, e] = f.bounds;
        if (r.latitud < s || r.latitud > n || r.longitud < w || r.longitud > e) return false;
      }

      return true;
    });
  }

  /**
   * Calcula el ajuste lineal por Mínimos Cuadrados Ordinarios (OLS) para muestras de precipitación y nieve
   * Ecuación LMWL: d2H = slope * d18O + intercept
   * @param {Array} rows - Conjunto de registros filtrados
   * @returns {Object} Parámetros de la regresión OLS (slope, intercept, r2, n, ok, reason)
   */
  function fit(rows) {
    const eligible = rows.filter(r =>
      pair(r) &&
      (r.tipo === 'rainwater' || r.tipo === 'snow')
    );

    const n = eligible.length;
    const base = {
      n,
      rows: eligible
    };

    if (n < 3) {
      return {
        ...base,
        ok: false,
        reason: 'Se requieren al menos 3 muestras de precipitación/nieve para el ajuste.'
      };
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (const r of eligible) {
      const x = r.d18O;
      const y = r.d2H;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      sumYY += y * y;
    }

    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-12) {
      return {
        ...base,
        ok: false,
        reason: 'Varianza nula en δ¹⁸O para el conjunto analizado.'
      };
    }

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Coeficiente de determinación R²
    const numR = n * sumXY - sumX * sumY;
    const denR = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const rVal = denR !== 0 ? numR / denR : 0;
    const r2 = rVal * rVal;

    return {
      ...base,
      ok: true,
      slope,
      intercept,
      r2,
      equation: `δ²H = ${slope.toFixed(2)} · δ¹⁸O ${intercept >= 0 ? '+ ' + intercept.toFixed(2) : '- ' + Math.abs(intercept).toFixed(2)}`
    };
  }

  const api = {
    geo,
    pair,
    filter,
    fit
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.IsotopeModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
