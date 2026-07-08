/* ── Estado admin ── */
var ADMIN_DATA   = null;   // blob completo del país actual
var ADMIN_PAIS   = 'GT';
var ADMIN_PROG   = 'bdo';  // 'bdo' | '4x4'
var ADMIN_PASS   = '';
var ADMIN_SUC    = 'Todas'; // filtro de sucursal en el grid
var focusedColIdx = null;  // índice de la col enfocada (null = ninguna)
var _addSucReturn = null;  // función a reabrir tras crear una sucursal (addRow o editRow)

/* Configuración de columnas correcta por país (para reparar config vacío) */
var CORRECT_CONFIG = {
  GT: {
    bdoCols: {
      qr:    ['QR Griferia','QR Losa','QR SPC','QR Cerámica'],
      video: ['Video Griferia','Video de Losa','Video de SPC','Video Cerámica'],
    },
    sesCols:  ['Sesión 1','Sesión 2','Sesión 3'],
    divisors: {'QR Griferia':5,'QR Losa':5,'QR SPC':4,'QR Cerámica':5,'Sesión 1':7,'Sesión 2':7,'Sesión 3':7},
  },
  HN: {
    bdoCols: {
      qr:    ['QR Griferia','QR Losa','QR SPC','QR Cerámica'],
      video: ['Video Griferia','Video de Losa','Video de SPC','Video Cerámica'],
    },
    sesCols:  ['Sesión 1','Sesión 2','Sesión 3'],
    divisors: {'QR Griferia':5,'QR Losa':5,'QR SPC':4,'QR Cerámica':5,'Sesión 1':7,'Sesión 2':7,'Sesión 3':7},
  },
  SV: {
    bdoCols: { qr: [], video: [] },
    sesCols:  ['Sesión 1','Sesión 2','Sesión 3'],
    divisors: {'Sesión 1':7,'Sesión 2':7,'Sesión 3':7},
  },
};

/* ── Helpers de programa/divisores ── */
function getProgKey() { return ADMIN_PROG === 'bdo' ? 'bdo' : 'x4x'; }
function getDivisor(colName) {
  return ((ADMIN_DATA && ADMIN_DATA.config && ADMIN_DATA.config.divisors) || {})[colName] || 100;
}
function setDivisor(colName, val) {
  var d = Math.max(1, parseInt(val) || 100);
  if (!ADMIN_DATA.config.divisors) ADMIN_DATA.config.divisors = {};
  ADMIN_DATA.config.divisors[colName] = d;
  buildAdminGrid();
}

/* ── Auth ── */
function isAuthenticated() { return !!sessionStorage.getItem('ferco-admin-pass'); }
function storedPass()       { return sessionStorage.getItem('ferco-admin-pass') || ''; }

async function tryLogin() {
  var pw = document.getElementById('loginPw').value.trim();
  if (!pw) return;
  document.getElementById('loginErr').textContent = '';
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = 'Verificando...';
  try {
    // Ping de verificación — no escribe datos ni crea snapshots
    var res = await saveCountryData('GT', { _authTest: true }, pw);
    // Si llega aquí, la contraseña es correcta
    sessionStorage.setItem('ferco-admin-pass', pw);
    ADMIN_PASS = pw;
    document.getElementById('loginOverlay').style.display = 'none';
    loadAdminCountry(ADMIN_PAIS);
  } catch (err) {
    if (err.status === 401) {
      document.getElementById('loginErr').textContent = 'Contraseña incorrecta.';
    } else {
      document.getElementById('loginErr').textContent = 'Error: ' + err.message;
    }
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').textContent = 'Ingresar';
  }
}

/* ── Carga de datos ── */
async function loadAdminCountry(pais) {
  ADMIN_PAIS = pais;
  ADMIN_PASS = storedPass();
  setLoading(true);
  ADMIN_DATA = null;
  try {
    ADMIN_DATA = await loadCountryData(pais);
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('adminContent').innerHTML = '';
    document.getElementById('adminContent').appendChild(buildGridWrapEl());
    buildAdminGrid();
  } catch (err) {
    if (err.status === 404 && (pais === 'HN' || pais === 'SV')) {
      showEmptyState(pais);
    } else {
      showToast('Error cargando datos: ' + err.message, 'error');
    }
  }
  setLoading(false);
  updateLastUpdateLabel();
}

function showEmptyState(pais) {
  var c = document.getElementById('adminContent');
  c.style.display = 'block';
  c.innerHTML = '<div style="text-align:center;padding:60px 20px">'
    + '<p style="font-size:18px;font-weight:800;margin-bottom:8px">Sin datos para ' + pais + '</p>'
    + '<p style="color:var(--muted);font-size:13px;margin-bottom:24px">Este país no tiene datos en el sistema. Puedes inicializarlo con los datos de referencia.</p>'
    + '<button class="abtn primary" onclick="triggerInitCountry(\'' + pais + '\')">🚀 Inicializar ' + pais + ' con datos de referencia</button>'
    + '</div>';
}

async function triggerInitCountry(pais) {
  showToast('Inicializando ' + pais + '...');
  try {
    await initCountryData(pais, storedPass());
    showToast(pais + ' inicializado correctamente ✓', 'success');
    setTimeout(function() { loadAdminCountry(pais); }, 600);
  } catch (err) {
    if (err.status === 401) {
      sessionStorage.removeItem('ferco-admin-pass');
      document.getElementById('loginOverlay').style.display = 'flex';
      showToast('Sesión expirada. Ingresa de nuevo.', 'error');
    } else {
      showToast('Error al inicializar: ' + err.message, 'error');
    }
  }
}

function buildGridWrapEl() {
  var frag = document.createDocumentFragment();
  // Índice por tienda (se rellena en buildSucIndex)
  var idx = document.createElement('div');
  idx.id = 'sucIndex';
  idx.className = 'suc-index';
  idx.style.display = 'none';
  frag.appendChild(idx);
  var wrap = document.createElement('div');
  wrap.id = 'adminGridWrap';
  wrap.innerHTML = '<div id="adminGrid"></div>';
  frag.appendChild(wrap);
  var hint = document.createElement('p');
  hint.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;padding:0 4px';
  hint.textContent = '💡 Clic en una tienda del índice para filtrarla. Usa ✏️ para editar nombre, sucursal y canal. Doble clic en el nombre de columna para renombrarla.';
  frag.appendChild(hint);
  return frag;
}

function setLoading(on) {
  document.getElementById('adminLoader').style.display = on ? 'flex' : 'none';
  if (on) document.getElementById('adminContent').style.display = 'none';
}

