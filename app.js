// ============================================================================
// MSP Pump Selector — app logic
// ============================================================================

const STORE_KEY_TENDER = 'msp_tender_lines_v1';
const STORE_KEY_SELECTOR = 'msp_selector_state_v2';

const MATERIALS = ['Cast Iron', 'Noryl', 'Stainless Steel'];
const SIZES = [ ['4only','4" only'], ['6plus','6"+'], ['any','Any'] ];
const FREQS = ['50Hz','60Hz'];

function prettyTag(tag){
  if (!tag || tag === 'OUT OF RANGE' || tag === 'NONE' || tag === '-') return tag;
  const m = tag.match(/^([A-Z]+)(\d+)$/);
  return m ? `${m[1]} ${m[2]}` : tag;
}
function fmt(n, d=1){
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toFixed(d).replace(/\.0$/, '');
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove('show'), 1600);
}

// ---------------------------------------------------------------------------
// Core compute: mirrors INPUT!C17..C32 / TENDER!G..P exactly, via engine.js
// ---------------------------------------------------------------------------
function computeDuty(material, sizeClass, frequency, Q, H, safetyPct){
  const designHead = H * (1 + (safetyPct||0)/100);
  const primaryTag = selectSeries(material, sizeClass, frequency, Q);
  let primary = null, alt = null, altTag = '-';

  if (primaryTag !== 'OUT OF RANGE'){
    const sd = PUMP_DATA[primaryTag];
    const best = sd ? findBestModel(sd, Q, designHead) : null;
    primary = {
      tag: primaryTag,
      model: best ? best.model : null,
      achievedHead: best ? best.achievedHead : null,
      stages: best ? computeStages(best.model.name) : null,
      maxStages: sd ? sd.models.length : null,
    };
    altTag = altSeries(material, frequency, primaryTag);
    if (altTag && altTag !== '-' && altTag !== 'NONE'){
      const asd = PUMP_DATA[altTag];
      const abest = asd ? findBestModel(asd, Q, designHead) : null;
      alt = { tag: altTag, model: abest ? abest.model : null, achievedHead: abest ? abest.achievedHead : null };
    }
  }
  return { designHead, primaryTag, primary, altTag, alt, Q, H, safetyPct, material, sizeClass, frequency };
}

