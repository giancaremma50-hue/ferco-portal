async function loadCountryData(pais) {
  const res = await fetch(`/api/data-get?pais=${pais}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function initCountryData(pais, password) {
  const res = await fetch('/api/data-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
    body: JSON.stringify({ pais }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function saveCountryData(pais, data, password) {
  const res = await fetch('/api/data-save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