/* ── Fecha de última actualización (encabezado) ── */
function fmtUpdated(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  function p(n){ return (n < 10 ? '0' : '') + n; }
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear()
       + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function updateLastUpdateLabel() {
  var el = document.getElementById('lastUpdate');
  if (!el) return;
  var iso = ADMIN_DATA && ADMIN_DATA.updatedAt;
  el.textContent = iso ? ('🕒 Última actualización: ' + fmtUpdated(iso) + ' · ' + ADMIN_PAIS) : '';
}

/* ── Filtro sucursal admin ── */
function onAdminSuc(val) {
  ADMIN_SUC = val;
  buildAdminGrid();
}

function updateSucFilter(allRows) {
  var sel = document.getElementById('adminSucSel');
  if (!sel) return;
  var realSucs = [...new Set(allRows.map(function(r){ return r.sucursal; }).filter(function(s){ return s && s !== ''; }))]
    .sort(function(a,b){ return a.localeCompare(b, 'es'); });
  var hasEmpty = allRows.some(function(r){ return !r.sucursal || r.sucursal === ''; });
  // Validar el filtro actual contra las sucursales disponibles
  if (ADMIN_SUC !== 'Todas' && ADMIN_SUC !== '' && !realSucs.includes(ADMIN_SUC)) ADMIN_SUC = 'Todas';
  if (ADMIN_SUC === '' && !hasEmpty) ADMIN_SUC = 'Todas';
  var opts = ['<option value="Todas"'+(ADMIN_SUC==='Todas'?' selected':'')+'>Todas</option>'];
  realSucs.forEach(function(s){ opts.push('<option value="'+escHtml(s)+'"'+(ADMIN_SUC===s?' selected':'')+'>'+escHtml(s)+'</option>'); });
  if (hasEmpty) opts.push('<option value=""'+(ADMIN_SUC===''?' selected':'')+'>— sin sucursal —</option>');
  sel.innerHTML = opts.join('');
}

/* ── Índice por tienda (navegación rápida por sucursal) ── */
function buildSucIndex(allRows) {
  var idx = document.getElementById('sucIndex');
  if (!idx) return;
  idx.innerHTML = '';

  var counts = {};
  allRows.forEach(function(r){
    var s = (r.sucursal && r.sucursal.trim()) ? r.sucursal : '';
    counts[s] = (counts[s] || 0) + 1;
  });
  var sucs = Object.keys(counts).filter(function(s){ return s !== ''; })
    .sort(function(a,b){ return a.localeCompare(b, 'es'); });
  var noSucCount = counts[''] || 0;

  if (!sucs.length && !noSucCount) { idx.style.display = 'none'; return; }
  idx.style.display = '';

  var title = document.createElement('div');
  title.className = 'suc-index-title';
  title.textContent = '🏬 Índice por tienda · ' + sucs.length + ' tiendas';
  idx.appendChild(title);

  var wrap = document.createElement('div');
  wrap.className = 'suc-index-chips';

  function chip(label, value, count, active) {
    var b = document.createElement('button');
    b.className = 'suc-chip' + (active ? ' active' : '');
    b.title = 'Filtrar: ' + label;
    var n = document.createElement('span');
    n.className = 'suc-chip-n';
    n.textContent = count;
    b.appendChild(document.createTextNode(label + ' '));
    b.appendChild(n);
    b.addEventListener('click', function(){ onAdminSuc(value); });
    return b;
  }

  wrap.appendChild(chip('Todas', 'Todas', allRows.length, ADMIN_SUC === 'Todas'));
  sucs.forEach(function(s){ wrap.appendChild(chip(s, s, counts[s], ADMIN_SUC === s)); });
  if (noSucCount) wrap.appendChild(chip('— sin sucursal —', '', noSucCount, ADMIN_SUC === ''));

  idx.appendChild(wrap);
}

/* ── Construcción del grid ── */
function buildAdminGrid() {
  if (!ADMIN_DATA) return;
  focusedColIdx = null;
  // Restaurar automáticamente las columnas del programa si están vacías,
  // para que los encabezados (títulos) siempre aparezcan.
  var restored = autoRestoreCols();
  var allRows = ADMIN_PROG === 'bdo' ? (ADMIN_DATA.bdo || []) : (ADMIN_DATA.x4x || []);
  // Etiquetar cada fila con su índice real en el array de datos
  allRows.forEach(function(r, i) { r._idx = i; });
  updateSucFilter(allRows);
  buildSucIndex(allRows);
  // Ordenar al mostrar (por sucursal y luego por nombre), sin mutar los datos.
  // Cada fila conserva su _idx real, así que editar/eliminar sigue siendo correcto.
  var rows = (ADMIN_SUC === 'Todas' ? allRows : allRows.filter(function(r){ return (r.sucursal || '') === ADMIN_SUC; })).slice();
  rows.sort(function(a, b){
    var s = (a.sucursal || '').localeCompare(b.sucursal || '', 'es', { sensitivity: 'base' });
    return s !== 0 ? s : (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
  });
  var cols = getAdminCols();
  var grid = document.getElementById('adminGrid');
  if (!grid) return;
  grid.innerHTML = '';

  // Aviso cuando aún no hay columnas tras intentar restaurarlas
  var repairBanner = document.getElementById('repairBanner');
  if (repairBanner) repairBanner.remove();
  if (cols.length === 0) {
    var banner = document.createElement('div');
    banner.id = 'repairBanner';
    if (ADMIN_PROG === 'bdo' && ADMIN_DATA.config && ADMIN_DATA.config.solo4x4) {
      banner.style.cssText = 'background:#dbeafe;border:1px solid #3b82f6;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:13px;color:#1e40af';
      banner.innerHTML = 'ℹ️ <strong>' + ADMIN_PAIS + '</strong> solo maneja el programa <strong>Despliegue 4x4</strong>. Cambia el programa arriba para ver y editar sus datos.';
    } else if (CORRECT_CONFIG[ADMIN_PAIS]) {
      banner.style.cssText = 'background:#fef3c7;border:1px solid #d97706;border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;font-size:13px;color:#92400e';
      banner.innerHTML = '<span>⚠️ Las columnas de <strong>' + ADMIN_PAIS + '</strong> no están configuradas en este sistema.</span>'
        + '<button class="abtn" onclick="repairConfig()" style="background:#d97706;color:#fff;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap">Restaurar columnas</button>';
    } else {
      banner.style.cssText = 'background:#fef3c7;border:1px solid #d97706;border-radius:8px;padding:10px 16px;margin-bottom:12px;font-size:13px;color:#92400e';
      banner.innerHTML = '⚠️ No hay columnas configuradas. Usa <strong>＋ Columna</strong> para agregarlas.';
    }
    grid.before(banner);
  }

  // Columna fija: nombres
  var fixedGroup = makeFixedCol(rows);
  grid.appendChild(fixedGroup);

  // Columnas de módulos
  cols.forEach(function(col, ci) {
    grid.appendChild(makeDataCol(col, ci, rows));
  });

  // Columna de notas
  grid.appendChild(makeNotaCol(rows));

  updateFocusHint();

  if (restored) showToast('Columnas restauradas automáticamente — revisa y presiona Guardar para conservarlas.', 'success');
}

function getAdminCols() {
  if (ADMIN_PROG === 'bdo') {
    var qr  = (ADMIN_DATA.config.bdoCols && ADMIN_DATA.config.bdoCols.qr)    || [];
    var vid = (ADMIN_DATA.config.bdoCols && ADMIN_DATA.config.bdoCols.video) || [];
    return qr.concat(vid);
  }
  return ADMIN_DATA.config.sesCols || [];
}

/* Restaura las columnas por defecto del programa actual si están vacías,
   de modo que los encabezados (títulos) siempre se muestren. Solo toca el
   programa actual y no sobrescribe columnas ya existentes. */
function autoRestoreCols() {
  var cc = CORRECT_CONFIG[ADMIN_PAIS];
  if (!cc || !ADMIN_DATA || !ADMIN_DATA.config) return false;
  if (getAdminCols().length > 0) return false;
  var cfg = ADMIN_DATA.config;
  if (ADMIN_PROG === 'bdo') {
    var qr  = (cc.bdoCols && cc.bdoCols.qr)    || [];
    var vid = (cc.bdoCols && cc.bdoCols.video) || [];
    if (!qr.length && !vid.length) return false; // este país no maneja BDO (ej. SV)
    cfg.bdoCols = { qr: qr.slice(), video: vid.slice() };
  } else {
    if (!cc.sesCols || !cc.sesCols.length) return false;
    cfg.sesCols = cc.sesCols.slice();
  }
  // Completar divisores faltantes sin pisar los que el usuario ya definió
  cfg.divisors = Object.assign({}, cc.divisors || {}, cfg.divisors || {});
  return true;
}

function repairConfig() {
  var cc = CORRECT_CONFIG[ADMIN_PAIS];
  if (!cc) return;
  ADMIN_DATA.config = Object.assign({}, ADMIN_DATA.config, {
    bdoCols:  cc.bdoCols,
    sesCols:  cc.sesCols,
    divisors: Object.assign({}, ADMIN_DATA.config.divisors || {}, cc.divisors),
  });
  buildAdminGrid();
  showToast('Columnas restauradas — presiona Guardar y publicar para aplicar.', 'success');
}

function colTag(colName) {
  var n = colName.toLowerCase();
  if (n.includes('qr'))   return '<span class="col-tag qr">QR</span>';
  if (n.includes('video')) return '<span class="col-tag vid">Video</span>';
  if (n.includes('ses') || n.includes('sión') || n.includes('sion')) return '<span class="col-tag ses">Sesión</span>';
  return '';
}

function cellBg(v) {
  if (v >= 80) return 'cell-good';
  if (v >= 61) return 'cell-mid';
  if (v > 0)   return 'cell-bad';
  return 'cell-zero';
}

function makeFixedCol(rows) {
  var group = document.createElement('div');
  group.className = 'col-group fixed-col';

  var hdr = document.createElement('div');
  hdr.className = 'col-header no-click';
  var totalRows = ADMIN_PROG === 'bdo' ? (ADMIN_DATA.bdo || []).length : (ADMIN_DATA.x4x || []).length;
  var countLabel = rows.length < totalRows ? rows.length + ' de ' + totalRows : rows.length;
  hdr.innerHTML = 'Colaborador <span style="font-size:11px;color:var(--muted);font-weight:400">— '+countLabel+' registros</span>';
  group.appendChild(hdr);

  rows.forEach(function(row) {
    var realIdx = row._idx;
    var cell = document.createElement('div');
    cell.className = 'col-cell name-cell';

    var info = document.createElement('div');
    info.style.flex = '1';
    info.style.minWidth = '0';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'row-name';
    nameDiv.textContent = row.nombre || '—';
    nameDiv.title = row.nombre || '—';
    nameDiv.addEventListener('dblclick', function() {
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.value = row.nombre || '';
      inp.className = 'col-rename-inp';
      inp.style.width = '100%';
      var applied = false;
      function applyRename() {
        if (applied) return; applied = true;
        var nv = inp.value.trim();
        if (nv) {
          ADMIN_DATA[getProgKey()][realIdx].nombre = nv;
          showToast('Colaborador renombrado');
        }
        buildAdminGrid();
      }
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); applyRename(); }
        if (e.key === 'Escape') { applied = true; buildAdminGrid(); }
      });
      inp.addEventListener('blur', applyRename);
      nameDiv.parentNode.replaceChild(inp, nameDiv);
      inp.select();
    });

    var sucDiv = document.createElement('div');
    sucDiv.className = 'row-suc';
    var sucText = row.sucursal || '';
    if (row.canal) sucText = sucText ? (sucText + ' · ' + row.canal) : row.canal;
    sucDiv.textContent = sucText;

    info.appendChild(nameDiv);
    info.appendChild(sucDiv);

    var actions = document.createElement('div');
    actions.className = 'row-actions';

    var editBtn = document.createElement('span');
    editBtn.className = 'edit-row';
    editBtn.title = 'Editar nombre, sucursal y canal';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', function() { editRow(realIdx); });

    var delBtn = document.createElement('span');
    delBtn.className = 'del-row';
    delBtn.title = 'Eliminar fila';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() { deleteRow(realIdx); });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    cell.appendChild(info);
    cell.appendChild(actions);
    group.appendChild(cell);
  });
  return group;
}

