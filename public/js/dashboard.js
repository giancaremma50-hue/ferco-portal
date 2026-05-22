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
function sc(v)   { if(v>=80) return 'good'; if(v>=61) return 'mid'; if(v>0) return 'bad'; return 'zero'; }
function svc(v)  { if(v>=80) return 'cg'; if(v>=61) return 'cm'; if(v>0) return 'cb'; return 'c0'; }
function ssv(v)  { if(v>=80) return 'sg'; if(v>=61) return 'sm'; if(v>0) return 'sb'; return 's0'; }

/* ── Filtrado de filas ── */
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
    var vQR = avg(qr.reduce(function(a,c){ return a.concat(rows.map(function(r){ return pct(r.valores && r.valores[c]); })); }, []));
    var vV  = avg(vid.reduce(function(a,c){ return a.concat(rows.map(function(r){ return pct(r.valores && r.valores[c]); })); }, []));
    cards += '<div class="kpi"><div class="lbl">Promedio QR</div><div class="val '+svc(vQR)+'">'+vQR+'%</div><div class="sub">'+qr.length+' mód</div></div>';
    cards += '<div class="kpi"><div class="lbl">Entrega Video</div><div class="val '+svc(vV)+'">'+vV+'%</div><div class="sub">'+vid.length+' mód</div></div>';
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
  var met1 = isBdo ? getQR() : getSes().slice(0,1);
  var met2 = isBdo ? getVid() : getSes().slice(1,2);
  var l1 = isBdo ? 'QR' : 'S1', l2 = isBdo ? 'Video' : 'S2';
  var sucs = uniq(rows.map(function(r){ return r.sucursal; })), brHtml = '';

  for (var si = 0; si < sucs.length; si++) {
    var s = sucs[si];
    var sr = rows.filter(function(r){ return r.sucursal === s; });
    var v1 = avg(met1.reduce(function(a,c){ return a.concat(sr.map(function(r){ return pct(r.valores && r.valores[c]); })); }, []));
    var v2 = met2.length ? avg(met2.reduce(function(a,c){ return a.concat(sr.map(function(r){ return pct(r.valores && r.valores[c]); })); }, [])) : null;
    brHtml += '<div class="bi '+(state.suc===s?'sel':'')+'" data-suc="'+encodeURIComponent(s)+'" onclick="selBr(this)">'
      +'<div class="bi-name">'+s+'</div><div class="bi-sub">'+sr.length+' colaboradores</div>'
      +'<div class="bi-lbl"><span>'+l1+'</span><span>'+v1+'%</span></div>'
      +'<div class="bw"><div class="bb" style="width:'+Math.min(v1,100)+'%"></div></div>'
      +(v2!==null?'<div class="bi-lbl"><span>'+l2+'</span><span>'+v2+'%</span></div>'
        +'<div class="bw"><div class="bb" style="width:'+Math.min(v2,100)+'%"></div></div>':'')
      +'</div>';
  }
  document.getElementById('branchPanel').innerHTML = brHtml || '<p style="color:var(--muted);padding:16px">Sin sucursales</p>';

  var thead = '<tr><th>Sucursal</th><th>Nombre</th>';
  for (var mi = 0; mi < allMet.length; mi++) thead += '<th>'+allMet[mi]+'</th>';
  thead += '</tr>';
  document.getElementById('tHead').innerHTML = thead;

  var tbody = '';
  for (var ri = 0; ri < rows.length; ri++) {
    var r = rows[ri];
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
function hm1(cortes, sucs) { return state.prog==='bdo' ? hAvgK(cortes,sucs,'bdo_qr') : hAvgK(cortes,sucs,'4x4_s1'); }
function hm2(cortes, sucs) { return state.prog==='bdo' ? hAvgK(cortes,sucs,'bdo_video') : hAvgK(cortes,sucs,'4x4_s2'); }
function hActQR(sucs) {
  var cortes = (DATA.historico && DATA.historico.cortes) || [];
  var last = cortes[cortes.length-1], vals = [];
  for (var i = 0; i < sucs.length; i++) { var sd = last.sucursales[sucs[i]]; if(sd && sd.bdo_qr!=null) vals.push(sd.bdo_qr); }
  return vals.length ? Math.round(vals.reduce(function(a,b){ return a+b; }, 0) / vals.length) : 0;
}
function hActVideo(sucs) {
  var cortes = (DATA.historico && DATA.historico.cortes) || [];
  var last = cortes[cortes.length-1], vals = [];
  for (var i = 0; i < sucs.length; i++) { var sd = last.sucursales[sucs[i]]; if(sd && sd.bdo_video!=null) vals.push(sd.bdo_video); }
  return vals.length ? Math.round(vals.reduce(function(a,b){ return a+b; }, 0) / vals.length) : 0;
}
function hActSes(sucs) {
  var cortes = (DATA.historico && DATA.historico.cortes) || [];
  var last = cortes[cortes.length-1], vals = [];
  for (var i = 0; i < sucs.length; i++) {
    var sd = last.sucursales[sucs[i]];
    if (sd) { var ks = Object.keys(sd).filter(function(k){ return k.indexOf('4x4_s')===0; });
      for (var j = 0; j < ks.length; j++) { if(sd[ks[j]]>0) vals.push(sd[ks[j]]); } }
  }
  return vals.length ? Math.round(vals.reduce(function(a,b){ return a+b; }, 0) / vals.length) : 0;
}

/* ── Jerarquía GT ── */
function buildHier() {
  var data = ad(), map = {};
  for (var i = 0; i < data.length; i++) {
    var r = data[i]; if (!isV(r.sucursal)) continue;
    var reg = r.region, zona = r.zona; if (!reg) continue;
    if (reg === 'Juan Manuel' && zona === 'Eva') {
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
      if (!map[reg].zonas[zona]) map[reg].zonas[zona] = [];
      map[reg].zonas[zona].push(r);
      if (!map[reg].sBZ[zona]) map[reg].sBZ[zona] = {};
      if (!map[reg].sBZ[zona][r.sucursal]) map[reg].sBZ[zona][r.sucursal] = [];
      map[reg].sBZ[zona][r.sucursal].push(r);
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

  function thSems() { var h=''; for(var i=0;i<sems.length;i++) h+='<th class="th-sem sem-sep" colspan="2">S'+sems[i]+'</th>'; return h; }
  function thSub()  { var h=''; for(var i=0;i<sems.length;i++) h+='<th class="th-sub sem-sep">Prom.'+l1+'</th><th class="th-sub">Prom.'+l2+'</th>'; return h; }
  function semCells(sucs) {
    var h='';
    for (var i=0;i<sems.length;i++) { var cv=mmA[sems[i]],v1=hm1(cv,sucs),v2=hm2(cv,sucs);
      h+='<td class="sem-sep"><span class="pill '+sc(v1)+'">'+v1+'%</span></td><td><span class="pill '+sc(v2)+'">'+v2+'%</span></td>'; }
    return h;
  }
  function actCells(sucs) {
    if (isBdo) { var qr=hActQR(sucs),vid=hActVideo(sucs);
      return '<td class="act"><span class="sv '+ssv(qr)+'">'+qr+'%</span></td><td class="act"><span class="sv '+ssv(vid)+'">'+vid+'%</span></td>'; }
    var ses=hActSes(sucs);
    return '<td class="act"><span class="sv '+ssv(ses)+'">'+ses+'%</span></td>';
  }
  var actHead = isBdo ? '<th class="act" rowspan="2">QR Actual</th><th class="act" rowspan="2">Video Actual</th>'
                      : '<th class="act" rowspan="2">Sesión Actual</th>';

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
  document.getElementById('tab_resumen').innerHTML =
    '<div class="res-scroll"><table class="res-table"><thead>'
    +'<tr><th class="fix" rowspan="2">Regional / Zona / Sucursal</th>'+thSems()+actHead+'</tr>'
    +'<tr>'+thSub()+'</tr></thead><tbody>'+tbody+'</tbody></table></div>';
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
  if (!cfg('tieneResumen')) return;
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
  var cortes=(DATA.historico&&DATA.historico.cortes)||[];
  if(!cortes.length){document.getElementById('tab_historico').innerHTML='<p style="color:var(--muted);padding:16px">Sin histórico.</p>';return;}
  var isBdo=state.prog==='bdo',mk1=isBdo?'bdo_qr':'4x4_s1',mk2=isBdo?'bdo_video':'4x4_s2';
  var l1=isBdo?'QR':'S1',l2=isBdo?'Video':'S2';
  var sucs=cfg('tieneResumen')?getSucsF():[...new Set(ad().map(function(r){return r.sucursal;}).filter(isV))].filter(function(s){
    var ahs=new Set();for(var i=0;i<cortes.length;i++)Object.keys(cortes[i].sucursales||{}).forEach(function(k){if(isV(k))ahs.add(k);});return ahs.has(s);}).sort();
  var first=cortes[0],last=cortes[cortes.length-1];
  function acF(c,k){return avg(sucs.map(function(s){var sd=c.sucursales[s];return sd&&sd[k]!=null?sd[k]:0;}));}
  var v1i=acF(first,mk1),v1f=acF(last,mk1),v2i=acF(first,mk2),v2f=acF(last,mk2),d1=v1f-v1i,d2=v2f-v2i;
  var bs='—',bv=0,ts='—',td=-999;
  for(var si=0;si<sucs.length;si++){var s=sucs[si],sdN=last.sucursales[s],vN=sdN&&sdN[mk1]!=null?sdN[mk1]:0;
    if(vN>bv){bv=vN;bs=s;}var sd0=first.sucursales[s],dl=vN-(sd0&&sd0[mk1]!=null?sd0[mk1]:0);if(dl>td){td=dl;ts=s;}}
  var mej=0;for(var si=0;si<sucs.length;si++){var s2=sucs[si],sd0b=first.sucursales[s2],sdNb=last.sucursales[s2];
    if((sdNb&&sdNb[mk1]!=null?sdNb[mk1]:0)>(sd0b&&sd0b[mk1]!=null?sd0b[mk1]:0))mej++;}
  var pm=sucs.length?Math.round(mej/sucs.length*100):0;
  function db(d){return d>0?'pos':d<0?'neg':'neu';}function ds(d){return d>0?'+':'';}function ar(d){return d>0?'↑':d<0?'↓':'→';}
  var fi=first.fecha.split('-').reverse().join('/'),ff=last.fecha.split('-').reverse().join('/');
  var summary='<div class="hist-summary">'
    +'<div class="hist-stat"><div class="hs-lbl">'+l1+' — Período</div><div class="hs-main"><span class="hs-arrow '+svc(v1f)+'">'+ar(d1)+'</span><span class="hs-val '+svc(v1f)+'">'+v1f+'%</span><span class="hs-delta '+db(d1)+'">'+ds(d1)+d1+' pts</span></div><div class="hs-sub">Inicio <strong>'+v1i+'%</strong> → Hoy <strong>'+v1f+'%</strong></div><div class="hs-period">'+fi+' → '+ff+'</div></div>'
    +'<div class="hist-stat"><div class="hs-lbl">'+l2+' — Período</div><div class="hs-main"><span class="hs-arrow '+svc(v2f)+'">'+ar(d2)+'</span><span class="hs-val '+svc(v2f)+'">'+v2f+'%</span><span class="hs-delta '+db(d2)+'">'+ds(d2)+d2+' pts</span></div><div class="hs-sub">Inicio <strong>'+v2i+'%</strong> → Hoy <strong>'+v2f+'%</strong></div><div class="hs-period">'+fi+' → '+ff+'</div></div>'
    +'<div class="hist-stat"><div class="hs-lbl">🏆 Mejor Sucursal</div><div class="hs-main"><span class="hs-val '+svc(bv)+'">'+bv+'%</span></div><div class="hs-sub"><strong>'+bs+'</strong></div><div class="hs-period">En '+l1+' — último corte</div></div>'
    +'<div class="hist-stat"><div class="hs-lbl">📈 Mayor Avance</div><div class="hs-main"><span class="hs-val '+(td>0?'cg':td<0?'cb':'c0')+'">'+(td>0?'+':'')+td+' pts</span></div><div class="hs-sub"><strong>'+ts+'</strong></div><div class="hs-period">'+pm+'% mejoraron</div></div>'
    +'</div>';

  if (cfg('tieneResumen')) {
    var mmA=semMapActivo(),sems=Object.keys(mmA).map(Number).sort(function(a,b){return a-b;});
    if(!sems.length){document.getElementById('tab_historico').innerHTML=summary+'<p style="color:var(--muted);padding:14px">Selecciona un mes con datos.</p>';return;}
    var actHead=isBdo?'<th class="sfix" style="background:#dcfce7;color:var(--good)">QR Actual</th><th style="background:#dcfce7;color:var(--good)">Video Actual</th>'
                    :'<th style="background:#dcfce7;color:var(--good)">Sesión Actual</th>';
    function actColSuc(suc){var sd=last.sucursales[suc];
      if(isBdo){var qr=sd&&sd.bdo_qr!=null?sd.bdo_qr:0,vid=sd&&sd.bdo_video!=null?sd.bdo_video:0;
        return'<td><span class="pill '+sc(qr)+'">'+qr+'%</span></td><td><span class="pill '+sc(vid)+'">'+vid+'%</span></td>';}
      var ks=sd?Object.keys(sd).filter(function(k){return k.indexOf('4x4_s')===0;}):[];
      var vals=ks.map(function(k){return sd[k]||0;}).filter(function(v){return v>0;});
      var va=vals.length?Math.round(vals.reduce(function(a,b){return a+b;},0)/vals.length):0;
      return'<td><span class="pill '+sc(va)+'">'+va+'%</span></td>';}
    function thH(){var h='';for(var i=0;i<sems.length;i++)h+='<th class="th-sem sem-sep" colspan="2">S'+sems[i]+'</th>';return h;}
    function thSH(){var h='';for(var i=0;i<sems.length;i++)h+='<th class="th-sub sem-sep">Prom.'+l1+'</th><th class="th-sub">Prom.'+l2+'</th>';return h;}
    function sCells(suc){var h='';
      for(var i=0;i<sems.length;i++){var cv=mmA[sems[i]];
        var v1s=cv.map(function(c){var sd=c.sucursales[suc];return sd&&sd[mk1]!=null?sd[mk1]:null;}).filter(function(v){return v!==null;});
        var v2s=cv.map(function(c){var sd=c.sucursales[suc];return sd&&sd[mk2]!=null?sd[mk2]:null;}).filter(function(v){return v!==null;});
        var p1=v1s.length?Math.round(v1s.reduce(function(a,b){return a+b;},0)/v1s.length):0;
        var p2=v2s.length?Math.round(v2s.reduce(function(a,b){return a+b;},0)/v2s.length):0;
        h+='<td class="sem-sep"><span class="pill '+sc(p1)+'">'+p1+'%</span></td><td><span class="pill '+sc(p2)+'">'+p2+'%</span></td>';}return h;}
    var tbody2='';for(var si=0;si<sucs.length;si++){var s=sucs[si];tbody2+='<tr><td class="sfix">'+s+'</td>'+sCells(s)+actColSuc(s)+'</tr>';}
    document.getElementById('tab_historico').innerHTML=summary
      +'<div class="hist-scroll"><table class="hist-table" style="width:auto"><thead>'
      +'<tr><th class="sfix" rowspan="2">Sucursal</th>'+thH()+actHead+'</tr>'
      +'<tr>'+thSH()+'</tr></thead><tbody>'+tbody2+'</tbody></table></div>';
  } else {
    var mesesD=[...new Set(cortes.map(function(c){return c.mesKey||c.fecha.substring(0,7);}))].sort();
    var mesBar='<div class="mes-bar"><label>📅 Período</label>'
      +'<select class="mes-select" id="mesSel" onchange="mesSelCambio(this.value)">'
      +'<option value="todos">Todos los cortes</option>'
      +mesesD.map(function(mk){return'<option value="'+mk+'">'+mk+'</option>';}).join('')
      +'</select><span class="mes-hint">'+cortes.length+' corte(s) total</span></div>';
    var cv=cortes;
    var thD=cv.map(function(c){return'<th colspan="2" style="text-align:center">'+c.fecha.split('-').reverse().join('/')+'</th>';}).join('');
    var thS=cv.map(function(){return'<th>'+l1+'</th><th>'+l2+'</th>';}).join('');
    var tbody3='';for(var si=0;si<sucs.length;si++){var s3=sucs[si];
      var cells3=cv.map(function(c){var sd=c.sucursales[s3];var v1=sd&&sd[mk1]!=null?sd[mk1]:0,v2b=sd&&sd[mk2]!=null?sd[mk2]:0;
        return'<td><span class="pill '+sc(v1)+'">'+v1+'%</span></td><td><span class="pill '+sc(v2b)+'">'+v2b+'%</span></td>';}).join('');
      tbody3+='<tr><td class="sfix">'+s3+'</td>'+cells3+'</tr>';}
    document.getElementById('tab_historico').innerHTML=summary+mesBar
      +'<div class="hist-scroll"><table class="hist-table" style="width:auto"><thead>'
      +'<tr><th class="sfix" rowspan="2">Sucursal</th>'+thD+'</tr>'
      +'<tr>'+thS+'</tr></thead><tbody>'+tbody3+'</tbody></table></div>';
  }
}
function mesSelCambio(v){
  var cortes=(DATA.historico&&DATA.historico.cortes)||[];
  var cv=v==='todos'?cortes:cortes.filter(function(c){return(c.mesKey||c.fecha.substring(0,7))===v;});
  var isBdo=state.prog==='bdo',mk1=isBdo?'bdo_qr':'4x4_s1',mk2=isBdo?'bdo_video':'4x4_s2';
  var l1=isBdo?'QR':'S1',l2=isBdo?'Video':'S2';
  var sucs=getSucsF();
  var thD=cv.map(function(c){return'<th colspan="2" style="text-align:center">'+c.fecha.split('-').reverse().join('/')+'</th>';}).join('');
  var thS=cv.map(function(){return'<th>'+l1+'</th><th>'+l2+'</th>';}).join('');
  var tbody='';for(var si=0;si<sucs.length;si++){var s=sucs[si];
    var cells=cv.map(function(c){var sd=c.sucursales[s];var v1=sd&&sd[mk1]!=null?sd[mk1]:0,v2=sd&&sd[mk2]!=null?sd[mk2]:0;
      return'<td><span class="pill '+sc(v1)+'">'+v1+'%</span></td><td><span class="pill '+sc(v2)+'">'+v2+'%</span></td>';}).join('');
    tbody+='<tr><td class="sfix">'+s+'</td>'+cells+'</tr>';}
  var tbl=document.querySelector('.hist-table');
  if(tbl){tbl.querySelector('thead').innerHTML='<tr><th class="sfix" rowspan="2">Sucursal</th>'+thD+'</tr><tr>'+thS+'</tr>';
    tbl.querySelector('tbody').innerHTML=tbody;}
}

/* ── Control general ── */
function render() {
  var t = document.querySelector('.tab.active'); var tn = t ? t.dataset.tab : 'detalle';
  document.getElementById('kpisRow').style.display = tn==='detalle' ? 'grid' : 'none';
  document.getElementById('filtersSection').style.display = tn==='resumen' ? 'none' : 'block';
  if (tn==='detalle')       { renderKPIs(); renderDetalle(); }
  else if (tn==='resumen')  renderResumen();
  else if (tn==='historico') renderHistorico();
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
  document.getElementById('kpisRow').style.display = t==='detalle' ? 'grid' : 'none';
  document.getElementById('filtersSection').style.display = t==='resumen' ? 'none' : 'block';
  ['detalle','resumen','historico'].forEach(function(x){
    var el=document.getElementById('tab_'+x);if(el)el.style.display=x===t?'block':'none';});
  document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active');delete b.dataset.tab;});
  btn.classList.add('active');btn.dataset.tab=t;render();
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
  var mesFilt = document.getElementById('mesFiltArea');

  if (elCanal) elCanal.style.display = tieneCanal ? '' : 'none';
  if (elReg)   elReg.style.display   = tieneRegion ? '' : 'none';
  if (elZon)   elZon.style.display   = tieneZona   ? '' : 'none';
  if (tabRes)  tabRes.style.display  = tieneResumen ? '' : 'none';
  if (mesFilt) mesFilt.style.display = tieneResumen ? '' : 'none';

  // Ocultar toggle BDO/4x4 si solo_4x4
  var togArea = document.getElementById('togArea');
  if (togArea) togArea.innerHTML = '';

  buildTog();
  buildMesFilter();
  popSels();
  render();
}
