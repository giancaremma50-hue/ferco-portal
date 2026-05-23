/* ── Estado admin ── */
var ADMIN_DATA   = null;   // blob completo del país actual
var ADMIN_PAIS   = 'GT';
var ADMIN_PROG   = 'bdo';  // 'bdo' | '4x4'
var ADMIN_PASS   = '';
var focusedColIdx = null;  // índice de la col enfocada (null = ninguna)

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
  var wrap = document.createElement('div');
  wrap.id = 'adminGridWrap';
  wrap.innerHTML = '<div id="adminGrid"></div>';
  frag.appendChild(wrap);
  var hint = document.createElement('p');
  hint.style.cssText = 'font-size:11px;color:var(--muted);margin-top:10px;padding:0 4px';
  hint.textContent = '💡 Clic en el encabezado de una columna para enfocarla. Doble clic en el nombre de columna o colaborador para renombrar.';
  frag.appendChild(hint);
  return frag;
}

function setLoading(on) {
  document.getElementById('adminLoader').style.display = on ? 'flex' : 'none';
  if (on) document.getElementById('adminContent').style.display = 'none';
}

/* ── Construcción del grid ── */
function buildAdminGrid() {
  if (!ADMIN_DATA) return;
  focusedColIdx = null;
  var rows = ADMIN_PROG === 'bdo' ? (ADMIN_DATA.bdo || []) : (ADMIN_DATA.x4x || []);
  var cols = getAdminCols();
  var grid = document.getElementById('adminGrid');
  if (!grid) return;
  grid.innerHTML = '';

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
}

function getAdminCols() {
  if (ADMIN_PROG === 'bdo') {
    var qr  = (ADMIN_DATA.config.bdoCols && ADMIN_DATA.config.bdoCols.qr)    || [];
    var vid = (ADMIN_DATA.config.bdoCols && ADMIN_DATA.config.bdoCols.video) || [];
    return qr.concat(vid);
  }
  return ADMIN_DATA.config.sesCols || [];
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
  hdr.innerHTML = 'Colaborador <span style="font-size:11px;color:var(--muted);font-weight:400">— '+rows.length+' registros</span>';
  group.appendChild(hdr);

  rows.forEach(function(row, ri) {
    var cell = document.createElement('div');
    cell.className = 'col-cell name-cell';

    var info = document.createElement('div');
    info.style.flex = '1';
    info.style.minWidth = '0';

    var nameDiv = document.createElement('div');
    nameDiv.className = 'row-name';
    nameDiv.textContent = row.nombre || '—';
    nameDiv.title = 'Doble clic para renombrar';
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
          ADMIN_DATA[getProgKey()][ri].nombre = nv;
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
    sucDiv.textContent = row.sucursal || '';

    info.appendChild(nameDiv);
    info.appendChild(sucDiv);

    var delBtn = document.createElement('span');
    delBtn.className = 'del-row';
    delBtn.title = 'Eliminar fila';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function() { deleteRow(ri); });

    cell.appendChild(info);
    cell.appendChild(delBtn);
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

  rows.forEach(function(row, ri) {
    var pct = parseFloat((row.valores && row.valores[colName]) || 0);
    var displayVal = divisor !== 100 ? Math.round(pct * divisor / 100) : pct;

    var cell = document.createElement('div');
    cell.className = 'col-cell ' + cellBg(pct);

    var inp = document.createElement('input');
    inp.type = 'number';
    inp.min = 0;
    inp.max = divisor;
    inp.value = displayVal;
    inp.dataset.row = ri;
    inp.dataset.col = colName;

    inp.addEventListener('input', function() {
      var raw = Math.min(divisor, Math.max(0, parseFloat(this.value) || 0));
      var pctVal = divisor > 0 ? Math.min(100, Math.round(raw / divisor * 100)) : raw;
      if (!ADMIN_DATA[pk][ri].valores) ADMIN_DATA[pk][ri].valores = {};
      ADMIN_DATA[pk][ri].valores[colName] = pctVal;
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

  rows.forEach(function(row, ri) {
    var cell = document.createElement('div');
    cell.className = 'col-cell';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'nota-input';
    inp.placeholder = 'Agregar nota...';
    inp.value = row.nota || '';
    inp.dataset.row = ri;
    inp.addEventListener('input', function() {
      ADMIN_DATA[getProgKey()][ri].nota = this.value;
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
function addRow() {
  openModal('Agregar colaborador', [
    { id: 'newNombre', label: 'Nombre completo', type: 'text', placeholder: 'Ej: Juan Pérez' },
    { id: 'newSucursal', label: 'Sucursal', type: 'text', placeholder: 'Ej: Tegucigalpa Centro' },
  ], function(vals) {
    if (!vals.newNombre.trim()) { showToast('El nombre es requerido', 'error'); return false; }
    var cols = getAdminCols();
    var valores = {};
    cols.forEach(function(c){ valores[c] = 0; });
    var newRow = {
      canal: '', region: '', zona: '',
      sucursal: vals.newSucursal.trim(),
      nombre: vals.newNombre.trim(),
      valores: valores,
      nota: '',
    };
    ADMIN_DATA[getProgKey()].push(newRow);
    buildAdminGrid();
    showToast('Colaborador agregado');
    return true;
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
  focusedColIdx = null;
  loadAdminCountry(pais);
}

function onAdminProg(prog) {
  ADMIN_PROG = prog;
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