function makeDataCol(colName, colIdx, rows) {
  var group = document.createElement('div');
  group.className = 'col-group';
  group.dataset.colIdx = colIdx;

  var divisor = getDivisor(colName);
  var pk = getProgKey();

  var hdr = document.createElement('div');
  hdr.className = 'col-header';
  hdr.title = 'Click para enfocar esta columna';

  // Inject tag + name (no innerHTML for the whole hdr to preserve listeners)
  hdr.innerHTML = colTag(colName);
  var nameSpan = document.createElement('span');
  nameSpan.className = 'col-name-span';
  nameSpan.textContent = colName;
  nameSpan.title = 'Doble clic para renombrar';
  nameSpan.addEventListener('dblclick', function(e) {
    e.stopPropagation();
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = colName;
    inp.className = 'col-rename-inp';
    inp.addEventListener('click', function(e) { e.stopPropagation(); });
    var applied = false;
    function applyRename() {
      if (applied) return; applied = true;
      var nv = inp.value.trim();
      if (nv && nv !== colName) renameColumn(colName, nv);
      else buildAdminGrid();
    }
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); applyRename(); }
      if (e.key === 'Escape') { applied = true; buildAdminGrid(); }
    });
    inp.addEventListener('blur', applyRename);
    nameSpan.parentNode.replaceChild(inp, nameSpan);
    inp.select();
  });
  hdr.appendChild(nameSpan);

  // Divisor widget
  var divWrap = document.createElement('span');
  divWrap.className = 'div-wrap';
  divWrap.title = 'Valor máximo de la nota (divisor)';
  divWrap.innerHTML = '÷ ';
  var divInp = document.createElement('input');
  divInp.type = 'number';
  divInp.className = 'divisor-inp';
  divInp.value = divisor;
  divInp.min = 1;
  divInp.step = 1;
  divInp.addEventListener('click', function(e) { e.stopPropagation(); });
  divInp.addEventListener('change', function(e) { e.stopPropagation(); setDivisor(colName, this.value); });
  divWrap.appendChild(divInp);
  hdr.appendChild(divWrap);

  // Delete button
  var delBtn = document.createElement('span');
  delBtn.className = 'del-col';
  delBtn.title = 'Eliminar columna';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteColumn(colName); });
  hdr.appendChild(delBtn);

  hdr.addEventListener('click', function() { focusCol(colIdx); });
  group.appendChild(hdr);

  rows.forEach(function(row) {
    var realIdx = row._idx;
    var pct = parseFloat((row.valores && row.valores[colName]) || 0);
    var displayVal = divisor !== 100 ? Math.round(pct * divisor / 100) : pct;

    var cell = document.createElement('div');
    cell.className = 'col-cell ' + cellBg(pct);

    var inp = document.createElement('input');
    inp.type = 'number';
    inp.min = 0;
    inp.max = divisor;
    inp.value = displayVal;
    inp.dataset.col = colName;

    inp.addEventListener('input', function() {
      var raw = Math.min(divisor, Math.max(0, parseFloat(this.value) || 0));
      var pctVal = divisor > 0 ? Math.min(100, Math.round(raw / divisor * 100)) : raw;
      if (!ADMIN_DATA[pk][realIdx].valores) ADMIN_DATA[pk][realIdx].valores = {};
      ADMIN_DATA[pk][realIdx].valores[colName] = pctVal;
      cell.className = 'col-cell ' + cellBg(pctVal);
    });
    inp.addEventListener('change', function() {
      if (this.value === '' || isNaN(parseFloat(this.value))) this.value = 0;
    });

    cell.appendChild(inp);
    group.appendChild(cell);
  });
  return group;
}

function makeNotaCol(rows) {
  var group = document.createElement('div');
  group.className = 'col-group nota-col';

  var hdr = document.createElement('div');
  hdr.className = 'col-header no-click';
  hdr.textContent = '📝 Nota';
  group.appendChild(hdr);

  rows.forEach(function(row) {
    var realIdx = row._idx;
    var cell = document.createElement('div');
    cell.className = 'col-cell';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'nota-input';
    inp.placeholder = 'Nota...';
    inp.maxLength = 10;
    inp.value = row.nota || '';
    inp.addEventListener('input', function() {
      ADMIN_DATA[getProgKey()][realIdx].nota = this.value;
    });

    cell.appendChild(inp);
    group.appendChild(cell);
  });
  return group;
}

/* ── Animación de columna ── */
function focusCol(clickedIdx) {
  var allGroups = [...document.querySelectorAll('#adminGrid .col-group:not(.fixed-col):not(.nota-col)')];
  if (allGroups.length === 0) return;

  if (focusedColIdx === clickedIdx) {
    // Segundo click: quitar foco
    focusedColIdx = null;
    allGroups.forEach(function(g) {
      g.style.transform = '';
      g.classList.remove('focused');
    });
    updateFocusHint();
    return;
  }

  focusedColIdx = clickedIdx;
  var clickedGroup = allGroups[clickedIdx];
  var colWidth = clickedGroup.offsetWidth;

  // Calcular cuánto desplazar la columna enfocada hacia la izquierda
  var totalShift = 0;
  for (var i = 0; i < clickedIdx; i++) {
    totalShift += allGroups[i].offsetWidth;
  }

  allGroups.forEach(function(g, i) {
    g.classList.remove('focused');
    if (i < clickedIdx) {
      // Columnas antes del foco: desplazar a la derecha
      g.style.transform = 'translateX(' + colWidth + 'px)';
    } else if (i === clickedIdx) {
      // Columna enfocada: saltar al inicio (posición 1)
      g.style.transform = 'translateX(-' + totalShift + 'px)';
      g.classList.add('focused');
    } else {
      // Columnas después: sin cambio
      g.style.transform = '';
    }
  });

  updateFocusHint();
}

