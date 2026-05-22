const { getStore } = require('@netlify/blobs');

function getCountryStore() {
  return getStore({
    name: 'ferco',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_TOKEN,
  });
}

async function getCountryData(pais) {
  const store = getCountryStore();
  return store.get(`ferco-${pais.toUpperCase()}`, { type: 'json' });
}

async function setCountryData(pais, data) {
  const store = getCountryStore();
  return store.set(`ferco-${pais.toUpperCase()}`, JSON.stringify(data));
}

module.exports = { getCountryData, setCountryData };
