/* ── Estado global ── */
var DATA = null;
var state = { prog: 'bdo', canal: '', region: 'Todas', zona: 'Todas', suc: 'Todas', search: '' };
var selMeses = null;
var MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── Accesores de datos ── */
function ad() { return state.prog === 'bdo' ? (DATA.bdo || []) : (DATA.x4x || []); }
function getQR()  { return (DATA.config.bdoCols && DATA.config.bdoCols.qr)    || []; }
function getVid() { return (DATA.config.bdoCols && DATA.config.bdoCols.video) || []; }
function getSes() { return DATA.config.sesCols || []; }
function cfg(k)   { return DATA.config[k]; }

/* ── Helpers ── */
function isV(v) { return v && !String(v).includes('#'); }
function uniq(a) { return [...new Set(a.filter(function(v){ return isV(v); }))].sort(); }
function pct(v)  { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function avg(arr) { return arr.length ? Math.round(arr.reduce(function(a,b){ return a+b; }, 0) / arr.length) : 0; }

/* Columnas "activas" de un grupo: aquellas donde al menos un colaborador ya
   tiene avance (> 0). Las que están en 0% para todo el grupo (módulos aún no
   habilitados) se consideran inactivas. */
function activeCols(cols, rws) {
  return cols.filter(function(c){ return rws.some(function(r){ return pct(r.valores && r.valores[c]) > 0; }); });
}
/* Promedio dinámico: promedia solo sobre las columnas activas del grupo. */
function dynAvg(cols, rws) {
  var act = activeCols(cols, rws);
  if (!act.length) return 0;
  return avg(act.reduce(function(a,c){ return a.concat(rws.map(function(r){ return pct(r.valores && r.valores[c]); })); }, []));
}
function sc(v)   { if(v>=80) return 'good'; if(v>=61) return 'mid'; if(v>0) return 'bad'; return 'zero'; }
function svc(v)  { if(v>=80) return 'cg'; if(v>=61) return 'cm'; if(v>0) return 'cb'; return 'c0'; }
function ssv(v)  { if(v>=80) return 'sg'; if(v>=61) return 'sm'; if(v>0) return 'sb'; return 's0'; }

/* ── Sparkline SVG con gradiente de área ── */
function makeSpark(vals, colorCls) {
  if (!vals || !vals.length) return '';
  var W=200, H=56, PX=8, PY=10;
  var minV=Math.min.apply(null,vals), maxV=Math.max.apply(null,vals);
  if(minV===maxV){minV=Math.max(0,minV-15);maxV=Math.min(100,maxV+15);}
  var rng=maxV-minV, n=vals.length;
  var stroke=colorCls==='cg'?'#16a34a':colorCls==='cm'?'#d97706':colorCls==='cb'?'#dc2626':'#94a3b8';
  var pts=vals.map(function(v,i){
    return {x:PX+(n>1?(i/(n-1))*(W-2*PX):W/2), y:H-PY-((v-minV)/rng)*(H-2*PY)};
  });
  /* Curva natural (cardinal spline con bezier cúbico) */
  var lp;
  if(n===1){ lp='M'+pts[0].x.toFixed(1)+','+pts[0].y.toFixed(1); }
  else if(n===2){ lp='M'+pts[0].x.toFixed(1)+','+pts[0].y.toFixed(1)+' L'+pts[1].x.toFixed(1)+','+pts[1].y.toFixed(1); }
  else {
    lp='M'+pts[0].x.toFixed(1)+','+pts[0].y.toFixed(1);
    for(var i=0;i<n-1;i++){
      var x0=i>0?pts[i-1].x:pts[i].x, y0=i>0?pts[i-1].y:pts[i].y;
      var x1=pts[i].x, y1=pts[i].y, x2=pts[i+1].x, y2=pts[i+1].y;
      var x3=i<n-2?pts[i+2].x:x2, y3=i<n-2?pts[i+2].y:y2;
      var cp1x=x1+(x2-x0)/5, cp1y=y1+(y2-y0)/5;
      var cp2x=x2-(x3-x1)/5, cp2y=y2-(y3-y1)/5;
      lp+=' C'+cp1x.toFixed(1)+','+cp1y.toFixed(1)+' '+cp2x.toFixed(1)+','+cp2y.toFixed(1)+' '+x2.toFixed(1)+','+y2.toFixed(1);
    }
  }
  var ap=lp+' L'+pts[n-1].x.toFixed(1)+','+(H-PY)+' L'+pts[0].x.toFixed(1)+','+(H-PY)+' Z';
  var gid='sg'+Math.floor(Math.random()*1e7);
  var dots=pts.map(function(p,i){
    var l=i===n-1;
    return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(l?3:1.5)+'" fill="'+stroke+'" opacity="'+(l?1:0.4)+'"/>';
  }).join('');
  return '<svg class="hist-spark" width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'
    +'<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="5%" stop-color="'+stroke+'" stop-opacity="0.35"/>'
    +'<stop offset="95%" stop-color="'+stroke+'" stop-opacity="0.03"/>'
    +'</linearGradient></defs>'
    +'<path d="'+ap+'" fill="url(#'+gid+')"/>'
    +'<path d="'+lp+'" fill="none" stroke="'+stroke+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'
    +dots+'</svg>';
}

/* ── Promedio de sesiones de una entrada de historico ── */
function sucSesAvg(sd) {
  if(!sd) return 0;
  var ks=Object.keys(sd).filter(function(k){return k.indexOf('4x4_s')===0;});
  var vals=ks.map(function(k){return sd[k]||0;}).filter(function(v){return v>0;});
  return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):0;
}

/* ── Filtrado de filas ── */
function filterHier(rows) {
  var CANAL  = cfg('tieneCanal');
  var REGION = cfg('tieneRegion');
  var ZONA   = cfg('tieneZona');
  return rows.filter(function(r) {
    if (r.sucursal && !isV(r.sucursal)) return false;
    return (!CANAL  || !state.canal  || r.canal    === state.canal)
        && (!REGION || state.region  === 'Todas'   || r.region   === state.region)
        && (!ZONA   || state.zona    === 'Todas'   || r.zona     === state.zona)
        && (state.suc === 'Todas' || r.sucursal === state.suc);
  });
}
function fdRows() {
  var CANAL   = cfg('tieneCanal');
  var REGION  = cfg('tieneRegion');
  var ZONA    = cfg('tieneZona');
  return ad().filter(function(r) {
    if (r.sucursal && !isV(r.sucursal)) return false;
    return (!CANAL  || !state.canal  || r.canal   === state.canal)
        && (!REGION || state.region  === 'Todas'  || r.region    === state.region)
        && (!ZONA   || state.zona    === 'Todas'  || r.zona      === state.zona)
        && (state.suc === 'Todas' || r.sucursal === state.suc)
        && (!state.search || (r.nombre || '').toLowerCase().includes(state.search.toLowerCase()));
  });
}