function updateFocusHint() {
  var hint = document.getElementById('focusHint');
  if (!hint) return;
  if (focusedColIdx !== null) {
    var cols = getAdminCols();
    hint.textContent = 'Enfocando: ' + (cols[focusedColIdx] || '') + ' — Click en la columna de nuevo para quitar el foco';
    hint.style.display = 'block';
  } else {
    hint.style.display = 'none';
  }
}

/* ── CRUD ── */
/* Lista ordenada de sucursales conocidas (config + filas) para los selects */
function sucListForSelect() {
  var allRows = ADMIN_PROG === 'bdo' ? (ADMIN_DATA.bdo || []) : (ADMIN_DATA.x4x || []);
  var configSucs = ((ADMIN_DATA.config && ADMIN_DATA.config.sucursales) || []).map(function(s){ return s.nombre; });
  var rowSucs = [...new Set(allRows.map(function(r){ return r.sucursal; }).filter(Boolean))];
  return [...new Set([].concat(configSucs, rowSucs))].filter(Boolean)
    .sort(function(a,b){ return a.localeCompare(b, 'es'); });
}

/* Lista ordenada de canales conocidos (desde ambos programas) */
function canalListForSelect() {
  var bdo = ADMIN_DATA.bdo || [];
  var x4x = ADMIN_DATA.x4x || [];
  return [...new Set(bdo.concat(x4x).map(function(r){ return (r.canal || '').trim(); }).filter(Boolean))]
    .sort(function(a,b){ return a.localeCompare(b, 'es'); });
}

/* Inyecta el campo "Canal" (select) en el modal abierto — solo si el país tiene canales */
function injectCanalField(selected) {
  if (!ADMIN_DATA || !ADMIN_DATA.config || !ADMIN_DATA.config.tieneCanal) return;
  var fieldsDiv = document.querySelector('#modalBox .modal-fields');
  if (!fieldsDiv) return;
  var canales = canalListForSelect();
  var opts = '<option value=""'+(selected ? '' : ' selected')+'>— sin canal —</option>';
  opts += canales.map(function(c){
    return '<option value="'+escHtml(c)+'"'+(c===selected?' selected':'')+'>'+escHtml(c)+'</option>';
  }).join('');
  fieldsDiv.insertAdjacentHTML('beforeend',
    '<label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px;margin-top:8px">Canal</label>'
    + '<select id="addRowCanalSel" style="width:100%">' + opts + '</select>'
  );
}

/* Inyecta el campo "Sucursal" (select + botón nueva sucursal) en el modal abierto */
function injectSucField(selected) {
  var fieldsDiv = document.querySelector('#modalBox .modal-fields');
  if (!fieldsDiv) return;
  var opts = '<option value=""'+(selected ? '' : ' selected')+'>— sin sucursal —</option>';
  opts += sucListForSelect().map(function(s){
    return '<option value="'+escHtml(s)+'"'+(s===selected?' selected':'')+'>'+escHtml(s)+'</option>';
  }).join('');
  fieldsDiv.insertAdjacentHTML('beforeend',
    '<label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px;margin-top:8px">Sucursal</label>'
    + '<select id="addRowSucSel" style="width:100%">' + opts + '</select>'
    + '<button type="button" onclick="openAddSucModal()" style="margin-top:6px;font-size:11px;background:none;border:none;color:inherit;cursor:pointer;padding:2px 0;text-decoration:underline;display:block;opacity:.7">+ Agregar nueva sucursal</button>'
  );
}

/* Deriva región/zona de una sucursal (desde config o desde otra fila igual) */
function deriveRegionZona(suc, excludeRow) {
  var pk = getProgKey();
  var sc = ((ADMIN_DATA.config && ADMIN_DATA.config.sucursales) || []).find(function(s){ return s.nombre === suc; });
  if (!sc && suc) {
    var other = (ADMIN_DATA[pk] || []).find(function(r){ return r !== excludeRow && r.sucursal === suc && (r.region || r.zona); });
    if (other) sc = { region: other.region, zona: other.zona };
  }
  return { region: sc ? (sc.region || '') : '', zona: sc ? (sc.zona || '') : '' };
}

function addRow() {
  _addSucReturn = addRow;
  openModal('Agregar colaborador', [
    { id: 'newNombre', label: 'Nombre completo', type: 'text', placeholder: 'Ej: Juan Pérez' },
  ], function(vals) {
    var sucSel = document.getElementById('addRowSucSel');
    var suc = sucSel ? sucSel.value.trim() : '';
    var canalSel = document.getElementById('addRowCanalSel');
    var canal = canalSel ? canalSel.value.trim() : '';
    if (!vals.newNombre.trim()) { showToast('El nombre es requerido', 'error'); return false; }
    var region = '', zona = '';
    if (ADMIN_PAIS === 'GT' && suc) {
      var rz = deriveRegionZona(suc, null);
      region = rz.region; zona = rz.zona;
    }
    var cols = getAdminCols();
    var valores = {};
    cols.forEach(function(c){ valores[c] = 0; });
    ADMIN_DATA[getProgKey()].push({ canal: canal, region: region, zona: zona, sucursal: suc, nombre: vals.newNombre.trim(), valores: valores, nota: '' });
    buildAdminGrid();
    showToast('Colaborador agregado');
    return true;
  });
  injectSucField('');
  injectCanalField('');
}

/* Editar un colaborador existente: nombre, sucursal y canal */
function editRow(realIdx) {
  var pk = getProgKey();
  var row = ADMIN_DATA[pk] && ADMIN_DATA[pk][realIdx];
  if (!row) return;
  _addSucReturn = function(){ editRow(realIdx); };
  openModal('Editar colaborador', [
    { id: 'newNombre', label: 'Nombre completo', type: 'text', placeholder: 'Ej: Juan Pérez' },
  ], function(vals) {
    var sucSel = document.getElementById('addRowSucSel');
    var suc = sucSel ? sucSel.value.trim() : '';
    var canalSel = document.getElementById('addRowCanalSel');
    var canal = canalSel ? canalSel.value.trim() : '';
    var nombre = (vals.newNombre || '').trim();
    if (!nombre) { showToast('El nombre es requerido', 'error'); return false; }
    row.nombre = nombre;
    row.sucursal = suc;
    row.canal = canal;
    if (ADMIN_PAIS === 'GT') {
      var rz = deriveRegionZona(suc, row);
      row.region = rz.region; row.zona = rz.zona;
    }
    buildAdminGrid();
    showToast('Colaborador actualizado ✓');
    return true;
  });
  var nameInp = document.getElementById('mf_newNombre');
  if (nameInp) nameInp.value = row.nombre || '';
  injectSucField(row.sucursal || '');
  injectCanalField(row.canal || '');
}

function openAddSucModal() {
  var savedNombre = '';
  var nombreEl = document.getElementById('mf_newNombre');
  if (nombreEl) savedNombre = nombreEl.value;
  var savedCanal = '';
  var canalEl = document.getElementById('addRowCanalSel');
  if (canalEl) savedCanal = canalEl.value;

  var allRows = ADMIN_DATA[getProgKey()] || [];
  var fields = [
    { id: 'newSucNombre', label: 'Nombre de la sucursal', type: 'text', placeholder: 'Ej: Tegucigalpa Norte' },
  ];

  if (ADMIN_PAIS === 'GT') {
    var regiones = [...new Set(allRows.map(function(r){ return r.region; }).filter(Boolean))].sort();
    var zonas    = [...new Set(allRows.map(function(r){ return r.zona; }).filter(Boolean))].sort();
    fields.push({
      id: 'newSucRegion', label: 'Región', type: 'select',
      options: [{ v: '', l: '— elegir región —' }].concat(regiones.map(function(r){ return { v: r, l: r }; }))
    });
    fields.push({
      id: 'newSucZona', label: 'Zona', type: 'select',
      options: [{ v: '', l: '— elegir zona —' }].concat(zonas.map(function(z){ return { v: z, l: z }; }))
    });
  }

  openModal('Agregar nueva sucursal', fields, function(vals) {
    var nombre = vals.newSucNombre ? vals.newSucNombre.trim() : '';
    if (!nombre) { showToast('El nombre es requerido', 'error'); return false; }
    if (!ADMIN_DATA.config.sucursales) ADMIN_DATA.config.sucursales = [];
    ADMIN_DATA.config.sucursales.push({ nombre: nombre, region: vals.newSucRegion || '', zona: vals.newSucZona || '' });
    closeModal();
    (_addSucReturn || addRow)();
    setTimeout(function() {
      var ni = document.getElementById('mf_newNombre');
      if (ni) ni.value = savedNombre;
      var sel = document.getElementById('addRowSucSel');
      if (sel) sel.value = nombre;
      var cs = document.getElementById('addRowCanalSel');
      if (cs) cs.value = savedCanal;
    }, 50);
    return false;
  });
}

