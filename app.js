/* Quote app.js
   - 입력폼: FIELD_DEFS 기반 자동 생성(추가/변경 쉬움)
   - 입력 UX: percent(0.00%), money(콤마), datalist(자동완성) 지원, readonly 보호
   - 자동계산: 재료+가공+운송(base) → 관리비/이윤 → 판매가
   - 운송비(요청 반영):
     (기본운송비) + (수작업하차 추가금) + (왕복/대기/경유/특별) = 총 운송금액
     * 상차비 제거
   - 하차지(shipDrop): 운송지역 기준 자동 목록/검색(자동완성)으로 입력 실수 최소화
*/

const APP_VERSION = "Quote-0.1.4";

//
// 1) Field definitions
// group: basic | paper | material | print | coating | shipping | admin
// type: text | mm | int | money | percent | select | select+custom | datalist | readonly-text | readonly-money
//
const FIELD_DEFS = [
  // BASIC
  { group:'basic', key:'companyName', label:'업체명', type:'text', placeholder:'예) ○○상사' },
  { group:'basic', key:'itemName', label:'품명', type:'text', placeholder:'예) 제주감귤10kg' },
  { group:'basic', key:'boxType', label:'박스형태', type:'select+custom',
    options:['박스형태선택','직접입력','A1형','A2형(겹날개)','A3형(상외날개)','A3형(하외날개)','맞뚜껑','트레이','슬리브','싸바리','패드','칸막이','각대'],
    placeholder:'박스형태선택', customLabel:'직접입력'
  },
  { group:'basic', key:'innerLength', label:'장(내측, mm)', type:'mm' },
  { group:'basic', key:'innerWidth', label:'폭(내측, mm)', type:'mm' },
  { group:'basic', key:'innerHeight', label:'고(내측, mm)', type:'mm' },
  { group:'basic', key:'qty', label:'박스수량', type:'int', default:1000 },
  { group:'basic', key:'dieSize', label:'칼사이즈', type:'text', placeholder:'예) 550×800' },

  // PAPER
  { group:'paper', key:'paperType', label:'용지', type:'select+custom',
    options:['용지선택','직접입력','SC 마닐라','IV 아이보리','RIV 로얄아이보리','CCP','스노우','편ART','양ART','알리킹','모조'],
    placeholder:'용지선택', customLabel:'직접입력'
  },
  { group:'paper', key:'gsm', label:'평량(gsm)', type:'int', default:240 },
  { group:'paper', key:'paperKgPrice', label:'용지가(KG단가)', type:'money', default:0 },
  { group:'paper', key:'paperSheetLen', label:'용지 장(mm)', type:'mm' },
  { group:'paper', key:'paperSheetWid', label:'용지 폭(mm)', type:'mm' },
  { group:'paper', key:'paperCuts', label:'용지 절수', type:'int', default:1 },
  { group:'paper', key:'paperDiscount', label:'용지 할인율(%)', type:'percent', default:0 },
  { group:'paper', key:'lossQty', label:'용지여유수량(장수)', type:'int', default:0 },
  { group:'paper', key:'lossRate1', label:'용지로스율', type:'readonly-text', readOnly:true },

  // MATERIAL
  { group:'material', key:'materialType', label:'원단지종', type:'text' },
  { group:'material', key:'corrugatedType', label:'골종류', type:'text' },
  { group:'material', key:'materialM2Price', label:'원단단가(1m²)', type:'money', default:0 },
  { group:'material', key:'materialLen', label:'원단 장(mm)', type:'mm' },
  { group:'material', key:'materialWid', label:'원단 지폭(mm)', type:'mm' },
  { group:'material', key:'materialCutSpec', label:'원단 재단규격', type:'text', placeholder:'예) 0x0' },
  { group:'material', key:'materialCuts', label:'원단 절수', type:'int', default:1 },
  { group:'material', key:'materialSpareQty', label:'원단여유수량(장수)', type:'int', default:0 },
  { group:'material', key:'lossRate2', label:'원단로스율', type:'readonly-text', readOnly:true },

  // PRINT
  { group:'print', key:'ctpPlates', label:'CTP(판수)', type:'int', default:0 },
  { group:'print', key:'ctpUnitPrice', label:'CTP단가', type:'money', default:0 },
  { group:'print', key:'printColors', label:'인쇄적용도수', type:'int', default:0 },
  { group:'print', key:'printUnitPrice', label:'인쇄단가', type:'money', default:0 },
  { group:'print', key:'pressType', label:'인쇄기종류', type:'select', options:['대국전','하드롱','특하드롱'], default:'대국전' },

  // COATING / POST-PROCESS (코팅/후가공)
  { group:'coating', key:'machineCoating', label:'기계코팅', type:'money', default:0 },
  { group:'coating', key:'silkPrinting', label:'실크인쇄', type:'money', default:0 },
  { group:'coating', key:'emboss', label:'형압', type:'money', default:0 },
  { group:'coating', key:'foil', label:'금박', type:'money', default:0 },
  { group:'coating', key:'lamination', label:'합지', type:'money', default:0 },
  { group:'coating', key:'thomson', label:'톰슨', type:'money', default:0 },
  { group:'coating', key:'staple', label:'견철', type:'money', default:0 },
  { group:'coating', key:'paperPallet', label:'종이파렛트', type:'money', default:0 },
  { group:'coating', key:'plasticHandleCost', label:'플라스틱손잡이', type:'money', default:0 },

  // SHIPPING (운송)
  // 운송지역/하차지: datalist 자동완성(검색형)
  { group:'shipping', key:'shipRegion', label:'운송지역', type:'datalist', placeholder:'예) 서울 / 경기도 / 인천', optionsFn: getShipRegionOptions },
  { group:'shipping', key:'shipDrop', label:'하차지', type:'datalist', placeholder:'예) 강서, 양천, 강서구', optionsFn: getShipDropOptions },

  { group:'shipping', key:'shipTruck', label:'차종(톤수)', type:'select',
    options:['다마스','라보','1톤','1.4톤','2.5톤','3.5톤','3.5톤 광폭','5톤','5톤플','11톤'],
    default:'다마스'
  },

  { group:'shipping', key:'manualUnload', label:'수작업하차', type:'select', options:['아니오','예'], default:'아니오' },

  // 1) 기본운송비: 수동입력(0이면 자동 사용)
  { group:'shipping', key:'shipBaseInput', label:'기본운송비(수동입력)', type:'money', default:0 },
  { group:'shipping', key:'shipBaseAuto', label:'기본운송비(자동)', type:'readonly-money', readOnly:true },

  // 2) 수작업하차 추가금 (자동)
  { group:'shipping', key:'shipManualExtra', label:'수작업하차 추가금(자동)', type:'readonly-money', readOnly:true },

  // 3) 왕복/대기/경유/특별 (수기)
  { group:'shipping', key:'shipSpecialExtra', label:'왕복/대기/경유/특별', type:'money', default:0 },

  // 총 운송금액
  { group:'shipping', key:'shipTotal', label:'총 운송금액', type:'readonly-money', readOnly:true },

  // ADMIN (관리비/이윤)
  { group:'admin', key:'mgmtRatePct', label:'일반관리비(%)', type:'percent', default:7 },
  { group:'admin', key:'profitRatePct', label:'이윤(%)', type:'percent', default:0 },
];