/* ── Selects de filtros ── */
function popSels() {
  var data = ad();
  var CANAL  = cfg('tieneCanal');
  var REGION = cfg('tieneRegion');
  var ZONA   = cfg('tieneZona');

  if (CANAL) {
    var elC = document.getElementById('canalSel');
    if (elC) {
      var cans = uniq(data.map(function(r){ return r.canal; }));
      elC.innerHTML = '<option value="">Todos</option>' +
        cans.map(function(v){ return '<option value="'+v+'"'+(state.canal===v?' selected':'')+'>'+v+'</option>'; }).join('');
    }
  }
  var byC = (CANAL && state.canal) ? data.filter(function(r){ return r.canal === state.canal; }) : data;

  if (REGION) {
    var elR = document.getElementById('regSel');
    if (elR) elR.innerHTML = ['Todas'].concat(uniq(byC.map(function(r){ return r.region; })))
      .map(function(v){ return '<option'+(v===state.region?' selected':'')+'>'+v+'</option>'; }).join('');
  }
  var byR = (REGION && state.region !== 'Todas') ? byC.filter(function(r){ return r.region === state.region; }) : byC;

  if (ZONA) {
    var elZ = document.getElementById('zonSel');
    if (elZ) elZ.innerHTML = ['Todas'].concat(uniq(byR.map(function(r){ return r.zona; })))
      .map(function(v){ return '<option'+(v===state.zona?' selected':'')+'>'+v+'</option>'; }).join('');
  }
  var byZ = (ZONA && state.zona !== 'Todas') ? byR.filter(function(r){ return r.zona === state.zona; }) : byR;

  var elS = document.getElementById('sucSel');
  if (elS) elS.innerHTML = ['Todas'].concat(uniq(byZ.map(function(r){ return r.sucursal; })))
    .map(function(v){ return '<option'+(v===state.suc?' selected':'')+'>'+v+'</option>'; }).join('');
}

/* ── KPIs ── */
function renderKPIs() {
  var rows = fdRows(), isBdo = state.prog === 'bdo', cards = '';
  if (isBdo) {
    var qr = getQR(), vid = getVid();
    var actQr = activeCols(qr, rows), actVid = activeCols(vid, rows);
    var vQR = dynAvg(qr, rows), vV = dynAvg(vid, rows);
    var modQr  = actQr.length  === qr.length  ? qr.length  + ' mód' : actQr.length  + '/' + qr.length  + ' mód';
    var modVid = actVid.length === vid.length ? vid.length + ' mód' : actVid.length + '/' + vid.length + ' mód';
    cards += '<div class="kpi"><div class="lbl">Promedio QR</div><div class="val '+svc(vQR)+'">'+vQR+'%</div><div class="sub">'+modQr+'</div></div>';
    cards += '<div class="kpi"><div class="lbl">Entrega Video</div><div class="val '+svc(vV)+'">'+vV+'%</div><div class="sub">'+modVid+'</div></div>';
  } else {
    getSes().forEach(function(s, i) {
      var v = avg(rows.map(function(r){ return pct(r.valores && r.valores[s]); }));
      cards += '<div class="kpi"><div class="lbl">Sesión '+(i+1)+'</div><div class="val '+svc(v)+'">'+v+'%</div><div class="sub">Promedio</div></div>';
    });
  }
  var nS = uniq(rows.map(function(r){ return r.sucursal; })).length;
  cards += '<div class="kpi"><div class="lbl">Colaboradores</div><div class="val c0">'+rows.length+'</div><div class="sub">en vista</div></div>';
  cards += '<div class="kpi"><div class="lbl">Sucursales</div><div class="val c0">'+nS+'</div><div class="sub">en vista</div></div>';
  var n = isBdo ? getQR().length + getVid().length + 2 : getSes().length + 2;
  var kr = document.getElementById('kpisRow');
  kr.style.gridTemplateColumns = 'repeat('+Math.min(n,6)+',1fr)';
  kr.innerHTML = cards;
}