function deleteRow(ri) {
  var rows = ADMIN_DATA[getProgKey()];
  var name = rows[ri] && rows[ri].nombre ? rows[ri].nombre : 'esta fila';
  if (!confirm('¿Eliminar a "' + name + '"? Esta acción no se puede deshacer sin guardar.')) return;
  rows.splice(ri, 1);
  buildAdminGrid();
  showToast('Fila eliminada');
}

function addColumn() {
  var isBdo = ADMIN_PROG === 'bdo';
  var extraFields = isBdo ? [
    { id: 'colType', label: 'Tipo de columna', type: 'select',
      options: [{ v:'qr', l:'QR' }, { v:'video', l:'Video' }] }
  ] : [];

  openModal('Agregar columna', [
    { id: 'newColName', label: 'Nombre de la columna', type: 'text', placeholder: 'Ej: QR Porcelanato' },
    { id: 'colDivisor', label: 'Valor máximo de la nota (divisor)', type: 'number', placeholder: 'Ej: 5  (100 si ingresas % directamente)' },
  ].concat(extraFields), function(vals) {
    var name = vals.newColName.trim();
    if (!name) { showToast('El nombre es requerido', 'error'); return false; }

    var div = Math.max(1, parseInt(vals.colDivisor) || 100);
    if (div !== 100) {
      if (!ADMIN_DATA.config.divisors) ADMIN_DATA.config.divisors = {};
      ADMIN_DATA.config.divisors[name] = div;
    }

    if (isBdo) {
      var type = vals.colType || 'qr';
      if (type === 'qr') ADMIN_DATA.config.bdoCols.qr.push(name);
      else               ADMIN_DATA.config.bdoCols.video.push(name);
      ADMIN_DATA.bdo.forEach(function(r){ if(!r.valores) r.valores={}; r.valores[name] = 0; });
    } else {
      ADMIN_DATA.config.sesCols.push(name);
      ADMIN_DATA.x4x.forEach(function(r){ if(!r.valores) r.valores={}; r.valores[name] = 0; });
    }

    buildAdminGrid();
    showToast('Columna "' + name + '" agregada');
    return true;
  });
}

function deleteColumn(colName) {
  if (!confirm('¿Eliminar la columna "' + colName + '"? Se perderá el dato de todos los colaboradores.')) return;

  var cfg = ADMIN_DATA.config;
  if (ADMIN_PROG === 'bdo') {
    cfg.bdoCols.qr    = (cfg.bdoCols.qr    || []).filter(function(c){ return c !== colName; });
    cfg.bdoCols.video = (cfg.bdoCols.video || []).filter(function(c){ return c !== colName; });
    ADMIN_DATA.bdo.forEach(function(r){ if(r.valores) delete r.valores[colName]; });
  } else {
    cfg.sesCols = (cfg.sesCols || []).filter(function(c){ return c !== colName; });
    ADMIN_DATA.x4x.forEach(function(r){ if(r.valores) delete r.valores[colName]; });
  }

  buildAdminGrid();
  showToast('Columna eliminada');
}

function renameColumn(oldName, newName) {
  var pk = getProgKey();
  var cfg = ADMIN_DATA.config;

  if (ADMIN_PROG === 'bdo') {
    cfg.bdoCols.qr    = (cfg.bdoCols.qr    || []).map(function(c){ return c === oldName ? newName : c; });
    cfg.bdoCols.video = (cfg.bdoCols.video || []).map(function(c){ return c === oldName ? newName : c; });
  } else {
    cfg.sesCols = (cfg.sesCols || []).map(function(c){ return c === oldName ? newName : c; });
  }

  if (cfg.divisors && cfg.divisors[oldName] !== undefined) {
    cfg.divisors[newName] = cfg.divisors[oldName];
    delete cfg.divisors[oldName];
  }

  ADMIN_DATA[pk].forEach(function(row) {
    if (row.valores && row.valores[oldName] !== undefined) {
      row.valores[newName] = row.valores[oldName];
      delete row.valores[oldName];
    }
  });

  buildAdminGrid();
  showToast('Columna renombrada a "' + newName + '"');
}

/* ── Guardar ── */
async function saveData() {
  var btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    ADMIN_DATA.pais = ADMIN_PAIS;
    var result = await saveCountryData(ADMIN_PAIS, ADMIN_DATA, storedPass());
    showToast('Guardado y publicado ✓', 'success');
    // Recargar para mostrar el nuevo corte histórico
    ADMIN_DATA = await loadCountryData(ADMIN_PAIS);
    updateLastUpdateLabel();
  } catch (err) {
    if (err.status === 401) {
      sessionStorage.removeItem('ferco-admin-pass');
      document.getElementById('loginOverlay').style.display = 'flex';
      showToast('Sesión expirada. Ingresa de nuevo.', 'error');
    } else {
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }
  btn.disabled = false;
  btn.textContent = '💾 Guardar y publicar';
}

/* ── Selector de país/programa ── */
function onAdminPais(pais) {
  ADMIN_PAIS = pais;
  ADMIN_SUC = 'Todas';
  focusedColIdx = null;
  loadAdminCountry(pais);
}

function onAdminProg(prog) {
  ADMIN_PROG = prog;
  ADMIN_SUC = 'Todas';
  focusedColIdx = null;
  if (ADMIN_DATA) buildAdminGrid();
}

/* ── Toast ── */
var toastTimer = null;
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.className = ''; }, 3000);
}

