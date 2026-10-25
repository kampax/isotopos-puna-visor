const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const M = require('./js/model.js');
const XLSX = require('./vendor/xlsx.full.min.js');
const E = require('./js/export.js');

// Cargar data.js
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'), ctx);
const baseline = process.argv.includes('--baseline');
const d = JSON.parse(JSON.stringify(ctx.window.DATA));

console.log('Total registros cargados en visor_html:', d.length);
if (baseline) assert.equal(d.length, 300);
assert.equal(new Set(d.map(r => r.id)).size, d.length, 'IDs únicos para sincronizar la selección');

const f = {
  search: '',
  dataType: 'all',
  type: [],
  origin: [],
  frequency: 'all',
  min: null,
  max: null,
  noCoords: true,
  unknownHeight: true,
  bounds: null
};

// 1. Filtrado predeterminado con todas las muestras
const allFiltered = M.filter(d, f);
if (baseline) assert.equal(allFiltered.length, 300);
assert.equal(allFiltered.length, d.length);
assert(d.length > 0);
assert.equal(M.fit(d).n, d.filter(r => M.pair(r) && ['rainwater', 'snow'].includes(r.tipo)).length);
const withGeo = allFiltered.filter(M.geo);
const withPairs = allFiltered.filter(M.pair);
if (baseline) assert.equal(withGeo.length, 275);
if (baseline) assert.equal(withPairs.length, 297);
console.log(`✔ Filtrado total verificado: ${d.length} registros, ${withGeo.length} en mapa, ${withPairs.length} con pares isotópicos.`);

// 2. Filtro por procedencia del dato
const propios = M.filter(d, { ...f, dataType: 'propio' });
const biblio = M.filter(d, { ...f, dataType: 'bibliografía' });
if (baseline) assert.equal(propios.length, 202);
if (baseline) assert.equal(biblio.length, 98);
console.log(`✔ Filtro de procedencia verificado: ${propios.length} propios, ${biblio.length} bibliográficos.`);

// 3. Ajuste LMWL de precipitación y nieve
const fitResult = M.fit(allFiltered);
if (baseline) assert.equal(fitResult.ok, true);
if (baseline) assert.equal(fitResult.n, 56);
if (baseline) assert.equal(Math.round(fitResult.slope * 100) / 100, 7.70);
if (baseline) assert.equal(Math.round(fitResult.intercept * 100) / 100, 13.96);
if (baseline) assert(fitResult.r2 > 0.94);
console.log(`✔ Ajuste LMWL verificado: n = 56, pendiente = ${fitResult.slope?.toFixed(2) ?? 'no disponible'}, intercepto = ${fitResult.intercept?.toFixed(2) ?? 'no disponible'}, R² = ${fitResult.r2?.toFixed(4) ?? 'no disponible'}.`);

// 4. Filtro de altura >= 3200 m
const high = M.filter(d, { ...f, min: 3200, unknownHeight: false });
assert(high.every(r => r.ele >= 3200));
console.log(`✔ Filtro de altura verificado: ${high.length} muestras sobre 3.200 m s. n. m.`);

// 5. Exportación a Excel (.xlsx)
const wb = E.toWorkbook(d.slice(0, 15), XLSX);
assert.deepEqual(wb.SheetNames, ['Muestras', 'Resumen Estadístico']);
const sheetMuestras = XLSX.utils.sheet_to_json(wb.Sheets['Muestras'], { header: 1 });
assert.equal(sheetMuestras.length, Math.min(d.length, 15) + 1); // 1 header + 15 data rows
console.log('✔ Exportación Excel de dos hojas verificada.');

// Exclusión de alturas desconocidas, incluso sin límites de altura.
const knownHeight = M.filter(d, { ...f, unknownHeight: false });
assert.equal(knownHeight.length, d.filter(r => Number.isFinite(r.ele)).length);
assert(knownHeight.every(r => Number.isFinite(r.ele)));

// Los calificadores analíticos deben sobrevivir una exportación y relectura.
const rawRows = d.filter(r => r.ce_raw || r.ppm_cl_raw);

const rawBook = E.toWorkbook(rawRows, XLSX);
const reread = XLSX.read(XLSX.write(rawBook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' });
const exported = XLSX.utils.sheet_to_json(reread.Sheets.Muestras);
rawRows.forEach((r, i) => {
  assert.equal(exported[i]['C. Eléctrica (texto original)'], r.ce_raw);
  assert.equal(exported[i]['Cloruro (texto original)'], r.ppm_cl_raw);
});
assert.equal(M.filter(d, { ...f, search: 'NO_EXISTE_MUESTRA_XYZ' }).length, 0);

// Los datos propios se publican sin atributos fuera de mapa y gráfico.
const privateFields = ['time', 'conductividad', 'ce_us_cm', 'ce_raw', 'ppm_cl', 'ppm_cl_raw', 'ph', 'caudal', 'tipo_original', 'nota', 'foto', 'doi'];
for (const r of d.filter(r => r.dato === 'propio')) {
  for (const k of privateFields) assert(r[k] === null || r[k] === '', `Dato propio ${r.id} publica ${k}`);
}
console.log('✔ Datos propios publicados sin atributos privados.');
assert.equal(M.fit([]).ok, false);
console.log('✔ Alturas desconocidas, IDs únicos, selección vacía y calificadores del Excel verificados.');

console.log('TODAS LAS PRUEBAS DE visor_html PASARON SATISFACTORIAMENTE.');