/* ── Detalle ── */
function renderDetalle() {
  var rows = fdRows(), isBdo = state.prog === 'bdo';
  var allMet = isBdo ? getQR().concat(getVid()) : getSes();
  var sucs = uniq(rows.map(function(r){ return r.sucursal; })), brHtml = '';

  function barHtml(label, v) {
    return '<div class="bi-lbl"><span>'+label+'</span><span>'+v+'%</span></div>'
         + '<div class="bw"><div class="bb" style="width:'+Math.min(v,100)+'%"></div></div>';
  }

  for (var si = 0; si < sucs.length; si++) {
    var s = sucs[si];
    var sr = rows.filter(function(r){ return r.sucursal === s; });
    var bars;
    if (isBdo) {
      // Bateador: promedio de columnas QR y promedio de columnas Video (solo activas)
      bars = (getQR().length  ? barHtml('QR',    dynAvg(getQR(),  sr)) : '')
           + (getVid().length ? barHtml('Video', dynAvg(getVid(), sr)) : '');
    } else {
      // Despliegue 4x4: promedio de todas las columnas de Sesiones (solo activas)
      bars = getSes().length ? barHtml('Sesiones', dynAvg(getSes(), sr)) : '';
    }
    brHtml += '<div class="bi '+(state.suc===s?'sel':'')+'" data-suc="'+encodeURIComponent(s)+'" onclick="selBr(this)">'
      +'<div class="bi-name">'+s+'</div><div class="bi-sub">'+sr.length+' colaboradores</div>'
      + bars
      +'</div>';
  }
  document.getElementById('branchPanel').innerHTML = brHtml || '<p style="color:var(--muted);padding:16px">Sin sucursales</p>';

  var thead = '<tr><th>Sucursal</th><th>Nombre</th>';
  for (var mi = 0; mi < allMet.length; mi++) thead += '<th>'+allMet[mi]+'</th>';
  thead += '</tr>';
  document.getElementById('tHead').innerHTML = thead;

  var tbody = '';
  var tRows = rows.slice().sort(function(a, b){
    var s = (a.sucursal || '').localeCompare(b.sucursal || '', 'es', { sensitivity: 'base' });
    return s !== 0 ? s : (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
  });
  for (var ri = 0; ri < tRows.length; ri++) {
    var r = tRows[ri];
    if (!isV(r.sucursal)) continue;
    var cells = '';
    for (var ci = 0; ci < allMet.length; ci++) {
      var v = pct(r.valores && r.valores[allMet[ci]]);
      cells += '<td><span class="pill '+sc(v)+'">'+v+'%</span></td>';
    }
    var notaIcon = r.nota ? '<span class="nota-icon" title="'+r.nota.replace(/"/g,'&quot;')+'">📝</span>' : '';
    tbody += '<tr><td><span class="badge">'+r.sucursal+'</span></td><td>'+r.nombre+notaIcon+'</td>'+cells+'</tr>';
  }
  document.getElementById('tBody').innerHTML = tbody || '<tr><td colspan="99" style="color:var(--muted);padding:16px">Sin resultados</td></tr>';
}

function selBr(el) {
  var s = decodeURIComponent(el.dataset.suc);
  state.suc = state.suc === s ? 'Todas' : s;
  document.getElementById('sucSel').value = state.suc;
  render();
}

/* ── Semanas / meses ── */
function semMapFn() {
  var m = {}, cortes = (DATA.historico && DATA.historico.cortes) || [];
  for (var i = 0; i < cortes.length; i++) {
    var c = cortes[i], k = c.semana;
    if (!m[k]) m[k] = [];
    m[k].push(c);
  }
  var ks = Object.keys(m);
  for (var i = 0; i < ks.length; i++) m[ks[i]].sort(function(a,b){ return a.fecha.localeCompare(b.fecha); });
  return m;
}
function mesesConData() {
  var s = new Set(), cortes = (DATA.historico && DATA.historico.cortes) || [];
  for (var i = 0; i < cortes.length; i++) s.add(cortes[i].mesKey);
  return [...s].sort();
}
function semMapActivo() {
  var mm = semMapFn(), meses = selMeses === null ? mesesConData() : selMeses, res = {};
  var ks = Object.keys(mm).map(Number);
  for (var i = 0; i < ks.length; i++) {
    var cv = mm[ks[i]].filter(function(c){ return meses.indexOf(c.mesKey) >= 0; });
    if (cv.length) res[ks[i]] = cv;
  }
  return res;
}

/* ── Histórico helpers ── */
function hAvgK(cortes, sucs, k) {
  var vals = [];
  for (var i = 0; i < cortes.length; i++) for (var j = 0; j < sucs.length; j++) {
    var sd = cortes[i].sucursales[sucs[j]]; if(sd && sd[k]!=null) vals.push(sd[k]);
  }
  return vals.length ? Math.round(vals.reduce(function(a,b){ return a+b; }, 0) / vals.length) : 0;
}
/* REGLAS ANTERIORES — PROMEDIO (preservadas para revertir)
function hm1(cortes, sucs) { return state.prog==='bdo' ? hAvgK(cortes,sucs,'bdo_qr') : hAvgK(cortes,sucs,'4x4_s1'); }
function hm2(cortes, sucs) { return state.prog==='bdo' ? hAvgK(cortes,sucs,'bdo_video') : hAvgK(cortes,sucs,'4x4_s2'); }
function hActQR(sucs) {
  var cortes=(DATA.historico&&DATA.historico.cortes)||[],last=cortes[cortes.length-1],vals=[];
  for(var i=0;i<sucs.length;i++){var sd=last.sucursales[sucs[i]];if(sd&&sd.bdo_qr!=null)vals.push(sd.bdo_qr);}
  return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):0;
}
function hActVideo(sucs) {
  var cortes=(DATA.historico&&DATA.historico.cortes)||[],last=cortes[cortes.length-1],vals=[];
  for(var i=0;i<sucs.length;i++){var sd=last.sucursales[sucs[i]];if(sd&&sd.bdo_video!=null)vals.push(sd.bdo_video);}
  return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):0;
}
function hActSes(sucs) {
  var cortes=(DATA.historico&&DATA.historico.cortes)||[],last=cortes[cortes.length-1],vals=[];
  for(var i=0;i<sucs.length;i++){var sd=last.sucursales[sucs[i]];
    if(sd){var ks=Object.keys(sd).filter(function(k){return k.indexOf('4x4_s')===0;});
      for(var j=0;j<ks.length;j++){if(sd[ks[j]]>0)vals.push(sd[ks[j]]);}}}
  return vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):0;
}
semCells usaba: Prom.QR + Prom.Video (BDO) o Prom.S1 + Prom.S2 (4x4), colspan=2 por semana
actCells usaba: hActQR+hActVideo (BDO) o hActSes (4x4), como porcentaje
actHead: "QR Actual"+"Video Actual" (BDO) o "Sesión Actual" (4x4), rowspan=2 con thSub
─────────────────────────────────────────────────────────────────────────── */

/* NUEVA REGLA — CONTEO DE PARTICIPACIÓN
   semanas históricas : X/Y sucursales con al menos 1 valor > 0 en esa semana
   columna actual     : X/Y colaboradores con al menos 1 valor > 0 (datos en vivo)
   "participó"        = tiene al menos un campo con valor > 0 en el programa activo  */
function partColabs(sucList) {
  var rows = state.prog === 'bdo' ? (DATA.bdo || []) : (DATA.x4x || []);
  var total = 0, activos = 0;
  var sucSet = {};
  for (var i = 0; i < sucList.length; i++) sucSet[sucList[i]] = true;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!sucSet[r.sucursal]) continue;
    total++;
    var vals = r.valores || {}, ks = Object.keys(vals);
    for (var j = 0; j < ks.length; j++) { if ((vals[ks[j]] || 0) > 0) { activos++; break; } }
  }
  return { activos: activos, total: total };
}

/* ── Jerarquía GT ── */
function buildHier() {
  var data = fdRows(), map = {};
  for (var i = 0; i < data.length; i++) {
    var r = data[i]; if (!isV(r.sucursal)) continue;
    var reg = r.region, zona = r.zona;
    // Filas sin región → grupo especial visible en lugar de ignorarlas
    if (!reg) reg = 'Sin Región';
    // Normalizar zona vacía para evitar clave "undefined" en el mapa
    var zonaKey = (zona && zona.trim()) ? zona : 'Sin Zona';
    if (reg === 'Juan Manuel' && zonaKey === 'Eva') {
      if (!map['Eva']) map['Eva'] = { rows:[], zonas:{}, sBZ:{}, eva:true };
      map['Eva'].rows.push(r);
      if (!map['Eva'].zonas['Eva']) map['Eva'].zonas['Eva'] = [];
      map['Eva'].zonas['Eva'].push(r);
      if (!map['Eva'].sBZ['Eva']) map['Eva'].sBZ['Eva'] = {};
      if (!map['Eva'].sBZ['Eva'][r.sucursal]) map['Eva'].sBZ['Eva'][r.sucursal] = [];
      map['Eva'].sBZ['Eva'][r.sucursal].push(r);
    } else if (reg === 'Juan Manuel') {
    } else {
      if (!map[reg]) map[reg] = { rows:[], zonas:{}, sBZ:{} };
      map[reg].rows.push(r);
      if (!map[reg].zonas[zonaKey]) map[reg].zonas[zonaKey] = [];
      map[reg].zonas[zonaKey].push(r);
      if (!map[reg].sBZ[zonaKey]) map[reg].sBZ[zonaKey] = {};
      if (!map[reg].sBZ[zonaKey][r.sucursal]) map[reg].sBZ[zonaKey][r.sucursal] = [];
      map[reg].sBZ[zonaKey][r.sucursal].push(r);
    }
  }
  return map;
}

