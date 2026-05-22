/**
 * Script de migración única:
 * Lee los 3 HTML existentes, extrae los datos embebidos, los normaliza
 * al nuevo esquema JSON y los sube a Netlify Blob Storage vía la API.
 *
 * Uso:
 *   ADMIN_PASSWORD=tu_clave SITE_URL=https://ferco.netlify.app node scripts/seed.js
 *
 * Para prueba local con netlify dev corriendo en puerto 8888:
 *   ADMIN_PASSWORD=tu_clave SITE_URL=http://localhost:8888 node scripts/seed.js
 */

const fs = require('fs');
const path = require('path');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SITE_URL = (process.env.SITE_URL || 'http://localhost:8888').replace(/\/$/, '');

if (!ADMIN_PASSWORD) {
  console.error('ERROR: Define ADMIN_PASSWORD como variable de entorno.');
  process.exit(1);
}

// Los HTML están en la carpeta padre (Downloads/Dashboard 4x4)
const SRC_DIR = path.join(__dirname, '..', '..', 'Dashboard 4x4');

const FILES = {
  GT: path.join(SRC_DIR, 'dashboard_GT.html'),
  HN: path.join(SRC_DIR, 'dashboard_HN.html'),
  SV: path.join(SRC_DIR, 'dashboard_SV.html'),
};

function extractConst(html, name) {
  // Captura desde "const NAME=" hasta el próximo "const CAPS=" o "</script>"
  const re = new RegExp(`const ${name}=([\\s\\S]*?)(?=\\s*(?:const [A-Z][A-Z0-9_]*=|<\\/script>))`);
  const m = html.match(re);
  if (!m) return null;
  const raw = m[1].trim().replace(/;\s*$/, '');
  try {
    return JSON.parse(raw.trim().replace(/;\s*$/, ''));
  } catch (e) {
    console.warn(`  No se pudo parsear ${name}:`, e.message);
    return null;
  }
}

function extractBool(html, name) {
  return html.includes(`const ${name}=true`);
}

function normalizeBdoRow(row) {
  const dimensionKeys = [
    'Canal', 'Region', 'Zona', 'Sucursal', 'Nombre del colaborador',
    'canal', 'region', 'zona', 'sucursal',
  ];
  const valores = {};
  for (const [k, v] of Object.entries(row)) {
    if (!dimensionKeys.includes(k) && k !== 'Nombre del colaborador') {
      const n = parseFloat(v);
      valores[k] = isNaN(n) ? 0 : n;
    }
  }
  return {
    canal: row['Canal'] || row['canal'] || '',
    region: row['Region'] || row['region'] || '',
    zona: row['Zona'] || row['zona'] || '',
    sucursal: row['Sucursal'] || row['sucursal'] || '',
    nombre: row['Nombre del colaborador'] || '',
    valores,
    nota: '',
  };
}

function normalizeX4xRow(row) {
  const dimensionKeys = [
    'Canal', 'Region', 'Zona', 'Sucursal', 'Nombre del colaborador',
  ];
  const valores = {};
  for (const [k, v] of Object.entries(row)) {
    if (!dimensionKeys.includes(k)) {
      const n = parseFloat(v);
      valores[k] = isNaN(n) ? 0 : n;
    }
  }
  return {
    canal: row['Canal'] || '',
    region: row['Region'] || '',
    zona: row['Zona'] || '',
    sucursal: row['Sucursal'] || '',
    nombre: row['Nombre del colaborador'] || '',
    valores,
    nota: '',
  };
}

async function seedCountry(pais, filePath) {
  console.log(`\n[${pais}] Procesando ${filePath}...`);

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: Archivo no encontrado: ${filePath}`);
    return;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  const bdoDataRaw = extractConst(html, 'BDO_DATA') || [];
  const x4xDataRaw = extractConst(html, 'X4X_DATA') || [];
  const historicoRaw = extractConst(html, 'HISTORICO') || { pais, cortes: [] };
  const qrCols = extractConst(html, 'QR_COLS') || [];
  const vidCols = extractConst(html, 'VID_COLS') || [];
  const sesCols = extractConst(html, 'SES_COLS') || ['Sesión 1', 'Sesión 2', 'Sesión 3'];

  const solo4x4 = extractBool(html, 'SOLO_4X4');
  const tieneCanal = extractBool(html, 'TIENE_CANAL');
  const tieneRegion = extractBool(html, 'TIENE_REGION');
  const tieneZona = extractBool(html, 'TIENE_ZONA');
  const tieneResumen = extractBool(html, 'TIENE_RESUMEN');

  console.log(`  BDO rows: ${bdoDataRaw.length}, 4x4 rows: ${x4xDataRaw.length}`);
  console.log(`  QR cols: [${qrCols.join(', ')}]`);
  console.log(`  Video cols: [${vidCols.join(', ')}]`);
  console.log(`  Sesión cols: [${sesCols.join(', ')}]`);
  console.log(`  Flags: solo4x4=${solo4x4}, tieneCanal=${tieneCanal}, tieneResumen=${tieneResumen}`);

  const blob = {
    pais,
    config: {
      solo4x4,
      tieneCanal,
      tieneRegion,
      tieneZona,
      tieneResumen,
      bdoCols: { qr: qrCols, video: vidCols },
      sesCols,
    },
    bdo: bdoDataRaw.map(normalizeBdoRow),
    x4x: x4xDataRaw.map(normalizeX4xRow),
    historico: historicoRaw,
    updatedAt: new Date().toISOString(),
  };

  // Usar data-save directamente para también crear snapshot inicial
  const url = `${SITE_URL}/api/data-save`;
  console.log(`  POST ${url}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': ADMIN_PASSWORD,
    },
    body: JSON.stringify(blob),
  });

  if (res.ok) {
    const json = await res.json();
    console.log(`  ✓ ${pais} migrado OK — updatedAt: ${json.updatedAt}`);
  } else {
    const txt = await res.text();
    console.error(`  ✗ ${pais} falló: ${res.status} ${txt}`);
  }
}

(async () => {
  console.log(`Seed iniciado → ${SITE_URL}`);
  for (const [pais, file] of Object.entries(FILES)) {
    await seedCountry(pais, file);
  }
  console.log('\nSeed completado.');
})();
