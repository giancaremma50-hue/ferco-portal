const { validatePassword } = require('./_shared/auth');
const { setCountryData } = require('./_shared/blobs');

const VALID_PAISES = ['GT', 'HN', 'SV'];

function isoWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function buildSnapshot(body) {
  const today = new Date().toISOString().split('T')[0];
  const mesKey = today.substring(0, 7);
  const semana = isoWeek(today);
  const sucursales = {};

  function avgVals(rows, keys) {
    const vals = [];
    for (const row of rows) {
      for (const k of keys) {
        const v = parseFloat(row.valores?.[k]);
        if (!isNaN(v)) vals.push(v);
      }
    }
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  const allRows = [...(body.bdo || []), ...(body.x4x || [])];
  const sucNames = [...new Set(allRows.map((r) => r.sucursal).filter(Boolean))];

  for (const suc of sucNames) {
    const bdoRows = (body.bdo || []).filter((r) => r.sucursal === suc);
    const x4xRows = (body.x4x || []).filter((r) => r.sucursal === suc);
    const qrCols = body.config?.bdoCols?.qr || [];
    const vidCols = body.config?.bdoCols?.video || [];
    const sesCols = body.config?.sesCols || [];

    const entry = {};
    if (bdoRows.length && qrCols.length) entry.bdo_qr = avgVals(bdoRows, qrCols);
    if (bdoRows.length && vidCols.length) entry.bdo_video = avgVals(bdoRows, vidCols);
    sesCols.forEach((col, i) => {
      if (x4xRows.length) entry[`4x4_s${i + 1}`] = avgVals(x4xRows, [col]);
    });

    if (Object.keys(entry).length) sucursales[suc] = entry;
  }

  return { fecha: today, semana, mesKey, sucursales };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  const password = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!validatePassword(password)) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  // Ping de verificación de contraseña — no escribe datos
  if (body?._authTest === true) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, authTest: true }) };
  }

  const pais = (body?.pais || '').toUpperCase();
  if (!VALID_PAISES.includes(pais)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'pais inválido' }) };
  }

  try {
    const snapshot = buildSnapshot(body);
    if (!body.historico) body.historico = { pais, cortes: [] };
    if (!Array.isArray(body.historico.cortes)) body.historico.cortes = [];
    body.historico.cortes.push(snapshot);
    body.updatedAt = new Date().toISOString();

    await setCountryData(pais, body);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, updatedAt: body.updatedAt }),
    };
  } catch (err) {
    console.error('data-save error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