/* ── Resumen GT ── */
function renderResumen() {
  if (!cfg('tieneResumen')) return;
  var h = buildHier(), mmA = semMapActivo();
  var sems = Object.keys(mmA).map(Number).sort(function(a,b){ return a-b; });
  var isBdo = state.prog === 'bdo', l1 = isBdo?'QR':'S1', l2 = isBdo?'Video':'S2';
  if (!sems.length) { document.getElementById('tab_resumen').innerHTML='<p style="padding:20px;color:var(--muted)">Selecciona al menos un mes con datos.</p>'; return; }

  // Colaboradores por sucursal — SIEMPRE desde datos completos (sin filtros de canal/search)
  // para que coincidan con los totales guardados en los snapshots (bdo_total, 4x4_total).
  var colabsPerSuc = {};
  var _allRows = ad();
  for (var _ri = 0; _ri < _allRows.length; _ri++) {
    var _suc = _allRows[_ri].sucursal;
    if (_suc) colabsPerSuc[_suc] = (colabsPerSuc[_suc] || 0) + 1;
  }
  var _qrCols  = (DATA.config && DATA.config.bdoCols && DATA.config.bdoCols.qr)    || [];
  var _vidCols = (DATA.config && DATA.config.bdoCols && DATA.config.bdoCols.video)  || [];

  // sucPart: devuelve { qr, vid, tot } o { any, tot }.
  // Formato nuevo (bdo_total presente): usa _n y _total del snapshot — numerador y
  //   denominador del mismo corte, garantiza qr ≤ tot siempre.
  // Formato viejo (proxy): usa colabsPerSuc como aproximación, igual que antes.
  function sucPart(sd, suc) {
    var cnt = colabsPerSuc[suc] || 0;
    if (isBdo) {
      if (sd.bdo_total !== undefined) {
        return { qr: sd.bdo_qr_n || 0, vid: sd.bdo_video_n || 0, tot: sd.bdo_total };
      }
      return { qr: (sd.bdo_qr || 0) > 0 ? cnt : 0, vid: (sd.bdo_video || 0) > 0 ? cnt : 0, tot: cnt };
    }
    if (sd['4x4_total'] !== undefined) {
      return { any: sd['4x4_n'] || 0, tot: sd['4x4_total'] };
    }
    var ks2 = Object.keys(sd).filter(function(k){ return k.indexOf('4x4_s') === 0; });
    var anyV = ks2.some(function(k){ return (sd[k] || 0) > 0; }) ? cnt : 0;
    return { any: anyV, tot: cnt };
  }

  // Último corte de la semana cv que tiene datos para esta sucursal
  function latestSd(cv, suc) {
    for (var ci = cv.length - 1; ci >= 0; ci--) {
      if (cv[ci].sucursales[suc]) return cv[ci].sucursales[suc];
    }
    return null;
  }

  // Encabezados — BDO: colspan=2 por semana; 4x4: colspan=1
  function thSems() {
    var h='', cs=isBdo?2:1;
    for(var i=0;i<sems.length;i++) h+='<th class="th-sem sem-sep" colspan="'+cs+'">Semana '+sems[i]+'</th>';
    return h;
  }
  function thSub() {
    if (!isBdo) return '';
    var h='';
    for(var i=0;i<sems.length;i++) h+='<th class="th-sub sem-sep">QR</th><th class="th-sub">Video</th>';
    h+='<th class="th-sub act">QR</th><th class="th-sub act">Video</th>';
    return h;
  }

  // Celdas históricas por semana
  function semCells(sucs) {
    var h = '';
    for (var i = 0; i < sems.length; i++) {
      var cv = mmA[sems[i]], qrA = 0, vidA = 0, anyA = 0, tot = 0;
      for (var si = 0; si < sucs.length; si++) {
        var suc = sucs[si], sd = latestSd(cv, suc);
        if (!sd) { tot += colabsPerSuc[suc] || 0; continue; }
        var p = sucPart(sd, suc);
        tot += p.tot;  // denominador del mismo snapshot → siempre consistente
        if (isBdo) { qrA += p.qr; vidA += p.vid; } else { anyA += p.any; }
      }
      if (isBdo) {
        var qrP = tot ? Math.round(qrA/tot*100) : 0, vidP = tot ? Math.round(vidA/tot*100) : 0;
        h += '<td class="sem-sep"><span class="pill '+sc(qrP)+'">'+qrA+'/'+tot+'</span></td>';
        h += '<td><span class="pill '+sc(vidP)+'">'+vidA+'/'+tot+'</span></td>';
      } else {
        var pct = tot ? Math.round(anyA/tot*100) : 0;
        h += '<td class="sem-sep"><span class="pill '+sc(pct)+'">'+anyA+'/'+tot+'</span></td>';
      }
    }
    return h;
  }

  // Prom. Participación: promedio de conteos exactos por semana
  // Denominador = promedio de bdo_total del snapshot por semana (consistente con semCells).
  function actCells(sucs) {
    var n = sems.length;
    if (!n) return isBdo ? '<td class="act">—</td><td class="act">—</td>' : '<td class="act">—</td>';
    if (isBdo) {
      var qrSum = 0, vidSum = 0, totSum = 0;
      for (var i = 0; i < sems.length; i++) {
        var cv = mmA[sems[i]], semQr = 0, semVid = 0, semTot = 0;
        for (var si = 0; si < sucs.length; si++) {
          var sd = latestSd(cv, sucs[si]);
          if (!sd) { semTot += colabsPerSuc[sucs[si]] || 0; continue; }
          var p = sucPart(sd, sucs[si]); semQr += p.qr; semVid += p.vid; semTot += p.tot;
        }
        qrSum += semQr; vidSum += semVid; totSum += semTot;
      }
      var tot = Math.round(totSum/n);
      var qrAvg = Math.round(qrSum/n), vidAvg = Math.round(vidSum/n);
      var qrP = tot ? Math.round(qrAvg/tot*100) : 0, vidP = tot ? Math.round(vidAvg/tot*100) : 0;
      return '<td class="act"><span class="sv '+ssv(qrP)+'">'+qrAvg+'/'+tot+'</span><div class="sv-pct">'+qrP+'%</div></td>'
           + '<td class="act"><span class="sv '+ssv(vidP)+'">'+vidAvg+'/'+tot+'</span><div class="sv-pct">'+vidP+'%</div></td>';
    }
    var anySum = 0, totSum = 0;
    for (var i = 0; i < sems.length; i++) {
      var cv = mmA[sems[i]], semAny = 0, semTot = 0;
      for (var si = 0; si < sucs.length; si++) {
        var sd = latestSd(cv, sucs[si]);
        if (!sd) { semTot += colabsPerSuc[sucs[si]] || 0; continue; }
        var p = sucPart(sd, sucs[si]); semAny += p.any; semTot += p.tot;
      }
      anySum += semAny; totSum += semTot;
    }
    var tot = Math.round(totSum/n), anyAvg = Math.round(anySum/n);
    var pct = tot ? Math.round(anyAvg/tot*100) : 0;
    return '<td class="act"><span class="sv '+ssv(pct)+'">'+anyAvg+'/'+tot+'</span><div class="sv-pct">'+pct+'%</div></td>';
  }

  var actHead = isBdo
    ? '<th class="act" colspan="2">Prom. Participación</th>'
    : '<th class="act">Prom. Participación</th>';

  var tbody='', regs=Object.keys(h).sort();
  for (var ri=0;ri<regs.length;ri++) {
    var reg=regs[ri],e=h[reg];
    var regSucs=[...new Set(e.rows.map(function(r){return r.sucursal;}).filter(isV))].sort();
    var rk='r_'+reg.replace(/\W/g,'_');
    tbody+='<tr class="rrow"><td class="fix"><button class="xbtn" data-nk="'+rk+'" onclick="tgNode(this)">+</button>'+reg+'</td>'+semCells(regSucs)+actCells(regSucs)+'</tr>';
    var zk=Object.keys(e.zonas).sort();
    var selfZones=zk.filter(function(z){return z===reg;});
    var otherZones=zk.filter(function(z){return z!==reg;});
    if (otherZones.length===0) {
      var sz=selfZones[0];
      var szSucs=[...new Set((e.zonas[sz]||[]).map(function(r){return r.sucursal;}).filter(isV))].sort();
      for (var si=0;si<szSucs.length;si++) {var suc=szSucs[si];
        tbody+='<tr class="srow" id="tr_s_'+rk+'_'+suc.replace(/\W/g,'_')+'" data-par="'+rk+'"><td class="fix">'+suc+'</td>'+semCells([suc])+actCells([suc])+'</tr>';}
    } else {
      for (var szi=0;szi<selfZones.length;szi++) {var sz2=selfZones[szi];
        var szS2=[...new Set((e.zonas[sz2]||[]).map(function(r){return r.sucursal;}).filter(isV))].sort();
        for (var si=0;si<szS2.length;si++) {var suc=szS2[si];
          tbody+='<tr class="srow srow-direct" id="tr_sd_'+rk+'_'+suc.replace(/\W/g,'_')+'" data-par="'+rk+'"><td class="fix">'+suc+'</td>'+semCells([suc])+actCells([suc])+'</tr>';}}
      for (var zi=0;zi<otherZones.length;zi++) {var z=otherZones[zi];
        var zr=e.zonas[z],zSucs=[...new Set(zr.map(function(r){return r.sucursal;}).filter(isV))].sort();
        var zk2='z_'+rk+'_'+z.replace(/\W/g,'_');
        tbody+='<tr class="zrow" id="tr_'+zk2+'" data-par="'+rk+'"><td class="fix"><button class="xbtn" data-nk="'+zk2+'" onclick="tgNode(this)">+</button>'+z+'</td>'+semCells(zSucs)+actCells(zSucs)+'</tr>';
        for (var si=0;si<zSucs.length;si++) {var suc=zSucs[si];
          tbody+='<tr class="srow" id="tr_s_'+zk2+'_'+suc.replace(/\W/g,'_')+'" data-par="'+zk2+'"><td class="fix">'+suc+'</td>'+semCells([suc])+actCells([suc])+'</tr>';}}}
  }
  var subRow = isBdo ? ('<tr>'+thSub()+'</tr>') : '';
  document.getElementById('tab_resumen').innerHTML =
    '<div class="res-scroll"><table class="res-table"><thead>'
    +'<tr><th class="fix"'+(isBdo?' rowspan="2"':'')+'>Regional / Zona / Sucursal</th>'+thSems()+actHead+'</tr>'
    +subRow
    +'</thead><tbody>'+tbody+'</tbody></table></div>';
}