// ---------------------------------------------------------------------------
// Selector screen state
// ---------------------------------------------------------------------------
let selState = loadSelectorState();
function loadSelectorState(){
  try{
    const raw = localStorage.getItem(STORE_KEY_SELECTOR);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  // Start completely empty — nothing preselected, no result shown until the
  // user has entered a full duty point.
  return { material:null, sizeClass:null, frequency:null, Q:'', H:'', safety:'' };
}

// A duty point is only computable once material, bore, frequency, Q and H are all set.
function selectorReady(s){
  return !!s.material && !!s.sizeClass && !!s.frequency
      && s.Q !== '' && s.Q !== null && Number(s.Q) > 0
      && s.H !== '' && s.H !== null && Number(s.H) > 0;
}
function saveSelectorState(){
  localStorage.setItem(STORE_KEY_SELECTOR, JSON.stringify(selState));
}

// ---------------------------------------------------------------------------
// Tender screen state
// ---------------------------------------------------------------------------
let tenderLines = loadTenderLines();
let openLineId = null;
function loadTenderLines(){
  try{
    const raw = localStorage.getItem(STORE_KEY_TENDER);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveTenderLines(){
  localStorage.setItem(STORE_KEY_TENDER, JSON.stringify(tenderLines));
}
function newLine(){
  return { id: Date.now()+Math.random().toString(16).slice(2), material:'Stainless Steel',
           sizeClass:'6plus', frequency:'50Hz', Q:'', H:'', tag:'' };
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
let currentTab = 'selector';
function switchTab(tab){
  currentTab = tab;
  document.getElementById('tabSelector').classList.toggle('active', tab==='selector');
  document.getElementById('tabTender').classList.toggle('active', tab==='tender');
  document.getElementById('topSub').textContent = tab==='selector' ? 'Selector' : 'Tender';
  render();
}

function render(){
  const main = document.getElementById('main');
  if (currentTab === 'selector'){
    document.getElementById('freqPill').textContent = selState.frequency || '';
    document.getElementById('freqPill').style.display = selState.frequency ? '' : 'none';
    main.innerHTML = renderSelectorHTML();
    wireSelectorEvents();
  } else {
    document.getElementById('freqPill').style.display = 'none';
    main.innerHTML = renderTenderHTML();
    wireTenderEvents();
  }
}

// ---------------------------------------------------------------------------
// Selector rendering
// ---------------------------------------------------------------------------
function renderSelectorHTML(){
  const ready = selectorReady(selState);
  const r = ready
    ? computeDuty(selState.material, selState.sizeClass, selState.frequency, Number(selState.Q)||0, Number(selState.H)||0, Number(selState.safety)||0)
    : null;

  const materialButtons = MATERIALS.map(m =>
    `<button data-material="${m}" class="${selState.material===m?'active':''}">${m}</button>`).join('');
  const sizeButtons = SIZES.map(([val,label]) =>
    `<button data-size="${val}" class="${selState.sizeClass===val?'active':''}">${label}</button>`).join('');
  const freqButtons = FREQS.map(f =>
    `<button data-freq="${f}" class="${selState.frequency===f?'active':''}">${f}</button>`).join('');

  let plateHTML;
  if (!ready){
    const missing = [];
    if (!selState.material)  missing.push('material');
    if (!selState.sizeClass) missing.push('borehole size');
    if (!selState.frequency) missing.push('frequency');
    if (!(Number(selState.Q) > 0)) missing.push('flow Q');
    if (!(Number(selState.H) > 0)) missing.push('head H');
    plateHTML = `
      <div class="plate empty">
        <div class="plate-label">Selected model</div>
        <div class="model">—</div>
        <div class="status">Choose ${missing.join(', ')} to see a selection</div>
      </div>`;
  } else if (r.primaryTag === 'OUT OF RANGE'){
    plateHTML = `
      <div class="plate">
        <div class="plate-label">Selected series</div>
        <div class="model">Out of range</div>
        <div class="status warn">⚠ No series covers this duty point</div>
      </div>`;
  } else if (!r.primary.model){
    plateHTML = `
      <div class="plate">
        <div class="plate-label">Selected series · ${prettyTag(r.primaryTag)}</div>
        <div class="model">No match</div>
        <div class="status warn">⚠ No model in ${prettyTag(r.primaryTag)} reaches ${fmt(r.designHead)} m at Q=${fmt(r.Q,2)}</div>
      </div>`;
  } else {
    plateHTML = `
      <div class="plate">
        <div class="plate-label">Selected model</div>
        <div class="model">${r.primary.model.name}</div>
        <span class="series-tag">${prettyTag(r.primaryTag)} series</span>
        <div class="status ok">✓ ${r.primary.stages ?? '—'} stage${r.primary.stages===1?'':'s'} → ${fmt(r.primary.achievedHead)} m at Q=${fmt(r.Q,2)}</div>
        <div class="plate-grid">
          <div><div class="stat-label">Motor</div><div class="stat-value">${fmt(r.primary.model.kw,2)} kW</div></div>
          <div><div class="stat-label">HP</div><div class="stat-value">${fmt(r.primary.model.hp,2)}</div></div>
          <div><div class="stat-label">Length</div><div class="stat-value">${r.primary.model.len ? r.primary.model.len+' mm' : '—'}</div></div>
        </div>
      </div>`;
  }

  let altHTML = '';
  if (ready && r.primaryTag !== 'OUT OF RANGE' && r.altTag && r.altTag !== '-'){
    if (r.altTag === 'NONE'){
      altHTML = `<div class="altbox"><div class="alt-label">Alternative</div><div class="alt-model">None</div></div>`;
    } else {
      altHTML = `<div class="altbox">
        <div>
          <div class="alt-label">Alternative · ${prettyTag(r.altTag)}</div>
          <div class="alt-model">${r.alt && r.alt.model ? r.alt.model.name : 'No match'}</div>
        </div>
        <div class="alt-head">${r.alt && r.alt.achievedHead!=null ? fmt(r.alt.achievedHead)+' m' : ''}</div>
      </div>`;
    }
  }

  return `
    <div class="card">
      <h2>Duty point</h2>
      <div class="field">
        <label>Material</label>
        <div class="segmented" id="materialSeg">${materialButtons}</div>
      </div>
      <div class="field">
        <label>Borehole size</label>
        <div class="segmented" id="sizeSeg">${sizeButtons}</div>
      </div>
      <div class="field">
        <label>Frequency</label>
        <div class="segmented freq" id="freqSeg">${freqButtons}</div>
      </div>
      <div class="field row2">
        <div>
          <label>Flow Q</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputQ" value="${selState.Q}"><span class="unit">m³/h</span></div>
        </div>
        <div>
          <label>Head H</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputH" value="${selState.H}"><span class="unit">m</span></div>
        </div>
      </div>
      <div class="field">
        <label>Safety margin</label>
        <div class="numfield" style="max-width:140px"><input type="number" inputmode="decimal" id="inputSafety" value="${selState.safety}"><span class="unit">%</span></div>
      </div>
      ${ready ? `<div class="hint">Design head ${fmt(r.designHead)} m · ${fmt(Number(selState.Q)/3.6,2)} L/s${r.primaryTag!=='OUT OF RANGE' && r.primary && r.primary.maxStages ? ' · '+r.primary.maxStages+' models in '+prettyTag(r.primaryTag) : ''}</div>` : ''}
    </div>

    ${plateHTML}
    ${altHTML}
  `;
}

function wireSelectorEvents(){
  document.getElementById('materialSeg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selState.material = b.dataset.material; saveSelectorState(); render();
  });
  document.getElementById('sizeSeg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selState.sizeClass = b.dataset.size; saveSelectorState(); render();
  });
  document.getElementById('freqSeg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selState.frequency = b.dataset.freq; saveSelectorState(); render();
  });
  const qEl = document.getElementById('inputQ');
  const hEl = document.getElementById('inputH');
  const sEl = document.getElementById('inputSafety');
  [ [qEl,'Q'], [hEl,'H'], [sEl,'safety'] ].forEach(([el,key])=>{
    el.addEventListener('input', ()=>{ selState[key] = el.value; saveSelectorState(); renderInPlaceSelector(); });
  });
}

// Re-render only the computed parts, but keep focus in the active text input.
function renderInPlaceSelector(){
  const active = document.activeElement;
  const activeId = active && active.id;
  const selStart = active && active.selectionStart;
  document.getElementById('main').innerHTML = renderSelectorHTML();
  wireSelectorEvents();
  if (activeId){
    const el = document.getElementById(activeId);
    if (el){ el.focus(); try{ el.setSelectionRange(selStart, selStart); }catch(e){} }
  }
  document.getElementById('freqPill').textContent = selState.frequency || '';
  document.getElementById('freqPill').style.display = selState.frequency ? '' : 'none';
}

// ---------------------------------------------------------------------------
// Tender rendering
// ---------------------------------------------------------------------------
function renderTenderHTML(){
  if (tenderLines.length === 0){
    return `
      <div class="tender-header"><h2>Tender</h2><span class="tender-count">0 lines</span></div>
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>
        <p>No line items yet. Add your first pump below.</p>
      </div>
      <button class="btn btn-primary btn-block" onclick="addLine()">+ Add line item</button>
    `;
  }

  const lines = tenderLines.map((line, idx) => renderLineCard(line, idx)).join('');
  return `
    <div class="tender-header"><h2>Tender</h2><span class="tender-count">${tenderLines.length} line${tenderLines.length===1?'':'s'}</span></div>
    ${lines}
    <button class="btn btn-primary btn-block" onclick="addLine()">+ Add line item</button>
    <div style="height:4px"></div>
  `;
}

function renderLineCard(line, idx){
  const Q = Number(line.Q)||0, H = Number(line.H)||0;
  const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, 0);
  const isOpen = openLineId === line.id;

  let summaryModel = '—', summaryMeta = 'Enter Q and H';
  let stripHTML = '';
  if (Q > 0 && H > 0){
    if (r.primaryTag === 'OUT OF RANGE'){
      summaryModel = 'Out of range'; summaryMeta = `${line.material} · ${Q} m³/h @ ${H} m`;
      stripHTML = `<div class="result-strip"><span class="rmodel oor">OUT OF RANGE</span></div>`;
    } else if (!r.primary.model){
      summaryModel = 'No match'; summaryMeta = prettyTag(r.primaryTag);
      stripHTML = `<div class="result-strip"><span class="rmodel oor">No match in ${prettyTag(r.primaryTag)}</span></div>`;
    } else {
      summaryModel = r.primary.model.name;
      summaryMeta = `${fmt(r.primary.achievedHead)} m · ${fmt(r.primary.model.hp,2)} HP`;
      stripHTML = `
        <div class="result-strip">
          <span class="rmodel">${r.primary.model.name}</span>
          <span class="rmeta">${fmt(r.primary.achievedHead)} m · ${fmt(r.primary.model.kw,2)} kW · ${r.primary.model.len?r.primary.model.len+'mm':'—'}</span>
        </div>
        ${r.alt && r.alt.model ? `<div class="result-strip" style="margin-top:6px;opacity:.75"><span class="rmeta">Alt ${prettyTag(r.altTag)}</span><span class="rmeta">${r.alt.model.name}</span></div>` : ''}
      `;
    }
  }

  const materialOpts = MATERIALS.map(m=>`<option value="${m}" ${line.material===m?'selected':''}>${m}</option>`).join('');
  const sizeOpts = SIZES.map(([v,l])=>`<option value="${v}" ${line.sizeClass===v?'selected':''}>${l}</option>`).join('');
  const freqOpts = FREQS.map(f=>`<option value="${f}" ${line.frequency===f?'selected':''}>${f}</option>`).join('');

  return `
  <div class="line-card ${isOpen?'open':''}" data-id="${line.id}">
    <div class="line-card-head" onclick="toggleLine('${line.id}')">
      <div class="line-num">${idx+1}</div>
      <div class="summary">
        <div class="m1">${summaryModel}</div>
        <div class="m2">${summaryMeta}</div>
      </div>
      <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    ${isOpen ? `
    <div class="line-card-body">
      <div class="field row3">
        <div><label>Material</label><select class="line-select" data-field="material">${materialOpts}</select></div>
        <div><label>Bore</label><select class="line-select" data-field="sizeClass">${sizeOpts}</select></div>
        <div><label>Freq</label><select class="line-select" data-field="frequency">${freqOpts}</select></div>
      </div>
      <div class="field row2">
        <div><label>Flow Q (m³/h)</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="Q" value="${line.Q}"></div></div>
        <div><label>Head H (m)</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="H" value="${line.H}"></div></div>
      </div>
      ${stripHTML}
      <div class="field" style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-ghost btn-sm" onclick="duplicateLine('${line.id}')">Duplicate</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteLine('${line.id}')">Delete</button>
      </div>
    </div>` : ''}
  </div>`;
}