/* ── Modal genérico ── */
function openModal(title, fields, onConfirm) {
  var overlay = document.getElementById('modalOverlay');
  var box = document.getElementById('modalBox');
  box.querySelector('h3').textContent = title;
  box.querySelector('p').textContent = '';
  // Restaurar botones por si venimos del modal de ranking
  var cfmBtn = box.querySelector('.modal-confirm');
  cfmBtn.style.display = '';
  cfmBtn.textContent = 'Confirmar';
  var cncBtn = box.querySelector('.modal-actions button:first-child');
  cncBtn.textContent = 'Cancelar';

  var fieldsHtml = fields.map(function(f) {
    if (f.type === 'select') {
      var opts = f.options.map(function(o){ return '<option value="'+o.v+'">'+o.l+'</option>'; }).join('');
      return '<label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px">'+f.label+'</label>'
           + '<select id="mf_'+f.id+'">'+opts+'</select>';
    }
    return '<label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px">'+f.label+'</label>'
         + '<input type="'+f.type+'" id="mf_'+f.id+'" placeholder="'+escHtml(f.placeholder||'')+'"><br>';
  }).join('');
  box.querySelector('.modal-fields').innerHTML = fieldsHtml;

  overlay.classList.add('open');

  // Foco en primer campo
  setTimeout(function(){
    var firstInp = box.querySelector('input,select');
    if (firstInp) firstInp.focus();
  }, 50);

  box.querySelector('.modal-confirm').onclick = function() {
    var vals = {};
    fields.forEach(function(f){
      var el = document.getElementById('mf_'+f.id);
      vals[f.id] = el ? el.value : '';
    });
    var ok = onConfirm(vals);
    if (ok !== false) closeModal();
  };
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ── Helpers ── */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Ranking de sucursales ── */
async function generarRanking() {
  showToast('Cargando datos de los 3 países...');
  var results = await Promise.allSettled([
    loadCountryData('GT'),
    loadCountryData('HN'),
    loadCountryData('SV'),
  ]);
  if (results.every(function(r){ return r.status === 'rejected'; })) {
    showToast('Error cargando datos del ranking', 'error');
    return;
  }
  // Si un país falla, se usa {} y aparecerá como "(sin datos)" sin romper el resto
  var gtData = results[0].status === 'fulfilled' ? results[0].value : {};
  var hnData = results[1].status === 'fulfilled' ? results[1].value : {};
  var svData = results[2].status === 'fulfilled' ? results[2].value : {};

  var rankings = {
    bdoGT: calcRankingSuc(gtData.bdo  || [], gtData.config  || {}, 'bdo'),
    bdoHN: calcRankingSuc(hnData.bdo  || [], hnData.config  || {}, 'bdo'),
    d4xGT: calcRankingSuc(gtData.x4x  || [], gtData.config  || {}, 'd4x4'),
    d4xHN: calcRankingSuc(hnData.x4x  || [], hnData.config  || {}, 'd4x4'),
    d4xSV: calcRankingSuc(svData.x4x  || [], svData.config  || {}, 'd4x4'),
  };

  showRankingModal(buildRankingText(rankings));
}

function calcRankingSuc(rows, config, prog) {
  var grouped = {};
  rows.forEach(function(r) {
    var suc = (r.sucursal || '').trim();
    // Excluir filas sin sucursal y placeholders con '#' (igual que el portal),
    // y unir sucursales que solo difieren por espacios al inicio/final.
    if (!suc || suc.indexOf('#') !== -1) return;
    if (!grouped[suc]) grouped[suc] = [];
    grouped[suc].push(r);
  });

  var results = [];
  Object.keys(grouped).forEach(function(suc) {
    var gr = grouped[suc];
    var personScores;

    if (prog === 'bdo') {
      var qrCols  = (config.bdoCols && config.bdoCols.qr)    || [];
      var vidCols = (config.bdoCols && config.bdoCols.video) || [];
      if (!qrCols.length && !vidCols.length) return;
      personScores = gr.map(function(r) {
        var qrV  = qrCols.map(function(c)  { return parseFloat((r.valores && r.valores[c]) || 0); });
        var vidV = vidCols.map(function(c) { return parseFloat((r.valores && r.valores[c]) || 0); });
        var aQR  = qrV.length  ? qrV.reduce(function(a,b){return a+b;},0)  / qrV.length  : 0;
        var aVid = vidV.length ? vidV.reduce(function(a,b){return a+b;},0) / vidV.length : 0;
        return (aQR + aVid) / 2;
      });
    } else {
      var sesCols = config.sesCols || [];
      if (!sesCols.length) return;
      personScores = gr.map(function(r) {
        var vals = sesCols.map(function(c){ return parseFloat((r.valores && r.valores[c]) || 0); });
        return vals.reduce(function(a,b){return a+b;},0) / vals.length;
      });
    }

    if (!personScores.length) return;
    var score = Math.round(personScores.reduce(function(a,b){return a+b;},0) / personScores.length * 10) / 10;
    results.push({ sucursal: suc, score: score });
  });

  return results.sort(function(a, b) {
    return b.score - a.score || a.sucursal.localeCompare(b.sucursal, 'es');
  });
}

function buildRankingText(r) {
  var SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  var MEDALS = ['1°🥇 ','2°🥈 ','3°🥉 '];

  function top3Block(ranking) {
    if (!ranking.length) return '    (sin datos)';
    return ranking.slice(0,3).map(function(s,i){
      return MEDALS[i] + s.sucursal + ' ' + s.score.toFixed(1) + '%';
    }).join('\n');
  }

  function classifBlock(ranking) {
    if (!ranking.length) return '    (sin datos)';
    function fmt(list, empty) {
      return list.length
        ? list.map(function(s){ return s.sucursal + ' ' + s.score.toFixed(1) + '%'; }).join(', ')
        : empty;
    }
    var crit = ranking.filter(function(s){ return s.score < 50; });
    var acep = ranking.filter(function(s){ return s.score >= 50 && s.score < 81; });
    var opt  = ranking.filter(function(s){ return s.score >= 81; });
    return [
      '    🔴 Crítica (<50%): '     + fmt(crit, 'ninguna ✅'),
      '    🟡 Aceptable (50–80%): ' + fmt(acep, 'ninguna'),
      '    🟢 Óptima (≥81%): '      + fmt(opt,  'ninguna'),
    ].join('\n');
  }

  var lines = [
    '📊 BATEADOR DE OBJECIONES',
    '🏆 TOP 3 POR PAÍS',
    'Guatemala',
    top3Block(r.bdoGT),
    'Honduras',
    top3Block(r.bdoHN),
    SEP,
    '📊 CLASIFICACIÓN DE SUCURSALES',
    'Guatemala',
    classifBlock(r.bdoGT),
    'Honduras',
    classifBlock(r.bdoHN),
    '',
    '📊 DESPLIEGUE 4x4',
    '🏆 TOP 3 POR PAÍS',
    'Guatemala',
    top3Block(r.d4xGT),
    'El Salvador',
    top3Block(r.d4xSV),
    'Honduras',
    top3Block(r.d4xHN),
    SEP,
    '📊 CLASIFICACIÓN DE SUCURSALES',
    'Guatemala',
    classifBlock(r.d4xGT),
    'El Salvador',
    classifBlock(r.d4xSV),
    'Honduras',
    classifBlock(r.d4xHN),
  ];
  return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════════
   INFORME DE AVANCE PARA DIRECCIÓN Y REGIONALES
   Fuente única y confiable: historico.cortes (cada "Guardar" crea un
   corte fechado con los promedios por sucursal ya calculados en el
   servidor). Se reportan cambios (deltas) entre cortes, que es la
   señal verificable de avance. Se excluyen registros sin sucursal o
   con '#', igual que el portal público.
   ══════════════════════════════════════════════════════════════ */
var INF_MIN_AVANCE  = 2;   // pts mínimos para contar como avance real
var INF_DIAS_LIMITE = 15;  // días sin avance que marcan alerta crítica
var INF_COMPLETA    = 95;  // % a partir del cual la tienda se considera completa

function isValidSuc(s) { return !!s && String(s).indexOf('#') === -1; }

/* Puntaje de una sucursal en un corte, por programa.
   BDO = promedio de [bdo_qr, bdo_video] disponibles.
   4x4 = promedio de sesiones iniciadas (>0), igual que el portal. */
function snapScore(sd, prog) {
  if (!sd) return null;
  if (prog === 'bdo') {
    var vals = [];
    if (sd.bdo_qr != null)    vals.push(sd.bdo_qr);
    if (sd.bdo_video != null) vals.push(sd.bdo_video);
    if (!vals.length) return null;
    return Math.round(vals.reduce(function(a,b){ return a+b; }, 0) / vals.length);
  }
  var ks = Object.keys(sd).filter(function(k){ return k.indexOf('4x4_s') === 0; });
  if (!ks.length) return null;
  var pos = ks.map(function(k){ return sd[k]; }).filter(function(v){ return v != null && v > 0; });
  if (!pos.length) return 0;
  return Math.round(pos.reduce(function(a,b){ return a+b; }, 0) / pos.length);
}

/* Serie temporal por sucursal: { suc: [{date, score}, ...] } (un punto por
   fecha; si hay varios guardados el mismo día gana el último). */
function buildSucSeries(cortes, prog) {
  var sorted = cortes.slice().sort(function(a,b){ return (a.fecha||'').localeCompare(b.fecha||''); });
  var tmp = {};
  sorted.forEach(function(c){
    var sucs = c.sucursales || {};
    Object.keys(sucs).forEach(function(raw){
      var suc = String(raw).trim();
      if (!isValidSuc(suc)) return;
      var s = snapScore(sucs[raw], prog);
      if (s == null) return;
      if (!tmp[suc]) tmp[suc] = {};
      tmp[suc][c.fecha] = s;
    });
  });
  var out = {};
  Object.keys(tmp).forEach(function(suc){
    var ds = Object.keys(tmp[suc]).sort();
    out[suc] = ds.map(function(d){ return { date: d, score: tmp[suc][d] }; });
  });
  return out;
}

function daysBetween(d1, d2) {
  var a = new Date(d1 + 'T00:00:00'), b = new Date(d2 + 'T00:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
}
function fmtCorta(iso) { var p = (iso||'').split('-'); return p.length === 3 ? (p[2]+'/'+p[1]) : (iso||''); }
function fmtLarga(iso) { var p = (iso||'').split('-'); return p.length === 3 ? (p[2]+'/'+p[1]+'/'+p[0]) : (iso||''); }

/* Última fecha en que el puntaje subió ≥ INF_MIN_AVANCE respecto al punto
   anterior. Si nunca subió, devuelve la primera fecha (lleva estancada
   desde que apareció). */
function lastImprovementDate(pts) {
  var last = pts[0].date;
  for (var i = 1; i < pts.length; i++) {
    if (pts[i].score - pts[i-1].score >= INF_MIN_AVANCE) last = pts[i].date;
  }
  return last;
}

/* Clasifica las sucursales de un programa en: avance / estancadas / críticas. */
function classifyProg(cortes, prog) {
  var series = buildSucSeries(cortes, prog);
  var sucs = Object.keys(series);
  var dateSet = {};
  sucs.forEach(function(s){ series[s].forEach(function(p){ dateSet[p.date] = 1; }); });
  var allDates = Object.keys(dateSet).sort();
  if (allDates.length < 2 || !sucs.length) return { ok: false };

  var latest = allDates[allDates.length - 1];
  var prev   = allDates[allDates.length - 2];
  var avance = [], estanc = [], criticas = [], completas = 0, nuevas = 0;

  sucs.forEach(function(suc){
    var pts = series[suc];
    var scoreAt = {};
    pts.forEach(function(p){ scoreAt[p.date] = p.score; });
    var cur = scoreAt[latest];
    if (cur == null) return;              // ya no está en el último corte
    if (pts.length < 2) { nuevas++; return; } // historial insuficiente
    var pv = scoreAt[prev];
    var delta = (pv == null) ? null : (cur - pv);

    if (cur >= INF_COMPLETA) { completas++; return; } // completa: no es alerta

    if (delta != null && delta >= INF_MIN_AVANCE) {
      avance.push({ suc: suc, prev: pv, cur: cur, delta: delta });
      return;
    }
    var imp  = lastImprovementDate(pts);
    var days = daysBetween(imp, latest);
    var bajo = (delta != null && delta <= -INF_MIN_AVANCE) ? (-delta) : 0;
    // fromStart = nunca registró un alza desde su primer corte
    var item = { suc: suc, cur: cur, impDate: imp, days: days, bajo: bajo, fromStart: imp === pts[0].date };
    if (days > INF_DIAS_LIMITE) criticas.push(item);
    else                        estanc.push(item);
  });

  avance.sort(function(a,b){ return b.delta - a.delta || a.suc.localeCompare(b.suc, 'es'); });
  estanc.sort(function(a,b){ return b.days  - a.days  || a.suc.localeCompare(b.suc, 'es'); });
  criticas.sort(function(a,b){ return b.days - a.days || a.suc.localeCompare(b.suc, 'es'); });

  return { ok: true, latest: latest, prev: prev, avance: avance, estanc: estanc, criticas: criticas, completas: completas, nuevas: nuevas };
}

/* Calidad de datos: colaboradores que quedarían fuera del informe por no
   tener sucursal válida (la causa típica de cifras erróneas). */
function dataQuality(d) {
  var rows = [].concat(d.bdo || [], d.x4x || []);
  var sinSuc = rows.filter(function(r){ return !isValidSuc((r.sucursal || '').trim()); });
  var nombres = [...new Set(sinSuc.map(function(r){ return (r.nombre || '').trim() || '(sin nombre)'; }))];
  return { total: rows.length, sinSuc: sinSuc.length, nombres: nombres };
}

/* Texto de detalle para una tienda estancada/crítica */
function stallDesc(item) {
  if (item.bajo) return 'bajó ' + item.bajo + ' pts · ' + item.days + ' días sin avance';
  if (item.fromStart) return 'sin avance desde el primer corte ' + fmtCorta(item.impDate) + ' · ' + item.days + ' días';
  return 'último avance ' + fmtCorta(item.impDate) + ' · ' + item.days + ' días';
}

function progSectionText(label, cl) {
  var L = [];
  L.push('▸ ' + label + '  (corte ' + fmtCorta(cl.prev) + ' → ' + fmtCorta(cl.latest) + ')');

  if (cl.avance.length) {
    L.push('  🚀 Mayor avance:');
    cl.avance.slice(0, 8).forEach(function(a){
      L.push('     • ' + a.suc + '  ' + a.prev + '% → ' + a.cur + '%  (+' + a.delta + ' pts)');
    });
    if (cl.avance.length > 8) L.push('     … y ' + (cl.avance.length - 8) + ' más');
  } else {
    L.push('  🚀 Mayor avance: ninguna subió ≥' + INF_MIN_AVANCE + ' pts en el último corte');
  }

  if (cl.estanc.length) {
    L.push('  🟡 Estancadas (≤' + INF_DIAS_LIMITE + ' días sin avance):');
    cl.estanc.slice(0, 10).forEach(function(e){
      L.push('     • ' + e.suc + '  ' + e.cur + '%  (' + stallDesc(e) + ')');
    });
    if (cl.estanc.length > 10) L.push('     … y ' + (cl.estanc.length - 10) + ' más');
  } else {
    L.push('  🟡 Estancadas: ninguna ✅');
  }

  if (cl.criticas.length) {
    L.push('  🔴 Sin avance > ' + INF_DIAS_LIMITE + ' días:');
    cl.criticas.slice(0, 12).forEach(function(c){
      L.push('     • ' + c.suc + '  ' + c.cur + '%  (' + stallDesc(c) + ')');
    });
    if (cl.criticas.length > 12) L.push('     … y ' + (cl.criticas.length - 12) + ' más');
  } else {
    L.push('  🔴 Sin avance > ' + INF_DIAS_LIMITE + ' días: ninguna ✅');
  }

  if (cl.completas) L.push('  ✅ ' + cl.completas + ' tienda(s) ya completas (≥' + INF_COMPLETA + '%)');
  return L.join('\n');
}

function buildInformeText(data) {
  var SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  var FLAGS = { GT: '🇬🇹 GUATEMALA', HN: '🇭🇳 HONDURAS', SV: '🇸🇻 EL SALVADOR' };
  var PAISES = ['GT', 'HN', 'SV'];
  var out = [];
  out.push('📋 INFORME DE AVANCE — DIRECCIÓN Y REGIONALES');
  out.push('Generado: ' + fmtUpdated(new Date().toISOString()));
  out.push(SEP);

  var calidad = [];

  PAISES.forEach(function(p){
    var d = data[p];
    if (!d || !d.config) return;
    var cortes = (d.historico && d.historico.cortes) || [];
    out.push('');
    out.push(FLAGS[p]);

    if (!cortes.length) {
      out.push('  (sin histórico guardado para evaluar avance)');
    } else {
      out.push('  Último corte guardado: ' + fmtLarga(cortes[cortes.length - 1].fecha));
      var progs = [];
      if (!d.config.solo4x4) {
        var clB = classifyProg(cortes, 'bdo');
        progs.push(clB.ok ? progSectionText('Bateador de Objeciones', clB)
                          : '▸ Bateador de Objeciones: se necesitan al menos 2 cortes para evaluar avance.');
      }
      var clX = classifyProg(cortes, '4x4');
      progs.push(clX.ok ? progSectionText('Despliegue 4x4', clX)
                        : '▸ Despliegue 4x4: se necesitan al menos 2 cortes para evaluar avance.');
      out.push(progs.join('\n\n'));
    }

    var q = dataQuality(d);
    if (q.sinSuc > 0) {
      var muestra = q.nombres.slice(0, 6).join(', ') + (q.nombres.length > 6 ? ', …' : '');
      calidad.push('  • ' + p + ': ' + q.sinSuc + ' colaborador(es) sin sucursal — excluidos del informe (' + muestra + ')');
    }
  });

  out.push('');
  out.push(SEP);
  if (calidad.length) {
    out.push('⚠️ REVISAR SEGMENTACIÓN (datos excluidos por estar incompletos)');
    out.push(calidad.join('\n'));
    out.push('   → Asígnales su sucursal en el panel para incluirlos en el próximo informe.');
    out.push('');
  }
  out.push('📌 CÓMO SE CALCULA (datos verificados de los cortes guardados)');
  out.push('  • Cada "Guardar y publicar" crea un corte fechado; el informe compara esos cortes.');
  out.push('  • BDO = promedio de QR y Video por tienda · 4x4 = promedio de sesiones iniciadas.');
  out.push('  • 🚀 Mayor avance: subió ≥' + INF_MIN_AVANCE + ' pts entre los dos últimos cortes.');
  out.push('  • 🟡 Estancada: sin subir hace ≤' + INF_DIAS_LIMITE + ' días.');
  out.push('  • 🔴 Sin avance >' + INF_DIAS_LIMITE + ' días: su último incremento fue hace más de ' + INF_DIAS_LIMITE + ' días.');
  out.push('  • Se excluyen registros sin sucursal o con "#", y tiendas completas (≥' + INF_COMPLETA + '%).');
  return out.join('\n');
}

async function generarInforme() {
  showToast('Generando informe de avance…');
  var results = await Promise.allSettled([
    loadCountryData('GT'),
    loadCountryData('HN'),
    loadCountryData('SV'),
  ]);
  if (results.every(function(r){ return r.status === 'rejected'; })) {
    showToast('Error cargando datos del informe', 'error');
    return;
  }
  var data = {
    GT: results[0].status === 'fulfilled' ? results[0].value : null,
    HN: results[1].status === 'fulfilled' ? results[1].value : null,
    SV: results[2].status === 'fulfilled' ? results[2].value : null,
  };
  var rawText = buildInformeText(data);
  showInformeModal(rawText);

  var pass = sessionStorage.getItem('ferco-admin-pass') || '';
  try {
    var res = await fetch('/api/informe-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': pass },
      body: JSON.stringify({ informe: rawText }),
    });
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);

    var ta = document.getElementById('copyTa');
    var badge = document.getElementById('informeAiBadge');
    if (!ta) return;

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var accumulated = '';
    ta.value = '';

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      accumulated += decoder.decode(chunk.value, { stream: true });
      if (accumulated.includes('[ERROR_IA]')) {
        ta.value = rawText;
        if (badge) { badge.textContent = '⚠️ IA no disponible — informe base'; badge.style.color = '#b45309'; }
        return;
      }
      ta.value = accumulated;
      ta.scrollTop = ta.scrollHeight;
    }
    if (badge) { badge.textContent = '✨ Generado con IA'; badge.style.color = '#0e7490'; }
  } catch (e) {
    var ta2 = document.getElementById('copyTa');
    if (ta2 && !ta2.value.trim()) ta2.value = rawText;
    var badge2 = document.getElementById('informeAiBadge');
    if (badge2) { badge2.textContent = '⚠️ IA no disponible — informe base'; badge2.style.color = '#b45309'; }
  }
}