function tgNode(el) {
  var key=el.dataset.nk,open=el.innerHTML==='+';el.innerHTML=open?'&minus;':'+';
  var ch=document.querySelectorAll('[data-par="'+key+'"]');
  for(var i=0;i<ch.length;i++){ch[i].classList.toggle('open',open);
    if(!open){var cb=ch[i].querySelector('.xbtn');
      if(cb){cb.innerHTML='+';var gch=document.querySelectorAll('[data-par="'+cb.dataset.nk+'"]');
        for(var j=0;j<gch.length;j++)gch[j].classList.remove('open');}}}
}

/* ── Filtro meses ── */
function buildMesFilter() {
  var conData=new Set(mesesConData()),selSet=selMeses===null?conData:new Set(selMeses);
  var ano=new Date().getFullYear(),items='';
  for(var m=1;m<=12;m++){
    var mk=ano+'-'+(m<10?'0':'')+m;
    var hasData=conData.has(mk),isSel=selSet.has(mk)&&hasData;
    var cls='mes-item'+(hasData?' has-data'+(isSel?' sel':''):" no-data");
    var cortes=(DATA.historico&&DATA.historico.cortes)||[];
    var cnt=hasData?cortes.filter(function(c){return c.mesKey===mk;}).length+' corte(s)':'Sin datos';
    items+='<div class="'+cls+'" data-mk="'+mk+'" onclick="tgMes(this)"><span class="mes-name">'+MESES_ES[m-1]+'</span><span class="mes-cnt">'+cnt+'</span></div>';}
  var nS=selMeses===null?conData.size:[...new Set(selMeses)].filter(function(mk){return conData.has(mk);}).length;
  var btn=document.getElementById('mesFiltBtn');
  if(btn)btn.innerHTML='📅 Meses'+(nS<conData.size?' ('+nS+'/'+conData.size+')':'')+' <span class="arr">&#9660;</span>';
  var dd=document.getElementById('mesFiltDD');
  if(dd)dd.innerHTML='<div class="mes-grid">'+items+'</div>'
    +'<div class="mes-actions"><button onclick="selAllMeses()">Todas</button>'
    +'<button class="apply" onclick="aplicarMeses()">Aplicar</button></div>';
}
function tgMes(el){
  var mk=el.dataset.mk;if(!el.classList.contains('has-data'))return;
  var conData=mesesConData();if(selMeses===null)selMeses=mesesConData().slice();
  var idx=selMeses.indexOf(mk);
  if(idx>=0)selMeses.splice(idx,1);else{selMeses.push(mk);selMeses.sort();}
  if(selMeses.length===conData.length)selMeses=null;
  el.classList.toggle('sel',selMeses===null||selMeses.indexOf(mk)>=0);
  var nS=selMeses===null?conData.length:[...new Set(selMeses)].filter(function(m){return conData.indexOf(m)>=0;}).length;
  var btn=document.getElementById('mesFiltBtn');
  if(btn)btn.innerHTML='📅 Meses'+(nS<conData.length?' ('+nS+'/'+conData.length+')':'')+' <span class="arr">&#9660;</span>';
}
function selAllMeses(){selMeses=null;buildMesFilter();}
function aplicarMeses(){toggleMesFilt();render();}
function toggleMesFilt(){
  var btn=document.getElementById('mesFiltBtn'),dd=document.getElementById('mesFiltDD');
  if(!btn||!dd)return;
  var isOpen=dd.classList.contains('open');
  if(!isOpen){var rect=btn.getBoundingClientRect(),ddW=300,left=rect.right-ddW;if(left<8)left=8;
    dd.style.top=(rect.bottom+6)+'px';dd.style.left=left+'px';}
  btn.classList.toggle('open',!isOpen);dd.classList.toggle('open',!isOpen);}
document.addEventListener('click',function(e){
  var f=document.querySelector('.mes-filter');
  if(f&&!f.contains(e.target)){var btn=document.getElementById('mesFiltBtn'),dd=document.getElementById('mesFiltDD');
    if(btn)btn.classList.remove('open');if(dd)dd.classList.remove('open');}});

