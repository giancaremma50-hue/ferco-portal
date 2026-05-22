const { getCountryData } = require('./_shared/blobs');

const VALID_PAISES = ['GT', 'HN', 'SV'];

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const pais = (event.queryStringParameters?.pais || '').toUpperCase();

  if (!VALID_PAISES.includes(pais)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'pais requerido: GT, HN o SV' }),
    };
  }

  try {
    const data = await getCountryData(pais);
    if (!data) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Datos no encontrados' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    console.error('data-get error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