function showInformeModal(rawText) {
  var overlay = document.getElementById('modalOverlay');
  var box = document.getElementById('modalBox');
  box.querySelector('h3').textContent = '📋 Informe de Avance';
  box.querySelector('p').textContent = 'Resumen para dirección y regionales. Copia y pega en Outlook.';
  box.querySelector('.modal-fields').innerHTML =
    '<div id="informeAiBadge" style="font-size:11px;color:#6b7280;margin-bottom:6px;min-height:18px">⏳ Generando versión ejecutiva con IA…</div>'
    + '<textarea id="copyTa" style="width:100%;height:320px;font-family:monospace;font-size:11px;line-height:1.5;border:1px solid var(--border);border-radius:6px;padding:10px;resize:vertical;white-space:pre-wrap" readonly>' + escHtml(rawText) + '</textarea>'
    + '<button onclick="copyModalText()" style="margin-top:8px;width:100%;background:#1e3a5f;color:#fff;border:none;padding:9px;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px">📋 Copiar al portapapeles</button>';
  box.querySelector('.modal-confirm').style.display = 'none';
  box.querySelector('.modal-actions button:first-child').textContent = 'Cerrar';
  overlay.classList.add('open');
}

/* Modal genérico de "copiar texto" (lo usan Ranking e Informe) */
function showCopyModal(title, subtitle, text) {
  var overlay = document.getElementById('modalOverlay');
  var box = document.getElementById('modalBox');
  box.querySelector('h3').textContent = title;
  box.querySelector('p').textContent = subtitle;
  box.querySelector('.modal-fields').innerHTML =
    '<textarea id="copyTa" style="width:100%;height:320px;font-family:monospace;font-size:11px;line-height:1.5;border:1px solid var(--border);border-radius:6px;padding:10px;resize:vertical;white-space:pre" readonly>' + escHtml(text) + '</textarea>'
    + '<button onclick="copyModalText()" style="margin-top:8px;width:100%;background:#1e3a5f;color:#fff;border:none;padding:9px;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px">📋 Copiar al portapapeles</button>';
  // Ocultar "Confirmar", cambiar "Cancelar" a "Cerrar"
  box.querySelector('.modal-confirm').style.display = 'none';
  box.querySelector('.modal-actions button:first-child').textContent = 'Cerrar';
  overlay.classList.add('open');
}