/* ── Histórico ── */
function getSucsF() {
  var filt=fdRows();
  var sf=uniq(filt.map(function(r){return r.sucursal;}));
  var cortes=(DATA.historico&&DATA.historico.cortes)||[];
  var ahs=new Set();for(var i=0;i<cortes.length;i++)Object.keys(cortes[i].sucursales||{}).forEach(function(s){if(isV(s))ahs.add(s);});
  return sf.filter(function(s){return ahs.has(s);});
}

function renderHistorico() {
  var allCortes=(DATA.historico&&DATA.historico.cortes)||[];
  if(!allCortes.length){document.getElementById('tab_historico').innerHTML='<p style="color:var(--muted);padding:16px">Sin histórico.</p>';return;}
  /* Filtrar por meses seleccionados */
  var cortes = (selMeses && selMeses.length)
    ? allCortes.filter(function(c){ return selMeses.indexOf(c.mesKey) >= 0; })
    : allCortes;
  if(!cortes.length){document.getElementById('tab_historico').innerHTML='<p style="color:var(--muted-fg);padding:16px">Sin datos para los meses seleccionados.</p>';return;}
  var isBdo=state.prog==='bdo';

  /* Sucursales activas (con histórico) — respeta filtros activos */
  var sucs = getSucsF();

  var first=cortes[0], last=cortes[cortes.length-1];
  var fi=first.fecha.split('-').reverse().join('/'), ff=last.fecha.split('-').reverse().join('/');

  /* Timelines para sparklines (todos los cortes) */
  var qrTL=[], vidTL=[], sesTL=[];
  for(var ci=0;ci<cortes.length;ci++){
    var co=cortes[ci];
    if(isBdo){
      var qrV=sucs.map(function(s){var sd=co.sucursales[s];return sd&&sd.bdo_qr!=null?sd.bdo_qr:null;}).filter(function(v){return v!==null;});
      qrTL.push(qrV.length?Math.round(qrV.reduce(function(a,b){return a+b;},0)/qrV.length):0);
      var vdV=sucs.map(function(s){var sd=co.sucursales[s];return sd&&sd.bdo_video!=null?sd.bdo_video:null;}).filter(function(v){return v!==null;});
      vidTL.push(vdV.length?Math.round(vdV.reduce(function(a,b){return a+b;},0)/vdV.length):0);
    } else {
      var svs=[];
      sucs.forEach(function(s){var sd=co.sucursales[s];if(sd)Object.keys(sd).filter(function(k){return k.indexOf('4x4_s')===0;}).forEach(function(k){if(sd[k]!=null)svs.push(sd[k]);});});
      sesTL.push(svs.length?Math.round(svs.reduce(function(a,b){return a+b;},0)/svs.length):0);
    }
  }

  /* Valores resumen */
  var v1i=qrTL[0]||0, v1f=qrTL[qrTL.length-1]||0, d1=v1f-v1i;
  var v2i=vidTL[0]||0, v2f=vidTL[vidTL.length-1]||0, d2=v2f-v2i;
  var vSI=sesTL[0]||0, vSF=sesTL[sesTL.length-1]||0, dS=vSF-vSI;

  /* Mejor sucursal y mayor avance */
  var bs='—',bv=0,ts='—',td=-999,mej=0;
  for(var si=0;si<sucs.length;si++){
    var s=sucs[si], sdN=last.sucursales[s], sd0=first.sucursales[s];
    var vN=isBdo?(sdN&&sdN.bdo_qr!=null?sdN.bdo_qr:0):sucSesAvg(sdN);
    var v0=isBdo?(sd0&&sd0.bdo_qr!=null?sd0.bdo_qr:0):sucSesAvg(sd0);
    if(vN>bv){bv=vN;bs=s;}
    var dl=vN-v0; if(dl>td){td=dl;ts=s;}
    if(vN>v0)mej++;
  }
  var pm=sucs.length?Math.round(mej/sucs.length*100):0;

  function db(d){return d>0?'pos':d<0?'neg':'neu';}
  function ds(d){return d>0?'+':'';}

  /* Tarjetas resumen */
  var summary;
  if(isBdo){
    summary='<div class="hist-summary">'
      +'<div class="hist-stat"><div class="hs-lbl">QR — Período</div>'
      +makeSpark(qrTL,svc(v1f))
      +'<div class="hs-main"><span class="hs-val '+svc(v1f)+'">'+v1f+'%</span><span class="hs-delta '+db(d1)+'">'+ds(d1)+d1+' pts</span></div>'
      +'<div class="hs-sub">Inicio <strong>'+v1i+'%</strong> → Hoy <strong>'+v1f+'%</strong></div>'
      +'<div class="hs-period">'+fi+' → '+ff+'</div></div>'
      +'<div class="hist-stat"><div class="hs-lbl">Video — Período</div>'
      +makeSpark(vidTL,svc(v2f))
      +'<div class="hs-main"><span class="hs-val '+svc(v2f)+'">'+v2f+'%</span><span class="hs-delta '+db(d2)+'">'+ds(d2)+d2+' pts</span></div>'
      +'<div class="hs-sub">Inicio <strong>'+v2i+'%</strong> → Hoy <strong>'+v2f+'%</strong></div>'
      +'<div class="hs-period">'+fi+' → '+ff+'</div></div>'
      +'<div class="hist-stat"><div class="hs-lbl">🏆 Mejor Sucursal</div><div class="hs-main"><span class="hs-val '+svc(bv)+'">'+bv+'%</span></div><div class="hs-sub"><strong>'+bs+'</strong></div><div class="hs-period">En QR — último corte</div></div>'
      +'<div class="hist-stat"><div class="hs-lbl">📈 Mayor Avance</div><div class="hs-main"><span class="hs-val '+(td>0?'cg':td<0?'cb':'c0')+'">'+(td>0?'+':'')+td+' pts</span></div><div class="hs-sub"><strong>'+ts+'</strong></div><div class="hs-period">'+pm+'% mejoraron</div></div>'
      +'</div>';
  } else {
    summary='<div class="hist-summary" style="grid-template-columns:repeat(3,1fr)">'
      +'<div class="hist-stat"><div class="hs-lbl">Promedio de Despliegue</div>'
      +makeSpark(sesTL,svc(vSF))
      +'<div class="hs-main"><span class="hs-val '+svc(vSF)+'">'+vSF+'%</span><span class="hs-delta '+db(dS)+'">'+ds(dS)+dS+' pts</span></div>'
      +'<div class="hs-sub">Inicio <strong>'+vSI+'%</strong> → Hoy <strong>'+vSF+'%</strong></div>'
      +'<div class="hs-period">'+fi+' → '+ff+'</div></div>'
      +'<div class="hist-stat"><div class="hs-lbl">🏆 Mejor Sucursal</div><div class="hs-main"><span class="hs-val '+svc(bv)+'">'+bv+'%</span></div><div class="hs-sub"><strong>'+bs+'</strong></div><div class="hs-period">Último corte</div></div>'
      +'<div class="hist-stat"><div class="hs-lbl">📈 Mayor Avance</div><div class="hs-main"><span class="hs-val '+(td>0?'cg':td<0?'cb':'c0')+'">'+(td>0?'+':'')+td+' pts</span></div><div class="hs-sub"><strong>'+ts+'</strong></div><div class="hs-period">'+pm+'% mejoraron</div></div>'
      +'</div>';
  }

  /* Tabla por semanas (aplica para todos los países) */
  var mmA=semMapActivo(), sems=Object.keys(mmA).map(Number).sort(function(a,b){return a-b;});
  if(!sems.length){
    document.getElementById('tab_historico').innerHTML=summary+'<p style="color:var(--muted);padding:14px">Selecciona un mes con datos.</p>';
    return;
  }

  var actHead=isBdo
    ?'<th class="sfix" style="background:#dcfce7;color:var(--good)">QR Actual</th><th style="background:#dcfce7;color:var(--good)">Video Actual</th>'
    :'<th style="background:#dcfce7;color:var(--good)">Despliegue Actual</th>';

  function actColSuc(suc){
    var sd=last.sucursales[suc];
    if(isBdo){
      var qr=sd&&sd.bdo_qr!=null?sd.bdo_qr:0, vid=sd&&sd.bdo_video!=null?sd.bdo_video:0;
      return'<td><span class="pill '+sc(qr)+'">'+qr+'%</span></td><td><span class="pill '+sc(vid)+'">'+vid+'%</span></td>';
    }
    var va=sucSesAvg(sd);
    return'<td><span class="pill '+sc(va)+'">'+va+'%</span></td>';
  }

  function thH(){
    var h='';
    for(var i=0;i<sems.length;i++){
      if(isBdo) h+='<th class="th-sem sem-sep" colspan="2">S'+sems[i]+'</th>';
      else h+='<th class="th-sem sem-sep">S'+sems[i]+'</th>';
    }
    return h;
  }
  function thSH(){
    var h='';
    for(var i=0;i<sems.length;i++){
      if(isBdo) h+='<th class="th-sub sem-sep">Prom.QR</th><th class="th-sub">Prom.Video</th>';
      else h+='<th class="th-sub sem-sep">Prom.Desp.</th>';
    }
    return h;
  }
  function sCells(suc){
    var h='';
    for(var i=0;i<sems.length;i++){
      var cv=mmA[sems[i]];
      if(isBdo){
        var v1s=cv.map(function(c){var sd=c.sucursales[suc];return sd&&sd.bdo_qr!=null?sd.bdo_qr:null;}).filter(function(v){return v!==null;});
        var v2s=cv.map(function(c){var sd=c.sucursales[suc];return sd&&sd.bdo_video!=null?sd.bdo_video:null;}).filter(function(v){return v!==null;});
        var p1=v1s.length?Math.round(v1s.reduce(function(a,b){return a+b;},0)/v1s.length):0;
        var p2=v2s.length?Math.round(v2s.reduce(function(a,b){return a+b;},0)/v2s.length):0;
        h+='<td class="sem-sep"><span class="pill '+sc(p1)+'">'+p1+'%</span></td><td><span class="pill '+sc(p2)+'">'+p2+'%</span></td>';
      } else {
        var svs2=[];
        cv.forEach(function(c){var sd=c.sucursales[suc];if(sd)Object.keys(sd).filter(function(k){return k.indexOf('4x4_s')===0;}).forEach(function(k){if(sd[k]!=null)svs2.push(sd[k]);});});
        var pa=svs2.length?Math.round(svs2.reduce(function(a,b){return a+b;},0)/svs2.length):0;
        h+='<td class="sem-sep"><span class="pill '+sc(pa)+'">'+pa+'%</span></td>';
      }
    }
    return h;
  }

  var tbody='';
  for(var si=0;si<sucs.length;si++){var s=sucs[si];tbody+='<tr><td class="sfix">'+s+'</td>'+sCells(s)+actColSuc(s)+'</tr>';}

  document.getElementById('tab_historico').innerHTML=summary
    +'<div class="hist-scroll"><table class="hist-table" style="width:auto"><thead>'
    +'<tr><th class="sfix" rowspan="2">Sucursal</th>'+thH()+actHead+'</tr>'
    +'<tr>'+thSH()+'</tr></thead><tbody>'+tbody+'</tbody></table></div>';
}