// =====================
// 2) State & persistence
// =====================
const STORAGE_KEY = "quote_state_v1";

const state = {
  devItems: [],
};

function ensureDevItems(){
  if(!Array.isArray(state.devItems)) state.devItems = [];
}

// 기존 버전(state 키) 마이그레이션
function migrateState(){
  // v0.1.2: shipCostInput/shipCostAuto -> v0.1.3+ shipBaseInput/shipBaseAuto
  if(state.shipBaseInput == null && state.shipCostInput != null) state.shipBaseInput = state.shipCostInput;
  if(state.shipBaseAuto == null && state.shipCostAuto != null) state.shipBaseAuto = state.shipCostAuto;
}

function initState(){
  for(const f of FIELD_DEFS){
    const k = f.key;
    if(['lossRate1','lossRate2','shipBaseAuto','shipManualExtra','shipTotal'].includes(k)) continue;
    state[k] = (f.default !== undefined) ? f.default : '';
  }
  ensureDevItems();
  state.lossRate1 = 0;
  state.lossRate2 = 0;

  state.shipBaseAuto = 0;
  state.shipManualExtra = 0;
  state.shipTotal = 0;
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return false;
  try{
    const obj = JSON.parse(saved);
    Object.assign(state, obj);
    ensureDevItems();
    migrateState();
    return true;
  }catch(e){
    return false;
  }
}

// =====================
// 3) DOM helpers
// =====================
function el(tag, attrs={}, html=''){
  const e = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className = v;
    else if(k==='value') e.value = v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k,v);
  }
  if(html !== undefined) e.innerHTML = html;
  return e;
}
function q(sel){ return document.querySelector(sel); }
function qa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }

// =====================
// 4) Parsing/formatting (UX)
// =====================
function toNumLoose(v){
  if(v==null) return 0;
  const s = String(v).replace(/[, ]/g,'').trim();
  if(s==='') return 0;
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
function toIntLoose(v){
  const n = toNumLoose(v);
  return isFinite(n) ? Math.round(n) : 0;
}
function fmtMoney(v){
  const n = Math.round(Number(v)||0);
  return n.toLocaleString('ko-KR');
}
function fmtPercent2(v){
  const n = Number(v)||0;
  return (isFinite(n) ? n : 0).toFixed(2) + '%';
}
function parsePercentLoose(v){
  if(v==null) return 0;
  const s = String(v).replace(/[% ,]/g,'').trim();
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

// mm² → m²
function mm2ToM2(lenMm, widMm){
  const L = Number(lenMm)||0;
  const W = Number(widMm)||0;
  return (L>0 && W>0) ? (L*W)/1e6 : 0;
}

// =====================
// 5) Shipping index for datalist options
// =====================
let _shippingIndex = null;

function norm(s){ return String(s||'').trim(); }

function normalizeRegionName(r){
  const t = norm(r);
  if(!t) return '';
  if(t.includes('경기')) return '경기도';
  if(t === '경기') return '경기도';
  if(t.includes('서울')) return '서울';
  if(t.includes('인천')) return '인천';
  if(t.includes('강원')) return '강원도';
  if(t.includes('충남')) return '충남';
  if(t.includes('충북')) return '충북';
  if(t.includes('전남')) return '전남';
  if(t.includes('전북')) return '전북';
  if(t.includes('경남')) return '경남';
  if(t.includes('경북')) return '경북';
  return t;
}

function buildShippingIndex(){
  const tbl = (window.REF_SAMPLE || {})['운송비'];
  const idx = new Map(); // region -> Set(drop)

  if(!tbl || !Array.isArray(tbl.rows)) return idx;

  for(const row of tbl.rows){
    const region = norm(row[0]);
    const drop = norm(row[1]);
    if(!region || !drop) continue;
    if(!idx.has(region)) idx.set(region, new Set());
    idx.get(region).add(drop);
  }
  return idx;
}

function getShippingIndex(){
  if(_shippingIndex) return _shippingIndex;
  _shippingIndex = buildShippingIndex();
  return _shippingIndex;
}

// datalist options: regions
function getShipRegionOptions(){
  const idx = getShippingIndex();
  return Array.from(idx.keys()).sort((a,b)=>a.localeCompare(b,'ko-KR'));
}

// datalist options: drops by region
function getShipDropOptions(){
  const idx = getShippingIndex();
  const r = normalizeRegionName(state.shipRegion);
  if(!r || !idx.has(r)) return [];
  return Array.from(idx.get(r)).sort((a,b)=>a.localeCompare(b,'ko-KR'));
}

// =====================
// 6) Render inputs
// =====================
function getGroupHost(group){
  return q(`#group_${group}`);
}

function fieldMatchesFilter(f, needle){
  if(!needle) return true;
  const t = needle.toLowerCase();
  return (
    String(f.label||'').toLowerCase().includes(t) ||
    String(f.key||'').toLowerCase().includes(t) ||
    String(f.group||'').toLowerCase().includes(t)
  );
}

function renderInputs(){
  const filter = (q('#fieldFilter')?.value || '').trim();

  const groups = ['basic','paper','material','print','coating','shipping','admin'];
  for(const g of groups){
    const host = getGroupHost(g);
    if(host) host.innerHTML = '';
  }

  for(const f of FIELD_DEFS){
    if(!fieldMatchesFilter(f, filter)) continue;

    const host = getGroupHost(f.group);
    if(!host) continue;

    host.appendChild(el('div', {class:'lab'}, f.label));

    const inputCell = el('div', {class:'field'});
    inputCell.appendChild(renderFieldControl(f));
    host.appendChild(inputCell);
  }

  syncLossRateInputs();
  syncShippingReadonlyFields();
}

function renderFieldControl(f){
  if(f.type === 'select'){
    const s = el('select', {'data-key': f.key});
    for(const opt of (f.options||[])){
      s.appendChild(el('option', {value: opt}, opt));
    }
    const v = (state[f.key] ?? f.default ?? '');
    s.value = v;
    s.addEventListener('input', onFieldInput);
    return s;
  }

  if(f.type === 'select+custom'){
    const wrap = el('div', {style:'display:grid;grid-template-columns:1fr;gap:6px;'});
    const selKey = f.key + '__sel';

    const sel = el('select', {'data-key': selKey});
    for(const opt of (f.options||[])){
      sel.appendChild(el('option', {value: opt}, opt));
    }

    const inp = el('input', {type:'text', placeholder: f.placeholder || '', 'data-key': f.key});

    const placeholder = f.placeholder || (f.options ? f.options[0] : '');
    const customLabel = f.customLabel || '직접입력';
    const current = (state[f.key] ?? '').toString();

    if(!current){
      sel.value = placeholder;
      inp.value = '';
      inp.disabled = true;
    } else if((f.options||[]).includes(current) && current !== customLabel && current !== placeholder){
      sel.value = current;
      inp.value = current;
      inp.disabled = true;
    } else {
      sel.value = customLabel;
      inp.value = current;
      inp.disabled = false;
    }

    sel.addEventListener('change', ()=>{
      if(sel.value === placeholder){
        inp.value = '';
        inp.disabled = true;
        state[f.key] = '';
        recalc();
        return;
      }
      if(sel.value === customLabel){
        inp.disabled = false;
        inp.value = '';
        state[f.key] = '';
        inp.focus();
        recalc();
        return;
      }
      inp.disabled = true;
      inp.value = sel.value;
      state[f.key] = sel.value;
      recalc();
    });

    inp.addEventListener('input', ()=>{
      if(sel.value === customLabel){
        state[f.key] = inp.value;
        recalc();
      }
    });

    wrap.appendChild(sel);
    wrap.appendChild(inp);
    return wrap;
  }

  // datalist(자동완성)
  if(f.type === 'datalist'){
    const wrap = el('div', {style:'display:grid;grid-template-columns:1fr;gap:6px;'});
    const listId = `dl_${f.key}`;

    const input = el('input', {
      type:'text',
      'data-key': f.key,
      placeholder: f.placeholder || '',
      list: listId
    });
    input.value = (state[f.key] ?? '').toString();
    input.addEventListener('input', onFieldInput);

    const dl = el('datalist', {id: listId});
    const opts = (typeof f.optionsFn === 'function') ? (f.optionsFn(state) || []) : (f.options || []);
    for(const o of opts){
      dl.appendChild(el('option', {value: o}));
    }

    wrap.appendChild(input);
    wrap.appendChild(dl);
    return wrap;
  }

  if(f.type === 'readonly-money'){
    const i = el('input', {type:'text', readonly:'readonly', 'data-key': f.key});
    i.value = fmtMoney(state[f.key] ?? 0);
    return i;
  }

  if(f.type === 'readonly-text' || f.readOnly){
    const i = el('input', {type:'text', readonly:'readonly', 'data-key': f.key});
    i.value = (f.key === 'lossRate1') ? fmtPercent2(state.lossRate1||0)
           : (f.key === 'lossRate2') ? fmtPercent2(state.lossRate2||0)
           : String(state[f.key] ?? '');
    return i;
  }

  if(f.type === 'percent'){
    const i = el('input', {type:'text', 'data-key': f.key, inputmode:'decimal', placeholder:'0.00%'});
    const v = Number(state[f.key] ?? f.default ?? 0);
    i.value = fmtPercent2(v);

    i.addEventListener('focus', ()=>{
      const n = parsePercentLoose(i.value);
      i.value = (isFinite(n) ? n : 0).toFixed(2);
      try{ i.select(); }catch(_){}
    });
    i.addEventListener('input', ()=>{
      const n = parsePercentLoose(i.value);
      state[f.key] = isFinite(n) ? n : 0;
      recalc();
    });
    i.addEventListener('blur', ()=>{
      i.value = fmtPercent2(state[f.key] ?? 0);
    });
    return i;
  }

  if(f.type === 'money'){
    const i = el('input', {type:'text', 'data-key': f.key, inputmode:'numeric', placeholder:'0'});
    const v = Number(state[f.key] ?? f.default ?? 0);
    i.value = fmtMoney(v);

    i.addEventListener('focus', ()=>{
      const n = toNumLoose(i.value);
      i.value = String(Math.round(n));
      try{ i.select(); }catch(_){}
    });
    i.addEventListener('input', ()=>{
      state[f.key] = toNumLoose(i.value);
      recalc();
    });
    i.addEventListener('blur', ()=>{
      i.value = fmtMoney(state[f.key] ?? 0);
    });
    return i;
  }

  const i = el('input', {
    type: 'text',
    'data-key': f.key,
    inputmode: (f.type==='text' ? 'text' : 'numeric'),
    placeholder: f.placeholder || ''
  });

  const v = state[f.key];
  if(f.type === 'int' || f.type === 'mm'){
    i.value = (v===null || v===undefined || v==='') ? '' : String(Math.round(Number(v)));
  } else {
    i.value = (v ?? '').toString();
  }

  i.addEventListener('input', onFieldInput);
  i.addEventListener('blur', ()=>{
    if(f.type === 'int' || f.type === 'mm'){
      const n = toIntLoose(i.value);
      state[f.key] = n;
      i.value = (i.value.trim()==='' ? '' : String(n));
      recalc();
    }
  });

  return i;
}

function onFieldInput(e){
  const key = e.target.getAttribute('data-key');
  const f = FIELD_DEFS.find(x=>x.key===key);
  if(!f) return;

  // region 변경 시 drop 자동완성 목록이 바뀌므로 재렌더
  if(key === 'shipRegion'){
    state[key] = e.target.value;
    // 지역이 바뀌면 기존 하차지가 불일치할 수 있어 비워주는 옵션(원하면 주석 해제)
    // state.shipDrop = '';
    renderInputs();
    recalc();
    return;
  }

  if(f.type === 'text' || f.type === 'datalist'){
    state[key] = e.target.value;
  } else if(f.type === 'int' || f.type === 'mm'){
    state[key] = toNumLoose(e.target.value);
  } else {
    state[key] = e.target.value;
  }

  recalc();
}

// =====================
// 7) Dev items (좌측 섹션)
// =====================
function uid(){
  return 'd'+Math.random().toString(16).slice(2)+Date.now().toString(16);
}

function renderDevPanel(){
  ensureDevItems();
  const host = q('#devList');
  if(!host) return;
  host.innerHTML = '';

  state.devItems.forEach((it, idx)=>{
    const row = el('div', {style:'display:grid;grid-template-columns:1.2fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;'});
    const name = el('input', {type:'text', placeholder:'항목명 (예: 샘플비)', value: it.name||''});
    const amt  = el('input', {type:'text', inputmode:'numeric', placeholder:'금액(원)', value: fmtMoney(it.amount||0)});
    const del  = el('button', {class:'btn', type:'button'}, '삭제');

    name.addEventListener('input', ()=>{
      state.devItems[idx].name = name.value;
      recalc();
    });

    amt.addEventListener('focus', ()=>{
      amt.value = String(Math.round(toNumLoose(amt.value)));
      try{ amt.select(); }catch(_){}
    });
    amt.addEventListener('input', ()=>{
      state.devItems[idx].amount = toNumLoose(amt.value);
      recalc();
    });
    amt.addEventListener('blur', ()=>{
      amt.value = fmtMoney(state.devItems[idx].amount||0);
    });

    del.addEventListener('click', ()=>{
      state.devItems.splice(idx,1);
      recalc();
    });

    row.appendChild(name);
    row.appendChild(amt);
    row.appendChild(del);
    host.appendChild(row);
  });
}

// =====================
// 8) Shipping: table lookup + manual unload fee + total
// =====================

// REF 운송비 표 값 단위: 만원(4.5 => 45,000원)
function normalizeShippingTableValue(v){
  const n = Number(v);
  if(!isFinite(n) || n<=0) return 0;
  if(n >= 1000) return Math.round(n);
  return Math.round(n * 10000); // 만원 → 원
}

function normalizeTruckName(truck){
  const t = norm(truck);
  if(t === '3.5광폭') return '3.5톤 광폭';
  return t;
}

function findShippingRow(region, drop){
  const tbl = (window.REF_SAMPLE || {})['운송비'];
  if(!tbl || !Array.isArray(tbl.rows)) return null;

  const r = normalizeRegionName(region);
  const d = norm(drop);

  if(!r) return null;

  // 1) region exact + drop includes
  for(const row of tbl.rows){
    const rowRegion = norm(row[0]);
    const rowDrop = norm(row[1]);
    if(rowRegion === r && d && rowDrop && d.includes(rowDrop)) return row;
  }

  // 2) region exact only
  for(const row of tbl.rows){
    const rowRegion = norm(row[0]);
    if(rowRegion === r) return row;
  }

  return null;
}

function lookupBaseShippingAuto(){
  const tbl = (window.REF_SAMPLE || {})['운송비'];
  if(!tbl) return 0;

  const head = tbl.head || [];
  const truck = normalizeTruckName(state.shipTruck);
  const idx = head.indexOf(truck);
  if(idx < 0) return 0;

  const row = findShippingRow(state.shipRegion, state.shipDrop);
  if(!row) return 0;

  return normalizeShippingTableValue(row[idx]);
}

function manualUnloadExtraFee(truck){
  const t = normalizeTruckName(truck);

  // 요청 규칙:
  if(t === '다마스') return 0;
  if(t === '라보' || t === '1톤' || t === '1.4톤') return 20000;
  if(t === '2.5톤' || t === '3.5톤' || t === '3.5톤 광폭') return 40000;
  if(t === '5톤' || t === '5톤플') return 60000;
  if(t === '11톤') return 80000;
  return 0;
}

function calcShipping(){
  const baseAuto = lookupBaseShippingAuto();
  state.shipBaseAuto = baseAuto;

  const baseInput = Number(state.shipBaseInput)||0;
  const baseUsed = (baseInput > 0) ? baseInput : baseAuto;

  const manualExtra = (String(state.manualUnload||'') === '예')
    ? manualUnloadExtraFee(state.shipTruck)
    : 0;
  state.shipManualExtra = manualExtra;

  const specialExtra = Math.max(0, Number(state.shipSpecialExtra)||0);

  const total = baseUsed + manualExtra + specialExtra;
  state.shipTotal = total;

  return { baseAuto, baseUsed, manualExtra, specialExtra, total };
}

function syncShippingReadonlyFields(){
  const a = q("[data-key='shipBaseAuto']");
  if(a) a.value = fmtMoney(state.shipBaseAuto ?? 0);
  const b = q("[data-key='shipManualExtra']");
  if(b) b.value = fmtMoney(state.shipManualExtra ?? 0);
  const c = q("[data-key='shipTotal']");
  if(c) c.value = fmtMoney(state.shipTotal ?? 0);
}

// =====================
// 9) Quote engine
// =====================
function roundWon(x){ return Math.round(Number(x)||0); }

function addItem(items, it){
  const amt = Number(it.amount)||0;
  if(amt===0) return;
  items.push({ ...it, amount: amt });
}

function sumGroup(items, group){
  return items.filter(x=>x.group===group).reduce((a,b)=>a+(Number(b.amount)||0),0);
}

function safeCeil(x){ return Math.ceil(Number(x)||0); }

function calcLossRates(){
  const qty = Number(state.qty)||0;

  const pCuts = Number(state.paperCuts)||0;
  const pSpare = Math.max(0, Number(state.lossQty)||0);
  const pNeedSheets = (qty>0 && pCuts>0) ? (qty/pCuts) : 0;
  state.lossRate1 = (pNeedSheets>0) ? (pSpare/pNeedSheets)*100 : 0;

  const mCuts = Number(state.materialCuts)||0;
  const mSpare = Math.max(0, Number(state.materialSpareQty)||0);
  const mNeedSheets = (qty>0 && mCuts>0) ? (qty/mCuts) : 0;
  state.lossRate2 = (mNeedSheets>0) ? (mSpare/mNeedSheets)*100 : 0;

  if(!isFinite(state.lossRate1)) state.lossRate1 = 0;
  if(!isFinite(state.lossRate2)) state.lossRate2 = 0;
}

function syncLossRateInputs(){
  const a = q("[data-key='lossRate1']");
  if(a) a.value = fmtPercent2(state.lossRate1||0);
  const b = q("[data-key='lossRate2']");
  if(b) b.value = fmtPercent2(state.lossRate2||0);
}

function calcPaperCost(){
  const qty = Number(state.qty)||0;
  const cuts = Number(state.paperCuts)||0;
  const spareSheets = Math.max(0, Number(state.lossQty)||0);

  const areaM2 = mm2ToM2(state.paperSheetLen, state.paperSheetWid);
  const gsm = Number(state.gsm)||0;
  const kgPrice = Number(state.paperKgPrice)||0;

  const discountPct = Number(state.paperDiscount)||0;
  const discountRate = discountPct/100;

  const needSheets = (qty>0 && cuts>0) ? qty/cuts : 0;
  const totalSheets = safeCeil(needSheets + spareSheets);

  const kgPerSheet = areaM2 * gsm / 1000;
  const cost = totalSheets * kgPerSheet * kgPrice * (1 - discountRate);

  return isFinite(cost) ? cost : 0;
}

function calcMaterialCost(){
  const qty = Number(state.qty)||0;
  const cuts = Number(state.materialCuts)||0;
  const spareSheets = Math.max(0, Number(state.materialSpareQty)||0);

  const areaM2 = mm2ToM2(state.materialLen, state.materialWid);
  const m2Price = Number(state.materialM2Price)||0;

  const needSheets = (qty>0 && cuts>0) ? qty/cuts : 0;
  const totalSheets = safeCeil(needSheets + spareSheets);

  const cost = totalSheets * areaM2 * m2Price;
  return isFinite(cost) ? cost : 0;
}

function calculateQuote(){
  const items = [];
  ensureDevItems();

  // MATERIAL
  addItem(items, {group:'MATERIAL', name:'용지', amount: calcPaperCost(), sort:10, note:'(시트수×kg/시트×kg단가×(1-할인))'});
  addItem(items, {group:'MATERIAL', name:'원단', amount: calcMaterialCost(), sort:20, note:'(시트수×m²×m²단가)'});

  // PROCESSING
  addItem(items, {group:'PROCESSING', name:'CTP', amount:(Number(state.ctpPlates)||0)*(Number(state.ctpUnitPrice)||0), sort:110});
  addItem(items, {group:'PROCESSING', name:'인쇄', amount:(Number(state.printUnitPrice)||0), sort:115});

  addItem(items, {group:'PROCESSING', name:'기계코팅', amount:(Number(state.machineCoating)||0), sort:120});
  addItem(items, {group:'PROCESSING', name:'실크인쇄', amount:(Number(state.silkPrinting)||0), sort:125});
  addItem(items, {group:'PROCESSING', name:'형압', amount:(Number(state.emboss)||0), sort:130});
  addItem(items, {group:'PROCESSING', name:'금박', amount:(Number(state.foil)||0), sort:140});
  addItem(items, {group:'PROCESSING', name:'합지', amount:(Number(state.lamination)||0), sort:150});
  addItem(items, {group:'PROCESSING', name:'톰슨', amount:(Number(state.thomson)||0), sort:160});
  addItem(items, {group:'PROCESSING', name:'견철', amount:(Number(state.staple)||0), sort:170});
  addItem(items, {group:'PROCESSING', name:'종이파렛트', amount:(Number(state.paperPallet)||0), sort:175});
  addItem(items, {group:'PROCESSING', name:'손잡이', amount:(Number(state.plasticHandleCost)||0), sort:190});

  // SHIPPING (3단계)
  const ship = calcShipping();
  addItem(items, {group:'SHIPPING', name:'기본운송비', amount: ship.baseUsed, sort:310, note:'(수동입력 0이면 표 자동)'});
  addItem(items, {group:'SHIPPING', name:'수작업하차 추가금', amount: ship.manualExtra, sort:315});
  addItem(items, {group:'SHIPPING', name:'왕복/대기/경유/특별', amount: ship.specialExtra, sort:320});

  // DEV (base 제외)
  state.devItems.forEach((d, idx)=>{
    const nm = (d && d.name) ? String(d.name).trim() : '';
    const amt = d ? Number(d.amount)||0 : 0;
    addItem(items, {group:'DEV', name: nm || '개발비', amount: amt, sort:800+idx});
  });

  items.sort((a,b)=>(a.sort||0)-(b.sort||0));

  // base(DEV 제외)
  const base = sumGroup(items,'MATERIAL') + sumGroup(items,'PROCESSING') + sumGroup(items,'SHIPPING');

  const mgmtPct = Number(state.mgmtRatePct)||0;
  const profitPct = Number(state.profitRatePct)||0;
  const mgmtAmount = base * (mgmtPct/100);
  const profitAmount = base * (profitPct/100);
  const devSum = sumGroup(items,'DEV');

  if(mgmtAmount) items.push({group:'MGMT', name:`관리비(${fmtPercent2(mgmtPct)})`, amount: mgmtAmount, sort:900});
  if(profitAmount) items.push({group:'PROFIT', name:`이윤(${fmtPercent2(profitPct)})`, amount: profitAmount, sort:910});

  const sellTotal = base + mgmtAmount + profitAmount + devSum;

  return { items, totals:{ base, mgmtAmount, profitAmount, devSum, sellTotal } };
}

// =====================
// 10) Render calc grid & ratios
// =====================
function renderCalcGrid(){
  const tbody = q('#calcGrid tbody');
  if(!tbody) return;
  tbody.innerHTML = '';

  const res = calculateQuote();
  const items = res.items;
  const t = res.totals;

  {
    const tr = el('tr', {class:'sumrow'});
    tr.appendChild(el('td', {class:'emph'}, 'TOTAL'));
    tr.appendChild(el('td', {}, `<span class="ro">판매가(총합) = base + 관리비 + 이윤 + 개발비</span>`));
    tr.appendChild(el('td', {class:'num ro'}, fmtMoney(roundWon(t.sellTotal))));
    tbody.appendChild(tr);
  }

  const summary = [
    ['BASE', `base = 재료+가공+운송`, t.base],
    ['MGMT', `관리비 금액 (입력: ${fmtPercent2(Number(state.mgmtRatePct)||0)})`, t.mgmtAmount],
    ['PROFIT', `이윤 금액 (입력: ${fmtPercent2(Number(state.profitRatePct)||0)})`, t.profitAmount],
    ['DEV', `개발비 합계 (base 제외)`, t.devSum],
  ];

  for(const [k, desc, v] of summary){
    const tr = el('tr');
    tr.appendChild(el('td', {class:'emph'}, k));
    tr.appendChild(el('td', {}, `<span class="ro">${desc}</span>`));
    tr.appendChild(el('td', {class:'num ro'}, fmtMoney(roundWon(v))));
    tbody.appendChild(tr);
  }

  items
    .slice()
    .sort((a,b)=>(a.sort||0)-(b.sort||0))
    .forEach(it=>{
      const tr = el('tr');
      tr.appendChild(el('td', {class:'emph'}, it.group));
      const note = it.note ? ` <span class="ro" style="opacity:.7"> ${it.note}</span>` : '';
      tr.appendChild(el('td', {}, `<span class="ro">${it.name}</span>${note}`));
      tr.appendChild(el('td', {class:'num ro'}, fmtMoney(roundWon(it.amount))));
      tbody.appendChild(tr);
    });
}

function renderRatios(){
  const res = calculateQuote();
  const items = res.items;
  const total = Number(res.totals.sellTotal)||0;

  const host = q('#ratioList');
  if(!host) return;
  host.innerHTML = '';

  let sum = 0;
  for(const it of items){
    const amt = Number(it.amount)||0;
    if(amt===0) continue;
    const pct = total>0 ? (amt/total)*100 : 0;
    sum += pct;

    const row = el('div', {class:'row'});
    const left = el('div', {}, `
      <div class="k">${it.name}</div>
      <div class="bar"><i style="width:${Math.min(100,pct).toFixed(1)}%"></i></div>
    `);
    const right = el('div', {class:'v'}, `${pct.toFixed(2)}%`);
    row.appendChild(left);
    row.appendChild(right);
    host.appendChild(row);
  }

  const sumEl = q('#ratioSum');
  if(sumEl) sumEl.textContent = `합계: ${sum.toFixed(2)}%`;
}

// =====================
// 11) Reference tabs (basic)
// =====================
function renderTabs(){
  const bar = q('#tabbar');
  if(!bar) return;
  bar.innerHTML = '';

  const sheets = window.REF_SHEETS || [];
  sheets.forEach((s, i)=>{
    const b = el('button', {
      class: 'tab' + (i===0 ? ' active' : ''),
      type:'button',
      'data-key': s.key,
      onclick: ()=>activateTab(s.key)
    }, s.title);
    bar.appendChild(b);
  });

  if(sheets[0]) activateTab(sheets[0].key);
}

function activateTab(key){
  qa('.tab').forEach(t=>{
    t.classList.toggle('active', t.getAttribute('data-key')===key);
  });

  const tbl = (window.REF_SAMPLE || {})[key];
  const head = q('#refHead');
  const body = q('#refBody');
  if(!head || !body) return;
  head.innerHTML = '';
  body.innerHTML = '';
  if(!tbl) return;

  (tbl.head||[]).forEach(h=> head.appendChild(el('th', {}, h)));
  (tbl.rows||[]).forEach(r=>{
    const tr = el('tr');
    r.forEach(v=>{
      const isNum = typeof v === 'number';
      tr.appendChild(el('td', {class: (isNum ? 'num ro' : 'ro')}, (v==null?'':String(v))));
    });
    body.appendChild(tr);
  });
}

// =====================
// 12) Misc UI actions
// =====================
function updateCompanyPrint(){
  const host = q('#companyPrint');
  if(!host) return;
  const name = String(state.companyName||'').trim();
  if(name){
    host.textContent = '업체명: ' + name;
    host.style.display = 'block';
  }else{
    host.textContent = '';
    host.style.display = 'none';
  }
}

function recalc(){
  calcLossRates();
  syncLossRateInputs();

  calcShipping();
  syncShippingReadonlyFields();

  updateCompanyPrint();
  renderDevPanel();
  renderCalcGrid();
  renderRatios();
}

function wireUI(){
  document.addEventListener('click', (e)=>{
    const shd = e.target.closest('.section .shd');
    if(!shd) return;
    const sec = shd.closest('.section');
    const sbd = sec.querySelector('.sbd');
    const open = sec.getAttribute('data-open') === '1';
    sec.setAttribute('data-open', open ? '0' : '1');
    sbd.style.display = open ? 'none' : 'block';
  });

  q('#btnReset')?.addEventListener('click', ()=>{
    initState();
    state.devItems = [];
    renderInputs();
    recalc();
  });

  q('#btnSave')?.addEventListener('click', ()=>{
    saveState();
    alert('임시저장 완료(로컬)');
  });

  q('#btnLoad')?.addEventListener('click', ()=>{
    const ok = loadState();
    if(ok){
      renderInputs();
      recalc();
      alert('불러오기 완료(로컬)');
    }else{
      alert('저장된 데이터가 없습니다.');
    }
  });

  q('#btnExport')?.addEventListener('click', ()=>window.print());

  q('#btnDevAdd')?.addEventListener('click', ()=>{
    ensureDevItems();
    state.devItems.push({ id: uid(), name:'', amount:0 });
    recalc();
  });

  q('#btnDevClear')?.addEventListener('click', ()=>{
    ensureDevItems();
    state.devItems = [];
    recalc();
  });

  q('#fieldFilter')?.addEventListener('input', ()=>{
    renderInputs();
  });
  q('#btnClearFilter')?.addEventListener('click', ()=>{
    const f = q('#fieldFilter');
    if(f){ f.value=''; renderInputs(); }
  });
}

// =====================
// 13) Boot
// =====================
(function boot(){
  initState();
  loadState();
  wireUI();
  renderInputs();
  renderTabs();
  recalc();
})();