function showRankingModal(text) {
  showCopyModal('📊 Ranking de Sucursales', 'Copia el texto y pégalo directamente en Outlook.', text);
}

function copyModalText() {
  var ta = document.getElementById('copyTa');
  if (!ta) return;
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  showToast('¡Copiado al portapapeles!', 'success');
}

/* ── Descarga de datos en Excel (CSV con BOM UTF-8) ── */
function descargarExcel() {
  if (!ADMIN_DATA) return;

  var prog    = ADMIN_PROG;
  var allRows = prog === 'bdo' ? (ADMIN_DATA.bdo || []) : (ADMIN_DATA.x4x || []);
  var cols    = getAdminCols();
  var cfg     = ADMIN_DATA.config || {};
  var tieneCanal  = cfg.tieneCanal;
  var tieneRegion = cfg.tieneRegion;
  var tieneZona   = cfg.tieneZona;

  // Cabeceras
  var headers = [];
  if (tieneCanal)  headers.push('Canal');
  if (tieneRegion) headers.push('Región');
  if (tieneZona)   headers.push('Zona');
  headers.push('Sucursal', 'Nombre');
  cols.forEach(function(c) { headers.push(c); });
  headers.push('Nota');

  var SEP = ';';

  function csvCell(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    if (s.indexOf(SEP) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  var lines = [headers.map(csvCell).join(SEP)];

  // Ordenar igual que el grid: sucursal → nombre
  var sorted = allRows.slice().sort(function(a, b) {
    var s = (a.sucursal || '').localeCompare(b.sucursal || '', 'es', { sensitivity: 'base' });
    return s !== 0 ? s : (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
  });

  sorted.forEach(function(row) {
    var vals = row.valores || {};
    var cells = [];
    if (tieneCanal)  cells.push(row.canal  || '');
    if (tieneRegion) cells.push(row.region || '');
    if (tieneZona)   cells.push(row.zona   || '');
    cells.push(row.sucursal || '', row.nombre || '');
    cols.forEach(function(c) {
      var pct = vals[c];
      if (pct === undefined || pct === null) { cells.push(''); return; }
      var div = getDivisor(c);
      // Convertir % almacenado de vuelta a puntuación bruta (ej. 80% con divisor 5 → 4)
      var raw = Math.round((pct / 100) * div * 10) / 10;
      cells.push(raw);
    });
    cells.push(row.nota || '');
    lines.push(cells.map(csvCell).join(SEP));
  });

  var prog_label = prog === 'bdo' ? 'BDO' : '4x4';
  var filename = 'Ferco_' + ADMIN_PAIS + '_' + prog_label + '_' + new Date().toISOString().slice(0, 10) + '.csv';

  // BOM UTF-8 para que Excel abra tildes/ñ correctamente
  var bom = '﻿';
  var blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Descargando ' + filename, 'success');
}