function toggleLine(id){
  openLineId = (openLineId === id) ? null : id;
  render();
}
function addLine(){
  const l = newLine();
  tenderLines.push(l);
  openLineId = l.id;
  saveTenderLines();
  render();
  setTimeout(()=>{
    const card = document.querySelector(`.line-card[data-id="${l.id}"]`);
    if (card) card.scrollIntoView({behavior:'smooth', block:'center'});
  }, 30);
}
function duplicateLine(id){
  const line = tenderLines.find(l=>l.id===id);
  if (!line) return;
  const copy = {...line, id: Date.now()+Math.random().toString(16).slice(2)};
  const idx = tenderLines.findIndex(l=>l.id===id);
  tenderLines.splice(idx+1, 0, copy);
  saveTenderLines();
  toast('Line duplicated');
  render();
}
function deleteLine(id){
  tenderLines = tenderLines.filter(l=>l.id!==id);
  if (openLineId === id) openLineId = null;
  saveTenderLines();
  toast('Line removed');
  render();
}

function wireTenderEvents(){
  document.querySelectorAll('.line-select').forEach(sel=>{
    sel.addEventListener('click', e=>e.stopPropagation());
    sel.addEventListener('change', e=>{
      const card = e.target.closest('.line-card');
      const id = card.dataset.id;
      const line = tenderLines.find(l=>l.id===id);
      line[e.target.dataset.field] = e.target.value;
      saveTenderLines();
      render();
    });
  });
  document.querySelectorAll('.line-input').forEach(inp=>{
    inp.addEventListener('click', e=>e.stopPropagation());
    inp.addEventListener('input', e=>{
      const card = e.target.closest('.line-card');
      const id = card.dataset.id;
      const line = tenderLines.find(l=>l.id===id);
      line[e.target.dataset.field] = e.target.value;
      saveTenderLines();
      // live-update just the result strip + summary without losing focus
      const idx = tenderLines.findIndex(l=>l.id===id);
      const openBefore = openLineId;
      openLineId = id;
      const html = renderLineCard(line, idx);
      card.outerHTML = html;
      openLineId = openBefore;
      const el = document.querySelector(`.line-card[data-id="${id}"] input[data-field="${e.target.dataset.field}"]`);
      if (el){ el.focus(); const p = e.target.selectionStart; try{ el.setSelectionRange(p,p); }catch(err){} }
      wireTenderEvents();
    });
  });
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
render();

if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  });
}