/* ── Control general ── */
/* ── Participación acumulada ── */
function renderParticipacion() {
  var isSolo4x4 = cfg('solo4x4');
  var qrCols  = getQR();
  var vidCols = getVid();
  var sesCols = getSes();

  var allBdo = isSolo4x4 ? [] : filterHier(DATA.bdo || []);
  var allX4x = filterHier(DATA.x4x || []);

  var cortes   = (DATA.historico && DATA.historico.cortes) || [];
  var fechaIni = cortes.length ? cortes[0].fecha : null;
  var fechaFin = DATA.updatedAt ? new Date(DATA.updatedAt).toLocaleDateString('es-GT') : new Date().toLocaleDateString('es-GT');

  function countPart(rows, cols) {
    var active = cols.filter(function(k) {
      return rows.some(function(r) { return pct(r.valores && r.valores[k]) > 0; });
    });
    if (!active.length) return { n: 0, tot: rows.length };
    return {
      n: rows.filter(function(r) {
        return active.every(function(k) { return pct(r.valores && r.valores[k]) > 0; });
      }).length,
      tot: rows.length
    };
  }

  function statRow(st, label) {
    if (!st || !st.tot) return '<div class="pt-stat"><span class="pt-stat-lbl">'+label+'</span><span class="s0">—</span></div>';
    var p = Math.round(st.n / st.tot * 100);
    return '<div class="pt-stat">'
      +'<span class="pt-stat-lbl">'+label+'</span>'
      +'<span class="sv '+ssv(p)+'">'+st.n+'/'+st.tot+'</span>'
      +'<span class="pt-pct">'+p+'%</span>'
      +'</div>';
  }

  var cardsHtml = '';
  if (!isSolo4x4 && allBdo.length) {
    var gQr  = countPart(allBdo, qrCols);
    var gVid = countPart(allBdo, vidCols);
    cardsHtml += '<div class="pt-card">'
      +'<div class="pt-card-title">Bateador de Objeciones</div>'
      + statRow(gQr,  'QR — Códigos')
      + statRow(gVid, 'Video — Módulos')
      +'</div>';
  }
  if (allX4x.length) {
    var g4x4 = countPart(allX4x, sesCols);
    cardsHtml += '<div class="pt-card">'
      +'<div class="pt-card-title">Despliegue 4×4</div>'
      + statRow(g4x4, 'Sesiones completadas')
      +'</div>';
  }

  var allRows = allBdo.concat(allX4x);
  var sucNames = [], seen = {};
  for (var i = 0; i < allRows.length; i++) {
    var s = allRows[i].sucursal;
    if (s && isV(s) && !seen[s]) { seen[s] = true; sucNames.push(s); }
  }
  sucNames.sort();

  var thead = '<th class="pt-suc-th">Sucursal</th>';
  if (!isSolo4x4) thead += '<th class="pt-num-th">BDO — QR</th><th class="pt-num-th">BDO — Video</th>';
  thead += '<th class="pt-num-th">4×4 — Sesiones</th>';

  var tbody = sucNames.map(function(suc) {
    var bRows = allBdo.filter(function(r) { return r.sucursal === suc; });
    var xRows = allX4x.filter(function(r) { return r.sucursal === suc; });
    var cells = '<td class="pt-suc-td">'+suc+'</td>';

    if (!isSolo4x4) {
      if (bRows.length) {
        var sq = countPart(bRows, qrCols), sv2 = countPart(bRows, vidCols);
        var pq = sq.tot  ? Math.round(sq.n  / sq.tot  * 100) : 0;
        var pv = sv2.tot ? Math.round(sv2.n / sv2.tot * 100) : 0;
        cells += '<td class="pt-num-td"><span class="sv '+ssv(pq)+'">'+sq.n+'/'+sq.tot+'</span><div class="sv-pct">'+pq+'%</div></td>';
        cells += '<td class="pt-num-td"><span class="sv '+ssv(pv)+'">'+sv2.n+'/'+sv2.tot+'</span><div class="sv-pct">'+pv+'%</div></td>';
      } else {
        cells += '<td class="pt-num-td s0">—</td><td class="pt-num-td s0">—</td>';
      }
    }
    if (xRows.length) {
      var s4 = countPart(xRows, sesCols);
      var p4 = s4.tot ? Math.round(s4.n / s4.tot * 100) : 0;
      cells += '<td class="pt-num-td"><span class="sv '+ssv(p4)+'">'+s4.n+'/'+s4.tot+'</span><div class="sv-pct">'+p4+'%</div></td>';
    } else {
      cells += '<td class="pt-num-td s0">—</td>';
    }
    return '<tr>'+cells+'</tr>';
  }).join('');

  var range = fechaIni
    ? 'Desde '+fechaIni+' hasta '+fechaFin
    : 'Hasta '+fechaFin;

  document.getElementById('tab_participacion').innerHTML =
    '<div class="pt-header"><h3 class="pt-title">Participación Acumulada</h3>'
    +'<span class="pt-range">'+range+'</span></div>'
    +'<div class="pt-cards">'+cardsHtml+'</div>'
    +'<div class="pt-table-wrap"><table class="pt-table">'
    +'<thead><tr>'+thead+'</tr></thead><tbody>'+tbody+'</tbody></table></div>';
}

