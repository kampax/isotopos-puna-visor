/**
 * Visor de Isótopos Andinos — Controlador de Interfaz y Lógica Reactiva
 * Adaptado a Isotopos completo2026.csv (300 muestras)
 */
'use strict';

(function () {
  const $ = id => document.getElementById(id);
  const M = window.IsotopeModel;
  const recordsById = new Map(window.DATA.map(r => [Number(r.id), r]));
  const visibleOrigins = new Set(['propio', 'bibliografía']);
  const chartOrigins = {
    id: 'chartOrigins',
    beforeUpdate(instance) {
      for (const dataset of instance.data.datasets) {
        if (!dataset.waterType && !dataset.selection) continue;
        dataset.allPoints ??= dataset.data;
        dataset.data = dataset.allPoints.filter(point => visibleOrigins.has(recordsById.get(Number(point.id))?.dato));
        if (dataset.waterType) {
          dataset.label = dataset.label.replace(/\(\d+\)$/, `(${dataset.data.length})`);
        }
      }
    }
  };

  // Etiquetas de las series mensuales, dibujadas sobre las series visibles.
  const monthlyLabels = {
    id: 'monthlyLabels',
    afterDatasetsDraw(instance) {
      if ($('frequency').value !== 'monthly') return;
      const { ctx, chartArea: area } = instance;
      const placed = [];
      ctx.save();
      ctx.font = '11px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const meta of instance.getSortedVisibleDatasetMetas()) {
        const dataset = instance.data.datasets[meta.index];
        if (!dataset.waterType) continue;
        meta.data.forEach((point, i) => {
          const record = recordsById.get(Number(dataset.data[i].id));
          const text = String(record?.etiqueta ?? '').trim();
          if (!text || point.skip || point.x < area.left || point.x > area.right || point.y < area.top || point.y > area.bottom) return;
          const width = ctx.measureText(text).width;
          const candidates = [[8, -10], [8, 12], [-width - 8, -10], [-width - 8, 12], [8, -25], [8, 27]];
          const boxes = candidates.map(([dx, dy]) => ({
            x: Math.max(area.left + 2, Math.min(point.x + dx, area.right - width - 2)),
            y: Math.max(area.top + 8, Math.min(point.y + dy, area.bottom - 8)),
            width
          }));
          const box = boxes.find(b => !placed.some(p => b.x < p.x + p.width + 4 && b.x + b.width + 4 > p.x && Math.abs(b.y - p.y) < 14)) || boxes[0];
          placed.push(box);
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 3;
          ctx.strokeText(text, box.x, box.y);
          ctx.fillStyle = '#243b45';
          ctx.fillText(text, box.x, box.y);
        });
      }
      ctx.restore();
    }
  };

  // Utilidad para escape seguro de cadenas HTML
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  // Formateador de DOI con enlace seguro
  function doiMarkup(value) {
    const raw = String(value || '').trim();
    if (!raw) return '<span style="color:#94a3b8;">DOI no informado</span>';
    const doi = raw.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
    return /^10\.\d{4,9}\/\S+$/i.test(doi)
      ? `<a href="https://doi.org/${encodeURIComponent(doi)}" target="_blank" rel="noopener noreferrer">${esc(doi)}</a>`
      : esc(raw);
  }

  // Formateador de cita corta para autor/campaña
  function formatShortCitation(ref) {
    const raw = String(ref || '').trim();
    if (!raw) return 'Sin procedencia';
    return raw.length > 35 ? raw.slice(0, 32) + '…' : raw;
  }

  // Formato numérico en español
  const fmt = (n, d = 2) => (n === null || n === undefined || isNaN(n))
    ? '—'
    : Number(n).toLocaleString('es-AR', { maximumFractionDigits: d });

  const label = s => String(s || '').replaceAll('_', ' ');
  const selectedValues = id => Array.from($(id).selectedOptions).map(o => o.value);

  // Los conteos se calculan desde el CSV convertido, también tras añadir muestras.
  const countOwn = window.DATA.filter(r => r.dato === 'propio').length;
  const countBibliography = window.DATA.filter(r => r.dato === 'bibliografía').length;
  $('datasetSubtitle').textContent = `Explorador Hidrogeológico y Meteorológico · Tabla Completa 2026 (${window.DATA.length} muestras)`;
  $('datasetSummary').textContent = `Dataset Completo 2026: ${window.DATA.length} registros, ${countOwn} propios y ${countBibliography} bibliográficos. Los orígenes y las campañas disponibles se muestran en los filtros.`;
  for (const option of $('dataType').options) {
    const counts = { all: window.DATA.length, propio: countOwn, 'bibliografía': countBibliography };
    option.textContent += ` (${counts[option.value]})`;
  }

  // Poblar selector de Tipo de Muestra
  const typeSelect = $('type');
  const uniqueTypes = [...new Set(window.DATA.map(r => r.tipo))].filter(Boolean).sort();
  for (const t of uniqueTypes) {
    const sampleRec = window.DATA.find(r => r.tipo === t);
    const opt = document.createElement('option');
    opt.value = t;
    opt.selected = t === 'rainwater';
    opt.textContent = sampleRec ? sampleRec.tipo_label : label(t);
    typeSelect.append(opt);
  }

  // Habilitar selección múltiple con clic directo (toggle) sin tecla Ctrl/Cmd
  function enableToggleMulti(id) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('mousedown', e => {
      const option = e.target.closest('option');
      if (!option) return;
      e.preventDefault();
      const scrollPos = el.scrollTop;
      option.selected = !option.selected;
      el.focus();
      el.scrollTop = scrollPos;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  enableToggleMulti('type');
  enableToggleMulti('publication');
  enableToggleMulti('campaign');

  // Paleta cromática por tipo de agua
  const colorByType = {
    'rainwater': '#0284c7',
    'snow': '#06b6d4',
    'spring of water': '#16a34a',
    'groundwater': '#0d9488',
    'river': '#2563eb',
    'water channel': '#3b82f6',
    'lagoon': '#d97706',
    'water pools': '#b45309',
    'fog': '#8b5cf6'
  };

  const getColor = r => colorByType[r.tipo] || '#64748b';

  // Capas base de mapas: OpenStreetMap (OSM-DE libre de bloqueo 403) + Esri
  const osmStandard = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxNativeZoom: 18,
    maxZoom: 21,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  });

  const esriTopo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 21,
    attribution: 'Tiles &copy; Esri &mdash; Topographic map'
  });

  const esriStreet = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 21,
    attribution: 'Tiles &copy; Esri &mdash; Street Map'
  });

  const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 21,
    attribution: 'Tiles &copy; Esri &mdash; Satellite imagery'
  });

  // Inicialización del Mapa Leaflet
  const map = L.map('map', {
    preferCanvas: true,
    zoomSnap: 0.5,
    layers: [osmStandard]
  }).setView([-25.0, -67.0], 7);

  const markerLayer = L.layerGroup().addTo(map);

  const baseMaps = {
    'OpenStreetMap (Estándar)': osmStandard,
    'Relieve Topográfico (Esri)': esriTopo,
    'Callejero Detallado (Esri)': esriStreet,
    'Satelital de Alta Resolución (Esri)': esriSatellite
  };
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

  let current = [];
  let chart = null;
  let updating = false;
  let selectedId = null;
  const markerById = new Map();

  // Bounding box inicial con todos los puntos geográficos
  const validGeoPoints = window.DATA.filter(M.geo).map(r => [r.latitud, r.longitud]);
  function showInitialMapView() {
    if (!validGeoPoints.length) return;
    const allBounds = L.latLngBounds(validGeoPoints);
    const zoom = map.getBoundsZoom(allBounds, false, L.point(48, 48));
    const center = allBounds.getCenter();
    center.lat += 1.6; // Dar más espacio al extremo norte de la Puna argentina.
    map.setView(center, Math.min(zoom + 0.5, 13));
  }
  showInitialMapView();

  // Lectura unificada del estado de los filtros
  function readFilters() {
    const b = map.getBounds();
    return {
      search: $('quickSearch') ? $('quickSearch').value : '',
      dataType: $('dataType') ? $('dataType').value : 'all',
      type: selectedValues('type'),
      ownOrigin: selectedValues('campaign'),
      bibliographyOrigin: selectedValues('publication'),
      frequency: $('frequency') ? $('frequency').value : 'all',
      min: $('min').value === '' ? null : Number($('min').value),
      max: $('max').value === '' ? null : Number($('max').value),
      unknownHeight: $('unknownHeight').checked,
      noCoords: $('noCoords').checked,
      bounds: $('viewport').checked ? [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()] : null
    };
  }

  // Actualización reactiva de las fuentes según los demás filtros activos
  function updatePublications(f) {
    const rows = M.filter(window.DATA, { ...f, ownOrigin: [], bibliographyOrigin: [] });
    const retained = {};
    for (const [id, key, source, noun] of [
      ['campaign', 'ownOrigin', 'propio', 'campañas'],
      ['publication', 'bibliographyOrigin', 'bibliografía', 'publicaciones']
    ]) {
      const chosen = new Set(f[key]);
      const available = [...new Set(rows.filter(r => r.dato === source).map(r => r.origen).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'));
      const scrollTop = $(id).scrollTop;
      $(id).replaceChildren(...available.map(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        opt.title = val;
        opt.selected = chosen.has(val);
        return opt;
      }));
      $(id).scrollTop = scrollTop;
      retained[key] = available.filter(val => chosen.has(val));
      $(`${id}Count`).textContent = `${fmt(available.length, 0)} ${noun} disponibles${retained[key].length ? ` · ${retained[key].length} seleccionada(s)` : ''}.`;
    }
    return retained;
  }

  // Dataset para la muestra seleccionada en el gráfico
  function selectedDataset(r) {
    return {
      type: 'scatter',
      selection: true,
      label: 'Muestra seleccionada',
      data: [{ x: r.d18O, y: r.d2H, id: r.id }],
      pointRadius: 9,
      pointHoverRadius: 10,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#9d174d',
      pointBorderWidth: 3.5,
      order: -1
    };
  }

  // Sincronización del estado de selección visual (mapa, gráfico, tabla, detalle)
  function syncSelection() {
    // Restaurar estilo de marcadores
    for (const marker of new Set(markerById.values())) {
      marker.setStyle(marker.baseStyle);
    }

    // Resaltar marcador activo en el mapa
    const activeMarker = markerById.get(selectedId);
    if (activeMarker) {
      activeMarker.setStyle({
        radius: 12,
        color: '#9d174d',
        weight: 4,
        fillColor: '#ffffff',
        fillOpacity: 0.95
      });
      if (!map.getBounds().contains(activeMarker.getLatLng())) {
        map.panTo(activeMarker.getLatLng());
      }
    }

    for (const card of document.querySelectorAll('.popup-item-card')) {
      card.classList.toggle('is-selected', Number(card.dataset.cardId) === Number(selectedId));
    }

    // Resaltar fila activa en la tabla
    for (const row of $('rows').rows) {
      const active = Number(row.dataset.id) === Number(selectedId);
      row.classList.toggle('is-selected', active);
      row.setAttribute('aria-selected', String(active));
    }

    // Sincronizar en el gráfico Chart.js
    if (chart) {
      const ds = chart.data.datasets;
      const idx = ds.findIndex(d => d.selection);
      const selRec = current.find(v => Number(v.id) === Number(selectedId));

      if (selRec && M.pair(selRec)) {
        if (idx >= 0) {
          ds[idx] = selectedDataset(selRec);
        } else {
          ds.unshift(selectedDataset(selRec));
        }
      } else if (idx >= 0) {
        ds.splice(idx, 1);
      }
      chart.update('none');
    }

    // Actualizar banner de selección
    const r = current.find(v => Number(v.id) === Number(selectedId));
    if (!r) {
      $('selectionStatus').textContent = '';
    } else if (M.pair(r)) {
      $('selectionStatus').textContent = `Muestra seleccionada: ID ${r.id} · ${r.etiqueta || r.vega || 'Sin etiqueta'}`;
    } else {
      $('selectionStatus').textContent = `Muestra seleccionada: ID ${r.id}; no posee el par isotópico δ¹⁸O–δ²H completo para graficar.`;
    }
  }

  // Selección activa de una muestra e inspección en la ficha de detalle
  function selectSample(id) {
    const r = window.DATA.find(v => Number(v.id) === Number(id));
    if (!r) return;

    selectedId = r.id;

    const items = [
      ['ID Maestro / Etiqueta', `${r.id} · ${r.etiqueta || 'Sin etiqueta'}`],
      ['Sitio / Vega', r.vega || 'Sin información'],
      ['Tipo de Agua', `${r.tipo_label} (${r.tipo_original || r.tipo})`],
      ['Procedencia del Dato', r.dato === 'propio' ? 'Dato propio (campaña de campo)' : 'Compilación bibliográfica'],
      ['Cota / Fecha de Muestreo', `${fmt(r.ele, 0)} m s. n. m. · ${r.time || 'Sin fecha'}`],
      ['Frecuencia', r.frequencia === 'monthly' ? 'Serie mensual continua' : 'Muestreo puntual (unique)'],
      ['Coordenadas Geográficas', M.geo(r) ? `${r.latitud.toFixed(5)}, ${r.longitud.toFixed(5)}` : 'Sin coordenadas registradas'],
      ['Par Isotópico', `δ¹⁸O: ${fmt(r.d18O, 2)} ‰ · δ²H: ${fmt(r.d2H, 2)} ‰ (d-excess: ${fmt(r.d_exceso, 2)} ‰)`],
      ['Conductividad Eléctrica', r.ce_us_cm !== null ? `${fmt(r.ce_us_cm, 1)} µS/cm ${r.conductividad ? `(Cond: ${fmt(r.conductividad, 1)})` : ''}` : (r.ce_raw ? r.ce_raw : (r.conductividad ? `Cond: ${fmt(r.conductividad, 1)}` : 'No informada'))],
      ['ppm Cloruro / pH', (r.ppm_cl !== null || r.ph !== null) ? `Cl: ${fmt(r.ppm_cl, 2)} ppm · pH: ${fmt(r.ph, 2)}` : (r.ppm_cl_raw ? `Cl: ${r.ppm_cl_raw} · pH: ${fmt(r.ph, 2)}` : 'No informados')],
      ['Caudal Estimado', r.caudal || 'No informado'],
      ['Origen / Campaña / Cita', r.origen || '—'],
      ['DOI del Artículo', r.doi],
      ['Notas y Observaciones', r.nota || 'Ninguna']
    ];

    $('detail').innerHTML = `
      <div class="sample-detail-header">
        <h3>Ficha Técnica · Muestra ID ${esc(r.id)} (${esc(r.etiqueta || r.vega)})</h3>
      </div>
      <div class="sample-detail-grid">
        ${items.map(([lbl, val]) => `
          <div class="detail-item">
            <span class="detail-label">${esc(lbl)}</span>
            <span class="detail-value">${lbl === 'DOI del Artículo' ? doiMarkup(val) : esc(val)}</span>
          </div>
        `).join('')}
      </div>
    `;

    syncSelection();
  }

  // Redibujado general reactivo
  function redraw() {
    updating = true;
    const f = readFilters();
    Object.assign(f, updatePublications(f));

    const isInvalidHeight = f.min !== null && f.max !== null && f.min > f.max;
    const errorEl = $('error');
    if (isInvalidHeight) {
      errorEl.textContent = 'La altura mínima supera la máxima. Por favor, corrige el intervalo.';
      errorEl.classList.add('active');
    } else {
      errorEl.textContent = '';
      errorEl.classList.remove('active');
    }

    current = isInvalidHeight ? [] : M.filter(window.DATA, f);

    const mapped = current.filter(M.geo);
    const pairs = current.filter(M.pair);
    const fitResult = M.fit(pairs);

    const countPropio = current.filter(r => r.dato === 'propio').length;
    const countBiblio = current.filter(r => r.dato === 'bibliografía').length;

    // Actualizar tarjetas de métricas
    $('nTotal').textContent = fmt(current.length, 0);
    $('nMap').textContent = fmt(mapped.length, 0);
    $('nGraph').textContent = fmt(pairs.length, 0);
    $('nRain').textContent = fmt(fitResult.n, 0);
    $('nSources').textContent = `${countPropio} / ${countBiblio}`;

    // Verificar si la muestra seleccionada sigue presente
    if (selectedId && !current.some(r => Number(r.id) === Number(selectedId))) {
      selectedId = null;
      $('detail').innerHTML = `
        <div class="sample-detail-header">
          <h3>Ficha de Detalle de Muestra</h3>
        </div>
        <p class="filter-help">Selecciona cualquier fila de la tabla, punto del gráfico o marcador del mapa para inspeccionar sus atributos completos.</p>
      `;
    }

    // Actualizar Capa del Mapa Leaflet
    markerLayer.clearLayers();
    markerById.clear();

    const groups = new Map();
    for (const r of mapped) {
      const key = `${r.latitud},${r.longitud}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    for (const group of groups.values()) {
      const rep = group[0];
      const popupDiv = document.createElement('div');

      const title = document.createElement('div');
      title.style.fontWeight = '700';
      title.style.marginBottom = '6px';
      title.style.borderBottom = '1px solid #e2e8f0';
      title.style.paddingBottom = '4px';
      title.textContent = `${group.length} muestra(s) en ${rep.latitud.toFixed(4)}, ${rep.longitud.toFixed(4)}`;
      popupDiv.append(title);

      for (const item of group) {
        const itemCard = document.createElement('div');
        itemCard.className = 'popup-item-card' + (Number(item.id) === Number(selectedId) ? ' is-selected' : '');
        itemCard.dataset.cardId = item.id;

        const btn = document.createElement('button');
        btn.className = 'popup-item-btn';
        btn.dataset.id = item.id;
        btn.textContent = `ID ${item.id} · ${item.etiqueta || item.vega} · ${item.tipo_label}`;
        btn.addEventListener('click', () => selectSample(item.id));
        itemCard.append(btn);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'popup-meta';

        const authorBadge = document.createElement('div');
        authorBadge.className = 'popup-author-badge';
        authorBadge.innerHTML = `<span>📖</span> <span>${esc(formatShortCitation(item.origen))}</span>`;
        metaDiv.append(authorBadge);

        const heightLine = document.createElement('div');
        heightLine.className = 'popup-doi-line';
        heightLine.textContent = Number.isFinite(item.ele)
          ? `Altura: ${fmt(item.ele, 0)} m s. n. m.`
          : 'Altura: no informada';
        metaDiv.append(heightLine);

        if (item.d18O !== null && item.d2H !== null) {
          const isoLine = document.createElement('div');
          isoLine.className = 'popup-doi-line';
          isoLine.innerHTML = `<strong>δ¹⁸O:</strong> ${fmt(item.d18O, 2)} ‰ · <strong>δ²H:</strong> ${fmt(item.d2H, 2)} ‰`;
          metaDiv.append(isoLine);
        }

        if (item.doi) {
          const doiLine = document.createElement('div');
          doiLine.className = 'popup-doi-line';
          doiLine.innerHTML = `<strong>DOI:</strong> ${doiMarkup(item.doi)}`;
          metaDiv.append(doiLine);
        }

        itemCard.append(metaDiv);
        popupDiv.append(itemCard);
      }

      const baseRadius = Math.min(13, 4.5 + Math.log2(group.length) * 2);
      const c = getColor(rep);
      const baseStyle = {
        radius: baseRadius,
        color: c,
        weight: 1.5,
        fillColor: c,
        fillOpacity: 0.7
      };

      const marker = L.circleMarker([rep.latitud, rep.longitud], baseStyle)
        .bindPopup(popupDiv, { maxWidth: 350 })
        .addTo(markerLayer);

      marker.baseStyle = baseStyle;
      for (const item of group) {
        markerById.set(item.id, marker);
      }
    }

    $('mapNote').textContent = `${fmt(groups.size, 0)} ubicaciones agrupadas para ${fmt(mapped.length, 0)} registros en mapa. ${fmt(current.length - mapped.length, 0)} registros seleccionados sin coordenadas.`;

    // Configuración del Gráfico Isotópico
    let lo = pairs.length ? Math.min(...pairs.map(r => r.d18O)) : -25;
    let hi = pairs.length ? Math.max(...pairs.map(r => r.d18O)) : 5;
    const pad = Math.max(1, (hi - lo) * 0.08);
    lo -= pad;
    hi += pad;

    const datasets = [{
      type: 'line',
      label: 'Recta Universal: δ²H = 8δ¹⁸O + 10',
      data: [{ x: lo, y: 8 * lo + 10 }, { x: hi, y: 8 * hi + 10 }],
      borderColor: '#64748b',
      borderDash: [6, 5],
      borderWidth: 1.8,
      pointRadius: 0,
      showLine: true,
      order: 2
    }];

    // Contar únicamente las muestras que participan en el ajuste.
    const fitOwn = fitResult.rows.filter(r => r.dato === 'propio').length;
    const fitBibliography = fitResult.rows.filter(r => r.dato === 'bibliografía').length;
    const fitCounts = `n = ${fitResult.n} (${fitOwn} propios · ${fitBibliography} bibliográficos)`;

    // Recta meteórica local LMWL
    if (fitResult.ok) {
      datasets.push({
        type: 'line',
        label: `Recta Local (LMWL): ${fitResult.equation}`,
        data: [{ x: lo, y: fitResult.slope * lo + fitResult.intercept }, { x: hi, y: fitResult.slope * hi + fitResult.intercept }],
        borderColor: '#dc2626',
        borderWidth: 2.2,
        pointRadius: 0,
        showLine: true,
        order: 1
      });
      $('regression').className = 'equation-banner active';
      $('regression').textContent = `LMWL Local OLS: ${fitResult.equation} · R² = ${fitResult.r2.toFixed(4)} · ${fitCounts}`;
    } else {
      $('regression').className = 'equation-banner';
      $('regression').textContent = `${fitResult.reason || 'Sin muestras suficientes para el ajuste LMWL.'} · ${fitCounts}`;
    }

    // Datasets por tipo de agua (distinguiendo con/sin coordenadas)
    const typesPresent = [...new Set(pairs.map(r => r.tipo))].sort();
    for (const t of typesPresent) {
      const ptsGeo = pairs.filter(r => r.tipo === t && M.geo(r));
      const ptsNoGeo = pairs.filter(r => r.tipo === t && !M.geo(r));
      const col = colorByType[t] || '#64748b';
      const typeLabel = (ptsGeo[0] || ptsNoGeo[0])?.tipo_label || label(t);

      if (ptsGeo.length) {
        datasets.push({
          type: 'scatter',
          waterType: t,
          label: `${typeLabel} (${ptsGeo.length})`,
          data: ptsGeo.map(r => ({ x: r.d18O, y: r.d2H, id: r.id })),
          backgroundColor: col,
          borderColor: col,
          pointRadius: 5,
          pointHoverRadius: 7,
          order: 3
        });
      }

      if (ptsNoGeo.length) {
        datasets.push({
          type: 'scatter',
          waterType: t,
          label: `${typeLabel} sin coords (${ptsNoGeo.length})`,
          data: ptsNoGeo.map(r => ({ x: r.d18O, y: r.d2H, id: r.id })),
          backgroundColor: 'transparent',
          borderColor: col,
          borderWidth: 1.8,
          pointRadius: 5.5,
          pointHoverRadius: 7.5,
          order: 4
        });
      }
    }

    // Dataset de selección si existe
    const selRec = current.find(v => Number(v.id) === Number(selectedId));
    if (selRec && M.pair(selRec)) {
      datasets.unshift(selectedDataset(selRec));
    }

    if (chart) {
      chart.data.datasets = datasets;
      chart.options.scales.x.min = Math.floor(lo);
      chart.options.scales.x.max = Math.ceil(hi);
      chart.update();
    } else {
      const ctx = $('plot').getContext('2d');
      chart = new Chart(ctx, {
        type: 'scatter',
        plugins: [chartOrigins, monthlyLabels],
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              onClick(event, item, legend) {
                const instance = legend.chart;
                const index = item.datasetIndex;
                const chosen = instance.data.datasets[index];
                if (event.native?.detail === 2) {
                  instance.data.datasets.forEach((dataset, i) => {
                    // Aislar el tipo incluye sus muestras con y sin coordenadas.
                    // Las rectas conservan su visibilidad como referencia.
                    if (chosen.waterType && (dataset.waterType || dataset.selection)) {
                      instance.setDatasetVisibility(i, dataset.waterType === chosen.waterType);
                    } else if (!chosen.waterType) {
                      instance.setDatasetVisibility(i, i === index);
                    }
                  });
                } else {
                  instance.setDatasetVisibility(index, !instance.isDatasetVisible(index));
                }
                instance.update();
              },
              labels: {
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
                font: { family: 'Outfit, sans-serif', size: 11.5 }
              }
            },
            tooltip: {
              callbacks: {
                label(context) {
                  const pt = context.raw;
                  const item = window.DATA.find(r => Number(r.id) === Number(pt.id));
                  if (!item) return `δ¹⁸O: ${pt.x}, δ²H: ${pt.y}`;
                  return [
                    `ID ${item.id}: ${item.etiqueta || item.vega}`,
                    `Tipo: ${item.tipo_label} (${item.dato})`,
                    `δ¹⁸O: ${fmt(pt.x, 2)} ‰, δ²H: ${fmt(pt.y, 2)} ‰ (d: ${fmt(item.d_exceso, 2)} ‰)`,
                    `Origen: ${formatShortCitation(item.origen)}`
                  ];
                }
              }
            }
          },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: Math.floor(lo),
              max: Math.ceil(hi),
              title: { display: true, text: 'δ¹⁸O (‰ VSMOW)', font: { weight: '600', size: 12 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y: {
              type: 'linear',
              title: { display: true, text: 'δ²H (‰ VSMOW)', font: { weight: '600', size: 12 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          },
          onClick(e, elements) {
            if (!elements.length) return;
            const el = elements[0];
            const pt = chart.data.datasets[el.datasetIndex].data[el.index];
            if (pt && pt.id) {
              selectSample(pt.id);
            }
          }
        }
      });
    }

    $('plotNote').textContent = `${pairs.filter(r => !M.geo(r)).length} pares sin coordenadas representados. Clic en la leyenda: mostrar/ocultar; doble clic: aislar un tipo (con y sin coordenadas). El ajuste LMWL OLS usa precipitación y nieve de los filtros (${fitCounts}); ocultar series en la leyenda no cambia el cálculo. Restablecer recupera la vista completa.`;

    // Actualizar Tabla de Registros
    $('tableCount').textContent = `${fmt(current.length, 0)} registros`;
    $('downloadXlsx').disabled = !current.length;

    $('rows').innerHTML = current.map(r => {
      const isSelected = Number(r.id) === Number(selectedId);
      const datoBadge = r.dato === 'propio'
        ? `<span class="badge-clean">Propio</span>`
        : `<span class="badge-issue" style="background:#f3e8ff; color:#7e22ce;">Biblio</span>`;

      return `
        <tr tabindex="0"
            aria-selected="${isSelected}"
            class="${isSelected ? 'is-selected' : ''}"
            data-id="${esc(r.id)}">
          <td>${r.id}</td>
          <td><strong>${esc(r.etiqueta || '—')}</strong></td>
          <td>${esc(r.vega || '—')}</td>
          <td>${esc(r.tipo_label)}</td>
          <td>${fmt(r.ele, 0)}</td>
          <td>${esc(r.time || '—')}</td>
          <td>${fmt(r.d18O, 2)}</td>
          <td>${fmt(r.d2H, 2)}</td>
          <td>${fmt(r.d_exceso, 2)}</td>
          <td>${esc(formatShortCitation(r.origen))}</td>
          <td>${datoBadge}</td>
        </tr>
      `;
    }).join('');

    syncSelection();
    updating = false;
  }

  // Delegación de eventos en tabla
  $('rows').addEventListener('click', e => {
    const tr = e.target.closest('tr');
    if (tr && tr.dataset.id) {
      selectSample(tr.dataset.id);
    }
  });

  $('rows').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const tr = e.target.closest('tr');
      if (tr && tr.dataset.id) {
        e.preventDefault();
        selectSample(tr.dataset.id);
      }
    }
  });

  // Eventos de cambios en controles de filtro
  for (const [id, origin] of [['plotOwn', 'propio'], ['plotBibliography', 'bibliografía']]) {
    $(id).addEventListener('click', () => {
      if (visibleOrigins.has(origin)) visibleOrigins.delete(origin);
      else visibleOrigins.add(origin);
      $(id).setAttribute('aria-pressed', String(visibleOrigins.has(origin)));
      if (chart) chart.update();
    });
  }

  const filterInputs = ['dataType', 'type', 'campaign', 'publication', 'frequency', 'min', 'max', 'unknownHeight', 'noCoords', 'viewport'];
  for (const id of filterInputs) {
    const el = $(id);
    if (el) el.addEventListener('change', redraw);
  }

  // Reactividad con el mapa si el checkbox de viewport está activo
  map.on('moveend', () => {
    if ($('viewport').checked && !updating) {
      redraw();
    }
  });

  // Búsqueda rápida con debouncing ligero
  let searchTimer = null;
  if ($('quickSearch')) {
    $('quickSearch').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(redraw, 180);
    });
  }

  // Botones de presets de altitud
  $('above3200').onclick = () => {
    $('min').value = 3200;
    $('max').value = '';
    redraw();
  };

  $('clearHeight').onclick = () => {
    $('min').value = '';
    $('max').value = '';
    redraw();
  };

  // Botón para encuadrar selección en el mapa
  $('fit').onclick = () => {
    const validRows = current.filter(M.geo);
    if (validRows.length) {
      map.fitBounds(validRows.map(r => [r.latitud, r.longitud]), {
        padding: [24, 24],
        maxZoom: 13
      });
    }
  };

  // Descarga de Excel (.xlsx) con SheetJS
  $('downloadXlsx').onclick = async () => {
    const btn = $('downloadXlsx');
    const status = $('downloadStatus');
    if (!current.length) return;

    btn.disabled = true;
    status.textContent = `Generando libro Excel con ${fmt(current.length, 0)} registros…`;

    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      window.IsotopeExport.downloadExcel(current, 'Isotopos_Completo_Puna_2026.xlsx', window.XLSX);
      status.textContent = `Descarga solicitada: Isotopos_Completo_Puna_2026.xlsx (${current.length} registros)`;
    } catch (err) {
      console.error(err);
      status.textContent = 'Error al generar el archivo Excel. Por favor, reintenta.';
    } finally {
      btn.disabled = !current.length;
    }
  };

  // Botón Restablecer
  $('reset').onclick = () => {
    visibleOrigins.add('propio');
    visibleOrigins.add('bibliografía');
    $('plotOwn').setAttribute('aria-pressed', 'true');
    $('plotBibliography').setAttribute('aria-pressed', 'true');
    if (chart) {
      chart.destroy();
      chart = null;
    }
    if ($('quickSearch')) $('quickSearch').value = '';
    if ($('dataType')) $('dataType').value = 'all';
    if ($('frequency')) $('frequency').value = 'all';

    for (const id of ['type', 'campaign', 'publication']) {
      const select = $(id);
      if (select) {
        for (const opt of select.options) {
          opt.selected = false;
        }
      }
    }
    $('min').value = '';
    $('max').value = '';
    $('unknownHeight').checked = true;
    $('noCoords').checked = true;
    $('viewport').checked = false;

    showInitialMapView();
    redraw();
  };

  // Inicialización inmediata
  redraw();

})();