function _applyTabVisibility(tn) {
  document.getElementById('kpisRow').style.display = tn==='detalle' ? 'grid' : 'none';
  var showFilters = tn!=='resumen' || cfg('tieneResumen');
  document.getElementById('filtersSection').style.display = showFilters ? 'block' : 'none';
  var fm=document.getElementById('filtersMain');
  if(fm) fm.style.display = '';
  var mr=document.getElementById('mesRow');
  if(mr) mr.style.display = (tn==='historico'||(tn==='resumen'&&cfg('tieneResumen'))) ? 'block' : 'none';
  /* ocultar toggle BDO/4x4 en pestaña Participación (muestra ambos programas) */
  var tog=document.getElementById('togArea');
  if(tog) tog.style.display = tn==='participacion' ? 'none' : '';
}
function render() {
  var t = document.querySelector('.tab.active'); var tn = t ? t.dataset.tab : 'detalle';
  _applyTabVisibility(tn);
  if (tn==='detalle')             { renderKPIs(); renderDetalle(); }
  else if (tn==='resumen')        renderResumen();
  else if (tn==='historico')      renderHistorico();
  else if (tn==='participacion')  renderParticipacion();
}
function buildTog() {
  if (cfg('solo4x4')) return;
  document.getElementById('togArea').innerHTML =
    '<div style="display:flex;gap:8px">'
    +'<button class="btn '+(state.prog==='bdo'?'active':'')+'" onclick="setProg(\'bdo\')">Bateador de Objeciones</button>'
    +'<button class="btn '+(state.prog==='4x4'?'active':'')+'" onclick="setProg(\'4x4\')">Despliegue 4x4</button>'
    +'</div>';
}
function setProg(p) {
  state.prog=p;state.canal='';state.region='Todas';state.zona='Todas';state.suc='Todas';state.search='';
  var s=document.getElementById('srch');if(s)s.value='';
  var c=document.getElementById('canalSel');if(c)c.value='';
  buildTog();buildMesFilter();popSels();render();
}
function onCanal() { state.canal=document.getElementById('canalSel').value;state.region='Todas';state.zona='Todas';state.suc='Todas';popSels();render(); }
function onReg()   { state.region=document.getElementById('regSel').value;state.zona='Todas';state.suc='Todas';popSels();render(); }
function onZon()   { state.zona=document.getElementById('zonSel').value;state.suc='Todas';popSels();render(); }
function onSuc()   { state.suc=document.getElementById('sucSel').value;render(); }
function onSearch(){ state.search=document.getElementById('srch').value;render(); }
function clearAll(){
  state.canal='';state.region='Todas';state.zona='Todas';state.suc='Todas';state.search='';
  var s=document.getElementById('srch');if(s)s.value='';
  var c=document.getElementById('canalSel');if(c)c.value='';
  popSels();render();
}
function setTab(t, btn) {
  ['detalle','resumen','historico','participacion'].forEach(function(x){
    var el=document.getElementById('tab_'+x);if(el)el.style.display=x===t?'block':'none';});
  document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active');delete b.dataset.tab;});
  btn.classList.add('active');btn.dataset.tab=t;
  render();
}

/* ── Inicialización ── */
function initDashboard(data) {
  DATA = data;
  selMeses = null;
  state = { prog: cfg('solo4x4') ? '4x4' : 'bdo', canal:'', region:'Todas', zona:'Todas', suc:'Todas', search:'' };

  var tieneCanal  = cfg('tieneCanal');
  var tieneRegion = cfg('tieneRegion');
  var tieneZona   = cfg('tieneZona');
  var tieneResumen= cfg('tieneResumen');
  var solo4x4     = cfg('solo4x4');

  // Mostrar/ocultar filtros según país
  var elCanal = document.getElementById('filterCanal');
  var elReg   = document.getElementById('filterReg');
  var elZon   = document.getElementById('filterZon');
  var tabRes  = document.getElementById('tabResumen');

  if (elCanal) elCanal.style.display = tieneCanal ? '' : 'none';
  if (elReg)   elReg.style.display   = tieneRegion ? '' : 'none';
  if (elZon)   elZon.style.display   = tieneZona   ? '' : 'none';
  if (tabRes)  tabRes.style.display  = tieneResumen ? '' : 'none';
  /* mesFilt visibility is managed by _applyTabVisibility via render() */

  // Ocultar toggle BDO/4x4 si solo_4x4
  var togArea = document.getElementById('togArea');
  if (togArea) togArea.innerHTML = '';

  buildTog();
  buildMesFilter();
  popSels();
  render();
}
