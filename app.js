/* Quote/app.js (clean & complete) */
const APP_VERSION = "Quote-V3.0";
const STORAGE_KEY = "quote_state_v1";
window.APP_VERSION = APP_VERSION;
window.STORAGE_KEY = STORAGE_KEY;
const SAFE_MODE = new URLSearchParams(location.search).has('safe');
// ===== BOOT FUSE / DIAG (must be near top) =====
(function BOOT_FUSE_DIAG_V1(){
  const qs = new URLSearchParams(location.search);
  const DIAG = qs.has('diag') || SAFE_MODE;   // safe면 자동 diag
  const HALT = qs.has('halt');                // ?halt=1 이면 강제 중단(제어권 회복용)

  function paint(msg){
    try {
      const id = '__quote_diag__';
      const el = document.getElementById(id) || (() => {
        const d = document.createElement('div');
        d.id = id;
        d.style.cssText =
          'position:fixed;z-index:2147483647;left:8px;top:8px;right:8px;' +
          'background:#111;color:#0f0;padding:8px;font:12px/1.4 monospace;' +
          'border:1px solid #0f0;white-space:pre-wrap;pointer-events:none;opacity:.95';
        (document.body || document.documentElement).appendChild(d);
        return d;
      })();
      el.textContent = msg;
    } catch (_) {}
  }

  if (DIAG) {
    paint(`[${APP_VERSION}] DIAG on\nSAFE_MODE=${SAFE_MODE}\nurl=${location.href}\nstep=top`);
    // 1초 뒤에도 UI가 살아있으면 최소한 이벤트 루프는 돌고 있다는 뜻
    setTimeout(() => paint(`[${APP_VERSION}] DIAG on\nSAFE_MODE=${SAFE_MODE}\nstep=top+1s (event loop ok)`), 1000);
  }

  if (HALT || (SAFE_MODE && qs.has('haltSafe'))) {
    // ?halt=1 또는 ?safe=1&haltSafe=1 로 완전 중단(무한루프 탈출용)
    if (DIAG) paint(`[${APP_VERSION}] HALTED by query\n(no boot executed)`);
    throw new Error('Quote boot halted by BOOT_FUSE_DIAG_V1');
  }

  // safe 모드에서 "무거운 자동부팅"을 막기 위한 플래그
  if (SAFE_MODE) window.__QUOTE_SAFE_NOAUTOBOOT__ = true;
})();

/** =========================
 * My profile (author) - localStorage (1회 입력)
 * ========================= */
const USER_PROFILE_KEY = "quote_user_profile_v1";

function getMyProfile(){
  try{
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if(!raw) return { dept:'', jobTitle:'', name:'' };
    const p = JSON.parse(raw) || {};
    return {
      dept: String(p.dept || '').trim(),
      jobTitle: String(p.jobTitle || '').trim(),
      name: String(p.name || '').trim(),
    };
  }catch(_){
    return { dept:'', jobTitle:'', name:'' };
  }
}

function saveMyProfile(p){
  const obj = {
    dept: String(p?.dept || '').trim(),
    jobTitle: String(p?.jobTitle || '').trim(),
    name: String(p?.name || '').trim(),
  };
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(obj));
}

function ensureMyProfileOnce(){
  const p = getMyProfile();
  if(p.dept && p.jobTitle && p.name) return;

  const dept = prompt('내 소속(작성자)을 입력하세요', p.dept || '') ?? '';
  const jobTitle = prompt('내 직책(작성자)을 입력하세요', p.jobTitle || '') ?? '';
  const name = prompt('내 이름(작성자)을 입력하세요', p.name || '') ?? '';

  saveMyProfile({ dept, jobTitle, name });
}

function editMyProfile(){
  const p = getMyProfile();
  const dept = prompt('내 소속(작성자) 수정', p.dept || '') ?? p.dept;
  const jobTitle = prompt('내 직책(작성자) 수정', p.jobTitle || '') ?? p.jobTitle;
  const name = prompt('내 이름(작성자) 수정', p.name || '') ?? p.name;
  saveMyProfile({ dept, jobTitle, name });
  renderHeader();
}

/** =========================
 * autosave
 * ========================= */
const AUTOSAVE_DELAY_MS = 500;
let _autosaveTimer = null;
let _autosaveBooted = false;

function scheduleAutosave(){
  if(!_autosaveBooted) return;
  if(_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(()=>{ try{ saveState(); }catch(_){ } }, AUTOSAVE_DELAY_MS);
}

/** =========================
 * Options
 * ========================= */
const QUOTE_TYPE_OPTIONS = ['견적타입선택', '일반골판지 A형박스', '톰슨형 골판지', '칼라박스'];

const BOX_TYPE_OPTIONS = [
  '박스형태선택','직접입력','A1형','A1형 2합','A2형(겹날개)','A3형(상외날개)','A3형(하외날개)',
  'B형 하단조립','B형 3면접착','조립손잡이 하단조립','조립손잡이 3면접착',
  '지붕형 하단조립','지붕형 3면접착','완전조립형','구두신발조립형',
  'Y형 조립상짝','Y형 조립하짝','오픈조립형(과일)','제함형(과일)','RRP','완전오픈조립형','트레이','맞뚜껑','슬리브','CAP',
  '싸바리상하','패드','칸막이','각대',
];

const BOX_TYPE_IMAGE = {
  'A1형': './assets/box/A1.png',
  'A1형 2합': './assets/box/A1_twopiece.png',
  'A2형(겹날개)': './assets/box/A2_overlap.png',
  'A3형(상외날개)': './assets/box/A3_topflap.png',
  'A3형(하외날개)': './assets/box/A3_bottomflap.png',
  'B형 하단조립': './assets/box/B_bottomjoin.png',
  'B형 3면접착': './assets/box/B_3sideglue.png',
  '조립손잡이 하단조립': './assets/box/Y_bottomjoin_handle.png',
  '조립손잡이 3면접착': './assets/box/Y_3sideglue_handle.png',
  '지붕형 하단조립': './assets/box/roof_bottomjoin.png',
  '지붕형 3면접착': './assets/box/roof_3sideglue.png',
  '완전조립형': './assets/box/completejoin.png',
  '구두신발조립형': './assets/box/shoebox.png',
  'Y형 조립상짝': './assets/box/Y_topjoin.png',
  'Y형 조립하짝': './assets/box/Y_bottomjoin.png',
  '오픈조립형(과일)': './assets/box/openjoin_fruit.png',
  '제함형(과일)': './assets/box/ship_fruit.png',
  'RRP': './assets/box/rrp.png',
  '완전오픈조립형': './assets/box/completeopenjoin.png',
  '트레이': './assets/box/tray.png',
  '맞뚜껑': './assets/box/telescope.png',
  '슬리브': './assets/box/sleeve.png',
  'CAP': './assets/box/cap.png',
  '싸바리상하': './assets/box/hardbox_topbottom.png',
  '패드': './assets/box/pad.png',
  '칸막이': './assets/box/cross.png',
  '각대': './assets/box/coner.png',
};

const PAPER_TYPE_OPTIONS = [
  '용지선택','직접입력',
  'SC','IV','RIV','CCP','스노우','편ART','양ART','알리킹','모조지','노루지',
  '무염료KRAFT','수입KRAFT','Blanq Light','Blanq Bright',
];

const CORRUGATED_TYPE_OPTIONS = ['GF','FF','EF','BF','E','B','C','A','EB','BB','BA'];

const COATING_TYPE_OPTIONS = [
  '코팅종류선택','직접입력','기계코팅','유광CR', '무광CR', '오바코팅','유광라미', '유광라미(1300이상)','무광라미', '무광라미(1300이상)','UV코팅', '창문(타공)라미','고주파(PET)'
];

// =========================
// 코팅비참조(코팅비참조.xlsx) A열=코팅종류, C열=단가
// =========================
const COATING_UNITPRICE_REF = {
  '기계코팅': 0,
  '유광CR': 49,
  '무광CR': 49,
  '오바코팅': 68,
  '유광라미': 120,
  '유광라미(1300이상)': 150,   // 옵션에 없더라도 추후 추가 대비
  '무광라미': 130,
  '무광라미(1300이상)': 160,   // 옵션에 없더라도 추후 추가 대비
  'UV코팅': 80,
  '창문(타공)라미': 138,       // 옵션에 없더라도 추후 추가 대비
  '고주파(PET)': 110,
};

function lookupCoatingUnitPriceByType(name){
  const key = String(name || '').trim();
  if(!key) return null;
  const v = COATING_UNITPRICE_REF[key];
  return (v == null) ? null : Number(v);
}

function setCoatingUnitPriceValue(n){
  const v = Math.max(0, Math.round(Number(n) || 0));
  state.coatingUnitPrice = v;
  const el = q("[data-key='coatingUnitPrice']");
  if(el && document.activeElement !== el){
    el.value = fmtMoney(v);
  }
}


const STAMPING_TYPE_OPTIONS = [
  '박인쇄종류선택','직접입력',
  '유광은박','무광은박','유광금박','무광금박','유광동박','무광동박','국산홀로그램박','수입홀로그램박',
];

const ADHESIVE_TYPE_OPTIONS = ['접착종류선택','직접입력','1면접착','2면접착','3면접착','4면접착','6면접착','2합접착'];
const STAPLE_TYPE_OPTIONS = ['견철종류선택','직접입력','1합철','2합철','4합철'];
const PALLET_TYPE_OPTIONS = ['팔레트종류선택','나무팔레트','수출용나무팔레트','종이팔레트','플라스틱팔레트','아주렌탈','KPP렌탈'];
const HANDLE_TYPE_OPTIONS = ['손잡이종류선택','직접입력','끈손잡이','구형 플라스틱 상','구형 플라스틱 상하세트','신형 플라스틱 상','신형 플라스틱 상하세트'];

/** =========================
 * Field defs
 * ========================= */
const FIELD_DEFS = [
  // BASIC (고객 정보)
  { group:'basic', key:'companyName', label:'업체명', type:'text', placeholder:'예) ○○상사' },
  { group:'basic', key:'clientDept', label:'소속(고객)', type:'text', placeholder:'예) 구매팀' },
  { group:'basic', key:'clientJobTitle', label:'직책(고객)', type:'text', placeholder:'예) 대리' },
  { group:'basic', key:'clientName', label:'이름(고객)', type:'text', placeholder:'예) 김○○' },
  { group:'basic', key:'itemName', label:'품명', type:'text', placeholder:'예) 포장박스' },
  { group:'basic', key:'quoteType', label:'견적타입', type:'select', options:QUOTE_TYPE_OPTIONS, default:'견적타입선택' },
  { group:'basic', key:'boxType', label:'박스형태', type:'select+custom', options: BOX_TYPE_OPTIONS, placeholder:'박스형태선택', customLabel:'직접입력' },
  { group:'basic', key:'innerLength', label:'장(내측, mm)', type:'mm' },
  { group:'basic', key:'innerWidth', label:'폭(내측, mm)', type:'mm' },
  { group:'basic', key:'innerHeight', label:'고(내측, mm)', type:'mm' },
  { group:'basic', key:'qty', label:'박스수량', type:'int', default:0 },

  { group:'basic', key:'dieSizeLen', label:'칼사이즈 장(mm)', type:'mm-f1' },
  { group:'basic', key:'dieSizeWid', label:'칼사이즈 폭(mm)', type:'mm-f1' },
  { group:'basic', key:'boxCount', label:'박스개수', type:'int', default:1 },

  // MATERIAL
  { group:'material', key:'matC', label:'표면지', type:'text', placeholder:'예) SK180, KLB175 ...' },
  { group:'material', key:'matD', label:'골심지1(G,F,E,B)', type:'text', placeholder:'예) S110, KT160 ...' },
  { group:'material', key:'matE', label:'중심지', type:'text', placeholder:'예) KT160, K180 ...' },
  { group:'material', key:'matF', label:'골심지2(C,A,EB,BB,BA)', type:'text', placeholder:'예) K180, CK180 ...' },
  { group:'material', key:'matG', label:'이면지', type:'text', placeholder:'예) 백180, 황180 ...' },
  { group:'material', key:'corrugatedType', label:'골종류', type:'select', options: CORRUGATED_TYPE_OPTIONS, default:'GF' },
  { group:'material', key:'materialProcFeeMode', label:'가공비 모드', type:'select', options:['자동','수동'], default:'자동' },
  { group:'material', key:'materialProcFee', label:'가공비(O, 원/㎡)', type:'money', default:0 },
  // 계산 결과 표시(읽기전용)
{ group:'material', key:'matH', label:'표면원지가', type:'readonly-text', readOnly:true },
{ group:'material', key:'matI', label:'골심1원지가(G,F,E,B)', type:'readonly-text', readOnly:true },
{ group:'material', key:'matJ', label:'중심원지가', type:'readonly-text', readOnly:true },
{ group:'material', key:'matK', label:'골심2원지가(C,A,EB,BB,BA)', type:'readonly-text', readOnly:true },
{ group:'material', key:'matL', label:'이면원지가', type:'readonly-text', readOnly:true },
{ group:'material', key:'materialM2PriceRaw', label:'원단단가(계산값)', type:'readonly-text', readOnly:true },

// 원단단가 자동/수동 모드 (state.materialM2Price에 자동 반영 제어)
{ group:'material', key:'materialM2PriceMode', label:'원단단가 모드', type:'select', options:['자동','수동'], default:'자동' },
  { group:'material', key:'materialM2Price', label:'원단단가(1m²)', type:'money', default:0 },
  { group:'material', key:'materialLen', label:'원단 장(mm)', type:'mm' },
  { group:'material', key:'materialTopNail', label:'원단 윗날개(mm)', type:'mm' },
  { group:'material', key:'materialHeight', label:'박스높이(mm)', type:'mm' },
  { group:'material', key:'materialBottomNail', label:'원단 아래날개(mm)', type:'mm' },
  { group:'material', key:'materialCutSpec', label:'원단 재단폭(mm)', type:'mm' },
  { group:'material', key:'materialCuts', label:'원단 절수', type:'int', default:1 },
  { group:'material', key:'materialSpareQty', label:'원단지폭 여유수량', type:'int', default:0 },
  { group:'material', key:'materialRealWid', label:'원단 실지폭(mm)', type:'readonly-text', readOnly:true },
  { group:'material', key:'materialWid', label:'원단 지폭(mm)', type:'readonly-text', readOnly:true },
  { group:'material', key:'lossRate2', label:'원단로스율(%)', type:'readonly-text', readOnly:true },
  { group:'material', key:'materialAreaM2', label:'원단면적(m²)', type:'readonly-text', readOnly:true },
  { group:'material', key:'materialUnitSheet', label:'원단단가(1장)', type:'readonly-money', readOnly:true },

  // PAPER
  { group:'paper', key:'paperType', label:'용지종류', type:'select+custom', options: PAPER_TYPE_OPTIONS, placeholder:'용지선택', customLabel:'직접입력' },
  { group:'paper', key:'gsm', label:'평량(gsm)', type:'int', default:0 },
  { group:'paper', key:'paperKgPrice', label:'용지 단가(kg)', type:'money', default:0 },
  { group:'paper', key:'paperSheetLen', label:'용지 장(mm)', type:'mm' },
  { group:'paper', key:'paperSheetWid', label:'용지 폭(mm)', type:'mm' },
  { group:'paper', key:'paperCuts', label:'용지 절수', type:'int', default:1 },
  { group:'paper', key:'paperDiscount', label:'용지 할인율(%)', type:'percent-int', default:0 },
  { group:'paper', key:'lossQty', label:'용지여유수량(매수)', type:'int', default:0 },
  { group:'paper', key:'lossRate1', label:'용지로스율', type:'readonly-text', readOnly:true },
  { group:'paper', key:'paperTotalR', label:'용지 총연수(R)', type:'readonly-text', readOnly:true },
  { group:'paper', key:'paperTotalKg', label:'용지 총중량(kg)', type:'readonly-text', readOnly:true },

  // FLEXO PRINT (플렉소인쇄)
  { group:'flexo', key:'flexoPrintColors', label:'인쇄도수', type:'int', default:0 },
  { group:'flexo', key:'flexoColorInfo', label:'색상정보', type:'text', placeholder:'예) 2도(먹/적), 1도(군청) 등' },
  { group:'flexo', key:'flexoUnitPriceM2', label:'인쇄단가(1m²)', type:'money', default:0 },
  { group:'flexo', key:'flexoDiecutter', label:'다이커터종류', type:'text', placeholder:'예) 손잡이홀더, 타공 등' },
  { group:'flexo', key:'flexoDiecutterUnitPrice', label:'다이커터단가(통)', type:'money', default:0 },
  { group:'flexo', key:'flexoPressType', label:'인쇄기종류', type:'select', options:['오프라인','인라인','프린터기'], default:'오프라인' },

  // PRINT
  { group:'print', key:'ctpPlates', label:'CTP(판수)', type:'int', default:0 },
  { group:'print', key:'ctpUnitPrice', label:'CTP단가', type:'money', default:0 },
  { group:'print', key:'printColors', label:'인쇄적용도수', type:'float1', default:0 },
  { group:'print', key:'printColorInfo', label:'색상정보', type:'text', placeholder:'예) 4원색+별색1 / P 123C'},
  { group:'print', key:'printUnitPrice', label:'인쇄단가', type:'money', default:0 },
  { group:'print', key:'pressType', label:'인쇄기종류', type:'select', options:['대국전','하드롱','특하드롱','UV'], default:'대국전' },

  // COATING / POST-PROCESS
  { group:'coating', key:'coatingType', label:'코팅종류', type:'select+custom', options: COATING_TYPE_OPTIONS, placeholder:'코팅종류선택', customLabel:'직접입력' },
  { group:'coating', key:'coatingUnitPrice', label:'코팅단가(1m²)', type:'money', default:0 },

  { group:'coating', key:'silkPrintingUnitPrice', label:'실크인쇄단가(1통)', type:'money', default:0 },

  { group:'coating', key:'embossType', label:'형압종류', type:'select', options:['음각','양각'], default:'음각' },
  { group:'coating', key:'embossUnitPrice', label:'형압단가(1통)', type:'money', default:0 },

  { group:'coating', key:'stampingType', label:'박인쇄종류', type:'select+custom', options: STAMPING_TYPE_OPTIONS, placeholder:'박인쇄종류선택', customLabel:'직접입력' },
  { group:'coating', key:'stampingUnitPrice', label:'박인쇄단가(1통)', type:'money', default:0 },

  { group:'coating', key:'laminationUnitPrice', label:'합지단가(1m²)', type:'money', default:0 },
  { group:'coating', key:'thomsonUnitPrice', label:'톰슨단가(1통)', type:'money', default:0 },
  { group:'coating', key:'windowAttachUnitPrice', label:'창문접착단가(1개)', type:'money', default:0 },

  { group:'coating', key:'adhesiveType', label:'접착종류', type:'select+custom', options: ADHESIVE_TYPE_OPTIONS, placeholder:'접착종류선택', customLabel:'직접입력' },
  { group:'coating', key:'adhesiveUnitPrice', label:'접착단가(1개)', type:'money', default:0 },

  { group:'coating', key:'stapleType', label:'견철종류', type:'select+custom', options: STAPLE_TYPE_OPTIONS, placeholder:'견철종류선택', customLabel:'직접입력' },
  { group:'coating', key:'stapleCount', label:'견철방수', type:'int', default:0 },
  { group:'coating', key:'stapleUnitPrice', label:'견철단가(1방)', type:'money', default:0 },

  { group:'coating', key:'palletType', label:'팔레트종류', type:'select', options: PALLET_TYPE_OPTIONS, default:'팔레트종류선택' },
  { group:'coating', key:'palletUnitPrice', label:'팔레트금액', type:'money', default:0 },

  { group:'coating', key:'handleType', label:'손잡이종류', type:'select+custom', options: HANDLE_TYPE_OPTIONS, placeholder:'손잡이종류선택', customLabel:'직접입력' },
  { group:'coating', key:'handleUnitPrice', label:'손잡이단가', type:'money', default:0 },

  // SHIPPING
  { group:'shipping', key:'shipIncludeMode', label:'운송비선택', type:'select', options:['포함','미포함'], default:'포함' },
  { group:'shipping', key:'shipRegion', label:'운송지역', type:'datalist', placeholder:'예) 서울' },
  { group:'shipping', key:'shipDrop', label:'하차지', type:'datalist', placeholder:'예) 강서구 / 강서 / 중랑구 / 중랑' },
  { group:'shipping', key:'shipTruck', label:'차종(톤수)', type:'select',
    options:['다마스','라보','1톤','1.4톤','2.5톤','3.5톤','3.5톤 광폭','5톤','5톤플','5톤(윙)','11톤'], default:'1톤' },
  { group:'shipping', key:'shipCapacityQty', label:'적재가능수량', type:'int', default:0 },
  { group:'shipping', key:'shipTruckCount', label:'차량대수', type:'int', default:1 },
  { group:'shipping', key:'manualUnload', label:'수작업하차', type:'select', options:['아니오','예'], default:'아니오' },
  { group:'shipping', key:'shipBaseInput', label:'기본운송비(수동입력)', type:'money', default:0 },
  { group:'shipping', key:'shipBaseAuto', label:'기본운송비(자동)', type:'readonly-money', readOnly:true },
  { group:'shipping', key:'shipManualExtra', label:'수작업하차 추가금(자동)', type:'readonly-money', readOnly:true },
  { group:'shipping', key:'shipSpecialExtra', label:'왕복/대기/경유/특별', type:'money', default:0 },
  { group:'shipping', key:'shipTotal', label:'총 운송금액', type:'readonly-money', readOnly:true },

  // ADMIN
  { group:'admin', key:'mgmtRatePct', label:'일반관리비(%)', type:'percent', default:0 },
  { group:'admin', key:'profitRatePct', label:'이윤(%)', type:'percent', default:0 },
];

function parseMaterialRefTSV(tsv){
  const COLS = 20;
  const STOP_WORDS = ['비오엑스', '운송비별도', '단가변경'];

  const ok = new Set(['A','B','C','E','AB','BB','EB','EF','BF','GF','FF','BA']);

  const isNumLike = (s) => {
    const t = String(s||'').trim().replace(/,/g,'');
    return t !== '' && /^-?\d+(\.\d+)?$/.test(t);
  };

  const cleanCell = (v) => {
    let s = String(v ?? '').trim();
    // 따옴표 제거
    if((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))){
      s = s.slice(1, -1).trim();
    }
    // 숫자면 number로 (580,000 같은 쉼표 제거)
    const n = Number(s.replace(/,/g,''));
    if(Number.isFinite(n) && isNumLike(s)) return n;
    return s;
  };

  const linesAll = String(tsv||'')
    .replace(/\r/g,'')
    .split('\n')
    .map(x => x.replace(/^\uFEFF/, '').trimEnd()) // BOM 제거
    .filter(x => x.trim() !== '');

  // "비오엑스..." 아래 표는 제외
  const lines = [];
  for(const ln of linesAll){
    if(STOP_WORDS.some(w => ln.includes(w))) break;
    lines.push(ln);
  }

  // 🔑 탭이 있으면 탭 우선, 탭이 거의 없으면 "2칸 이상 공백" 기준으로 분리
  const tabCount = (lines.join('\n').match(/\t/g) || []).length;
  const useTab = tabCount > 50; // 경험치 기준: 데이터가 있으면 탭이 엄청 많음

  const splitLine = (ln) => {
    const s = ln.trim();
    if(useTab && s.includes('\t')) return s.split('\t').map(x=>x.trim());
    // 탭이 없거나 적으면: 공백 2개 이상을 컬럼 구분자로 사용
    return s.split(/ {2,}/).map(x=>x.trim());
  };

  const head = [
    '골','표면지','골심지1','중심지','골심지2','이면지',
    '표면원지가','골심1원지가','중심원지가','골심2원지가','이면원지가',
    '원재료비','원재료비+10%Loss','가공비','단가','비고',
    '원지종류','평량(g/㎡)','톤당금액','원지단가'
  ];

  const rows = [];

  for(const ln of lines){
    const parts = splitLine(ln);

    if(!parts || parts.length === 0) continue;

    // 라인 시작에서 골종류를 직접 추출(분리가 좀 깨져도 잡아냄)
    const m = ln.match(/^\s*(AB|BB|EB|EF|BF|GF|FF|BA|A|B|C|E)\b/i);
    const corr = (m ? m[1].toUpperCase() : '').trim();
    if(!ok.has(corr)) continue; // 헤더/설명 줄 제거

    let r = parts.slice();

    // 첫 칸이 번호(1,2,3...)면 제거(A열까지 같이 복사한 경우)
    if(r.length >= COLS + 1 && isNumLike(r[0])) r = r.slice(1);

    // 20칸 맞추기
    r = r.slice(0, COLS);
    while(r.length < COLS) r.push('');

    // 첫 칸(골)이 비어있으면 corr로 채움
    if(String(r[0]||'').trim() === '') r[0] = corr;

    rows.push(r.map(cleanCell));
  }

  return { head, rows };
}

/* =========================
   원지가격참조 REF_SAMPLE 등록
   ========================= */
(function(){
  const KEY = '원지가격참조';
  window.REF_SAMPLE = window.REF_SAMPLE || {};
  window.REF_SHEETS = window.REF_SHEETS || [];

  window.REF_SAMPLE[KEY] = {
    head: ['원지종류','평량(g/㎡)','톤당금액','원지단가'],
    rows: [
      ['SK180', 180, 580000, ''],
      ['백180', 180, 740000, ''],
      ['황180', 180, 580000, ''],
      ['황210', 210, 630000, ''],
      ['SK210', 210, 640000, ''],
      ['KLB175',175, 680000, ''],
      ['KLB225',225, 680000, ''],
      ['KLB300',300, 820000, ''],
      ['SC220', 220, 890000, ''],
      ['SC240', 240, 890000, ''],
      ['홍220', 220, 640000, ''],
      ['S110',  110, 500000, ''],
      ['S120',  120, 490000, ''],
      ['B150',  150, 500000, ''],
      ['KT160', 160, 500000, ''],
      ['CK180', 180, 560000, ''],
      ['K180',  180, 480000, ''],
      ['K250',  250, 480000, ''],
      ['K200',  200, 480000, ''],
    ]
  };

  if(!window.REF_SHEETS.some(s => s && s.key === KEY)){
    window.REF_SHEETS.push({ key: KEY, title: KEY });
  }
})();

/* =========================================================
   원지단가/원단단가 자동계산 (V1)
   - 원지가격참조로 원지단가 맵 생성
   - matC~G + corrugatedType으로 matH~L 채움(보정 포함)
   - 자동모드: ((H+I+J+K+L)*1.1)+가공비, 원단위 반올림
   - 매칭 실패 시 materialM2PriceRaw = "매칭없음(코드)"
   ========================================================= */
(function(){
  const PAPER_REF_KEY = '원지가격참조';

  const multI = { // 골심1 보정
    GF:1.1, FF:1.2, EF:1.3, E:1.3, B:1.4,
    A:0, EB:1.3, BB:1.4, BA:1.4, BF:1.3, C:0 // C는 명시 없어서 0 처리(필요시 바꿔줘)
  };

  const multK = { // 골심2 보정
    GF:0, FF:0, EF:0, E:0, B:0,
    C:1.5, A:1.6, EB:1.4, BB:1.4, BA:1.6, BF:0
  };

  const procFeeByCorr = {
    GF:50, FF:50, EF:30, BF:40,
    E:6, B:6, C:6, A:6,
    EB:23, BB:23, BA:23
  };

  function round1(n){ return Math.round(n*10)/10; }
  function round2(n){ return Math.round(n*100)/100; }
  function round3(n){ return Math.round(n*1000)/1000; }

  function normCode(v){
    const s = String(v ?? '').trim();
    if(!s) return '';
    return s.toUpperCase(); // K180/k180 통일
  }

  // 원지가격참조 -> { CODE: unitPrice } 생성
  function buildPaperUnitPriceMap(){
    const tbl = (window.REF_SAMPLE || {})[PAPER_REF_KEY];
    const map = Object.create(null);

    if(!tbl || !Array.isArray(tbl.rows)) return map;

    for(const r of tbl.rows){
      const code = normCode(r?.[0]);
      const gsm  = Number(r?.[1]);
      const ton  = Number(r?.[2]);
      if(!code || !Number.isFinite(gsm) || !Number.isFinite(ton)) continue;

      const unit = round1((gsm * ton) / 1_000_000);
      map[code] = unit;

      // 표도 같이 업데이트(선택): D열 채우기
      if(r.length >= 4) r[3] = unit;
    }
    return map;
  }

  // 캐시(매 recalc마다 만들어도 되지만 깔끔히)
  let _cacheKey = '';
  let _cacheMap = null;
  function getPaperMap(){
    const tbl = (window.REF_SAMPLE || {})[PAPER_REF_KEY];
    const sig = tbl && Array.isArray(tbl.rows) ? String(tbl.rows.length) : '0';
    if(_cacheMap && _cacheKey === sig) return _cacheMap;
    _cacheKey = sig;
    _cacheMap = buildPaperUnitPriceMap();
    return _cacheMap;
  }

  function setMissingRaw(msg){
    state.materialM2PriceRaw = msg;
    // 자동모드면 0으로 내려 “이전값 잔존” 방지
    if(String(state.materialM2PriceMode || '자동').trim() === '자동'){
      state.materialM2Price = 0;
    }
  }

  window.applyMaterialPaperPriceAuto = function applyMaterialPaperPriceAuto(){
    const corr = String(state.corrugatedType || '').trim().toUpperCase();
    const map = getPaperMap();

    // 입력 코드
    const face = normCode(state.matC);
    const d    = normCode(state.matD);
    const mid  = normCode(state.matE);
    const f    = normCode(state.matF);
    const back = normCode(state.matG);

    // 기본 단가
    const pFace = map[face];
    const pD    = map[d];
    const pMid  = map[mid];
    const pF    = map[f];
    const pBack = map[back];

    const missing = [];
    const need = [];

    function needCode(label, code){
      if(!code) need.push(label);
      else if(map[code] == null) missing.push(code);
    }

    // 표면/중심/이면은 항상 필요(빈값이면 입력필요)
    needCode('표면지', face);
    needCode('중심지', mid);
    needCode('이면지', back);

    // 골심1: 계수가 0이면 강제 0(코드 없어도 OK), 아니면 필요
    const mi = (multI[corr] ?? 0);
    if(mi !== 0) needCode('골심지1', d);

    // 골심2: 계수가 0이면 강제 0, 아니면 필요
    const mk = (multK[corr] ?? 0);
    if(mk !== 0) needCode('골심지2', f);

    // 표시값(matH~L) 계산 (원지단가는 1자리, 보정 후는 소수 발생하므로 2자리로 정리)
    const H = (map[face] == null) ? '' : map[face];                 // 1자리
    const I = (mi === 0) ? 0 : ((map[d] == null) ? '' : round2(map[d] * mi));
    const J = (map[mid] == null) ? '' : map[mid];
    const K = (mk === 0) ? 0 : ((map[f] == null) ? '' : round2(map[f] * mk));
    const L = (map[back] == null) ? '' : map[back];

    state.matH = H;
    state.matI = I;
    state.matJ = J;
    state.matK = K;
    state.matL = L;

    // 가공비(골종류별 고정)
    const procFee = (procFeeByCorr[corr] ?? 0);

    // 가공비 모드가 자동이면 state.materialProcFee에도 반영
    if(String(state.materialProcFeeMode || '자동').trim() === '자동'){
      state.materialProcFee = procFee;
    }

    // 입력 부족/매칭 실패 메시지
    if(need.length){
      setMissingRaw(`입력필요(${need.join(',')})`);
      return;
    }
    if(missing.length){
      setMissingRaw(`매칭없음(${missing.join(',')})`);
      return;
    }

    // 자동/수동 모드에 따른 원단단가 계산
    const mode = String(state.materialM2PriceMode || '자동').trim();

    // 합계(빈문자열 방지)
    const nH = Number(H) || 0;
    const nI = Number(I) || 0;
    const nJ = Number(J) || 0;
    const nK = Number(K) || 0;
    const nL = Number(L) || 0;

    const sum = nH + nI + nJ + nK + nL;
    const raw = (sum * 1.1) + procFee;

    // raw 표시는 소수 3자리 정도로
    state.materialM2PriceRaw = round3(raw);

    if(mode === '자동'){
      state.materialM2Price = Math.round(raw); // ✅ 원 단위 정수 반올림
    }else{
      // 수동이면 사용자가 입력하는 값 유지(자동으로 덮어쓰지 않음)
      // 단, 표시 요구가 “0으로 표시”라면 초기값 default:0이면 충분
    }
  };

  // syncReadonlyFields가 matH~L/materialM2PriceRaw를 안 갱신하는 구조라 “후킹”으로 보강
  if(typeof syncReadonlyFields === 'function' && !window.__matReadonlyHooked){
    window.__matReadonlyHooked = true;
    const _orig = syncReadonlyFields;
    syncReadonlyFields = function(){
      _orig();

      const keys = ['matH','matI','matJ','matK','matL','materialM2PriceRaw','materialProcFee'];
      for(const k of keys){
        const elx = document.querySelector(`[data-key='${k}']`);
        if(!elx) continue;
        const v = state[k];
        elx.value = (typeof v === 'number' && isFinite(v)) ? String(v) : String(v ?? '');
      }

      // money 필드 표기는 기존 money formatter가 담당하지만,
      // readonly-text로 찍히는 경우가 있어 안전하게 한번 더 보정
      const m2 = document.querySelector(`[data-key='materialM2Price']`);
      if(m2 && document.activeElement !== m2){
        // money 컨트롤이라 fmtMoney가 있으면 사용
        try{
          if(typeof fmtMoney === 'function') m2.value = fmtMoney(state.materialM2Price ?? 0);
        }catch(_){}
      }
    };
  }
})();

/* =========================================================
   원지/원단 자동계산 V3
   - 매칭없음 메시지에 "필드:코드" 포함
   ========================================================= */
   (function(){
    function normCode(v){
      const s = String(v ?? '').trim();
      if(!s) return '';
      return s.toUpperCase();
    }
    function round2(n){ return Math.round(n*100)/100; }
    function round3(n){ return Math.round(n*1000)/1000; }
  
    const multI = { GF:1.1, FF:1.2, EF:1.3, E:1.3, B:1.4, A:0, EB:1.3, BB:1.4, BA:1.4, BF:1.3, C:0 };
    const multK = { GF:0, FF:0, EF:0, E:0, B:0, C:1.5, A:1.6, EB:1.4, BB:1.4, BA:1.6, BF:0 };
    const procFeeByCorr = { GF:50, FF:50, EF:30, BF:40, E:6, B:6, C:6, A:6, EB:23, BB:23, BA:23 };
  
    function layerPlan(corr){
      const c = String(corr||'').toUpperCase();
      if(['GF','FF','EF','BF'].includes(c)) return { face:true, d:true,  mid:false, f:false, back:false };
      if(['E','B'].includes(c))            return { face:true, d:true,  mid:false, f:false, back:true  };
      if(['C','A'].includes(c))            return { face:true, d:false, mid:false, f:true,  back:true  };
      if(['EB','BB','BA'].includes(c))     return { face:true, d:true,  mid:true,  f:true,  back:true  };
      return { face:true, d:true, mid:true, f:true, back:true };
    }
  
    function getPaperMap(){
      // REF_SAMPLE['원지가격참조'] 기반 즉석 생성 + 캐시
      if(window.__paperUnitPriceMap && typeof window.__paperUnitPriceMap === 'object'){
        return window.__paperUnitPriceMap;
      }
      const tbl = (window.REF_SAMPLE||{})['원지가격참조'];
      const m = Object.create(null);
      if(tbl && Array.isArray(tbl.rows)){
        for(const r of tbl.rows){
          const code = normCode(r?.[0]);
          const gsm  = Number(r?.[1]);
          const ton  = Number(r?.[2]);
          if(!code || !Number.isFinite(gsm) || !Number.isFinite(ton)) continue;
          const unit = Math.round(((gsm*ton)/1_000_000)*10)/10; // 소수 1자리
          m[code] = unit;
          if(r.length >= 4) r[3] = unit; // 표 D열 업데이트(선택)
        }
      }
      window.__paperUnitPriceMap = m;
      return m;
    }
  
    window.applyMaterialPaperPriceAuto = function applyMaterialPaperPriceAuto(){
      const corr = String(state.corrugatedType || '').trim().toUpperCase();
      const plan = layerPlan(corr);
      const map = getPaperMap();
  
      const face = normCode(state.matC);
      const d    = normCode(state.matD);
      const mid  = normCode(state.matE);
      const f    = normCode(state.matF);
      const back = normCode(state.matG);
  
      const needLabels = [];                 // 비어있음(입력필요)
      const missingPairs = [];               // 매칭없음(필드:코드)
  
      function getUnit(code, label){
        if(!code){
          needLabels.push(label);
          return null;
        }
        const v = map[code];
        if(v == null){
          missingPairs.push(`${label}:${code}`);
          return null;
        }
        return Number(v);
      }
  
      // H(표면)
      let H = plan.face ? getUnit(face,'표면지') : 0;
  
      // I(골심1) = unit(d) * multI
      const mi = (multI[corr] ?? 0);
      let I;
      if(!plan.d || mi === 0){
        I = 0; // ✅ 강제 0
      }else{
        const base = getUnit(d,'골심지1');
        I = (base == null) ? '' : round2(base * mi);
      }
  
      // J(중심)
      let J = plan.mid ? getUnit(mid,'중심지') : 0; // ✅ plan.mid=false면 강제 0
  
      // K(골심2) = unit(f) * multK
      const mk = (multK[corr] ?? 0);
      let K;
      if(!plan.f || mk === 0){
        K = 0; // ✅ 강제 0
      }else{
        const base = getUnit(f,'골심지2');
        K = (base == null) ? '' : round2(base * mk);
      }
  
      // L(이면)
      let L = plan.back ? getUnit(back,'이면지') : 0; // ✅ plan.back=false면 강제 0
  
      // 표시값 반영 (요구: 강제 0은 0으로 보이게)
      state.matH = (H == null ? '' : H);
      state.matI = (I === '' ? '' : Number(I));
      state.matJ = (J == null ? '' : J);
      state.matK = (K === '' ? '' : Number(K));
      state.matL = (L == null ? '' : L);
  
      // 가공비 자동 세팅
      const procFee = (procFeeByCorr[corr] ?? 0);
      if(String(state.materialProcFeeMode || '자동').trim() === '자동'){
        state.materialProcFee = procFee;
      }
  
      // 입력/매칭 실패 메시지(필드명까지 표시)
      const autoMode = String(state.materialM2PriceMode || '자동').trim() === '자동';
  
      if(needLabels.length){
        state.materialM2PriceRaw = `입력필요(${needLabels.join(',')})`;
        if(autoMode) state.materialM2Price = 0;
        return;
      }
      if(missingPairs.length){
        state.materialM2PriceRaw = `매칭없음(${missingPairs.join(', ')})`;
        if(autoMode) state.materialM2Price = 0;
        return;
      }
  
      // 자동 계산: ((합)*1.1) + 가공비, 원단위 반올림
      const sum =
        (Number(state.matH)||0) +
        (Number(state.matI)||0) +
        (Number(state.matJ)||0) +
        (Number(state.matK)||0) +
        (Number(state.matL)||0);
  
      const raw = (sum * 1.1) + procFee;
      state.materialM2PriceRaw = round3(raw);
  
      if(autoMode){
        state.materialM2Price = Math.round(raw);
      }
    };
  })();
  
/* =========================================================
   원지/원단 자동계산 V4 (매칭없음 하이라이트 포함)
   ========================================================= */
   (function(){
    function normCode(v){
      const s = String(v ?? '').trim();
      if(!s) return '';
      return s.toUpperCase();
    }
    function round2(n){ return Math.round(n*100)/100; }
    function round3(n){ return Math.round(n*1000)/1000; }
  
    const multI = { GF:1.1, FF:1.2, EF:1.3, E:1.3, B:1.4, A:0, EB:1.3, BB:1.4, BA:1.4, BF:1.3, C:0 };
    const multK = { GF:0, FF:0, EF:0, E:0, B:0, C:1.5, A:1.6, EB:1.4, BB:1.4, BA:1.6, BF:0 };
    const procFeeByCorr = { GF:50, FF:50, EF:30, BF:40, E:6, B:6, C:6, A:6, EB:23, BB:23, BA:23 };
  
    function layerPlan(corr){
      const c = String(corr||'').toUpperCase();
      if(['GF','FF','EF','BF'].includes(c)) return { face:true, d:true,  mid:false, f:false, back:false };
      if(['E','B'].includes(c))            return { face:true, d:true,  mid:false, f:false, back:true  };
      if(['C','A'].includes(c))            return { face:true, d:false, mid:false, f:true,  back:true  };
      if(['EB','BB','BA'].includes(c))     return { face:true, d:true,  mid:true,  f:true,  back:true  };
      return { face:true, d:true, mid:true, f:true, back:true };
    }
  
    function getPaperMap(){
      if(window.__paperUnitPriceMap && typeof window.__paperUnitPriceMap === 'object'){
        return window.__paperUnitPriceMap;
      }
      const tbl = (window.REF_SAMPLE||{})['원지가격참조'];
      const m = Object.create(null);
      if(tbl && Array.isArray(tbl.rows)){
        for(const r of tbl.rows){
          const code = normCode(r?.[0]);
          const gsm  = Number(r?.[1]);
          const ton  = Number(r?.[2]);
          if(!code || !Number.isFinite(gsm) || !Number.isFinite(ton)) continue;
          const unit = Math.round(((gsm*ton)/1_000_000)*10)/10; // 1자리
          m[code] = unit;
          if(r.length >= 4) r[3] = unit;
        }
      }
      window.__paperUnitPriceMap = m;
      return m;
    }
  
    window.applyMaterialPaperPriceAuto = function(){
      const corr = String(state.corrugatedType || '').trim().toUpperCase();
      const plan = layerPlan(corr);
      const map = getPaperMap();
  
      // 입력 코드(이미 input 패치로 대문자화되지만, 방어로 한번 더)
      const face = normCode(state.matC);
      const d    = normCode(state.matD);
      const mid  = normCode(state.matE);
      const f    = normCode(state.matF);
      const back = normCode(state.matG);
  
      const needLabels = [];
      const missPairs = [];
      const missKeys = new Set(); // ✅ 하이라이트 대상 data-key
  
      function getUnit(code, label, key){
        if(!code){
          needLabels.push(label);
          if(key) missKeys.add(key);
          return null;
        }
        const v = map[code];
        if(v == null){
          missPairs.push(`${label}:${code}`);
          if(key) missKeys.add(key);
          return null;
        }
        return Number(v);
      }
  
      // H(표면)
      let H = plan.face ? getUnit(face,'표면지','matC') : 0;
  
      // I(골심1)
      const mi = (multI[corr] ?? 0);
      let I;
      if(!plan.d || mi === 0){
        I = 0; // 강제 0 (입력 있어도 하이라이트 안 함)
      }else{
        const base = getUnit(d,'골심지1','matD');
        I = (base == null) ? '' : round2(base * mi);
      }
  
      // J(중심)
      let J = plan.mid ? getUnit(mid,'중심지','matE') : 0;
  
      // K(골심2)
      const mk = (multK[corr] ?? 0);
      let K;
      if(!plan.f || mk === 0){
        K = 0; // 강제 0
      }else{
        const base = getUnit(f,'골심지2','matF');
        K = (base == null) ? '' : round2(base * mk);
      }
  
      // L(이면)
      let L = plan.back ? getUnit(back,'이면지','matG') : 0;
  
      // 표시값 반영
      state.matH = (H == null ? '' : H);
      state.matI = (I === '' ? '' : Number(I));
      state.matJ = (J == null ? '' : J);
      state.matK = (K === '' ? '' : Number(K));
      state.matL = (L == null ? '' : L);
  
      // 가공비 자동 세팅
      const procFee = (procFeeByCorr[corr] ?? 0);
      if(String(state.materialProcFeeMode || '자동').trim() === '자동'){
        state.materialProcFee = procFee;
      }
  
      // ✅ 하이라이트 반영(먼저 초기화 후 적용)
      if(typeof window.__setMatMissKeys === 'function'){
        window.__setMatMissKeys(Array.from(missKeys));
      }
  
      const autoMode = String(state.materialM2PriceMode || '자동').trim() === '자동';
  
      if(needLabels.length){
        state.materialM2PriceRaw = `입력필요(${needLabels.join(',')})`;
        if(autoMode) state.materialM2Price = 0;
        return;
      }
      if(missPairs.length){
        state.materialM2PriceRaw = `매칭없음(${missPairs.join(', ')})`;
        if(autoMode) state.materialM2Price = 0;
        return;
      }
  
      // ✅ 성공이면 하이라이트 제거
      if(typeof window.__setMatMissKeys === 'function'){
        window.__setMatMissKeys([]);
      }
  
      const sum =
        (Number(state.matH)||0) +
        (Number(state.matI)||0) +
        (Number(state.matJ)||0) +
        (Number(state.matK)||0) +
        (Number(state.matL)||0);
  
      const raw = (sum * 1.1) + procFee;
      state.materialM2PriceRaw = round3(raw);
  
      if(autoMode){
        state.materialM2Price = Math.round(raw); // 원 단위 반올림
      }
    };
  })();
  

// =========================
// REF_SAMPLE patch: 엑셀 참조표로 덮어쓰기 (운송비참조와 동일 UI)
// =========================
(function(){
  window.REF_SAMPLE = window.REF_SAMPLE || {};
  window.REF_SHEETS = window.REF_SHEETS || [];

  function upsertSheet(key, title){
    const k = String(key);
    const t = String(title || key);
    const i = window.REF_SHEETS.findIndex(x => x && x.key === k);
    if(i >= 0) window.REF_SHEETS[i] = { key:k, title:t };
    else window.REF_SHEETS.push({ key:k, title:t });
  }

  // 코팅비참조.xlsx
  window.REF_SAMPLE['코팅비참조'] = {
    head: ['코팅종류','적용','코팅단가(1m²)','기본가격','비고'],
    rows: [
      ['기계코팅','도수',0,0,'인쇄도수 1.5도 적용'],
      ['유광CR','1m²',49,16000,'최대규격 1440*1000'],
      ['무광CR','1m²',49,16000,'최대규격 1440*1000'],
      ['오바코팅','1m²',68,23000,'최대규격 1440*1000'],
      ['유광라미','1m²',120,30000,'최대규격 1430*1100'],
      ['유광라미(1300이상)','1m²',150,35000,'최대규격 1430*1100'],
      ['무광라미','1m²',130,35000,'최대규격 1430*1100'],
      ['무광라미(1300이상)','1m²',160,35000,'최대규격 1430*1100'],
      ['UV코팅','1m²',80,'','788*1091'],
      ['창문(타공)라미','1m²',138,'',''],
      ['고주파(PET)','1m²',110,'',''],
    ]
  };

 // 용지가격참조.xlsx (A~H, A1:H42 전체)
window.REF_SAMPLE['용지가격참조'] = {
  head: ['용지종류','평량(gsm)','고시단가(kg)','재단단가(kg)','할인율%','생산단가(kg)','할인율%','비고'],
  rows: [
    ['SC', 220, 1542, 1002, 0.35,  964, 0.375, '한창 (특수물량협의)'],
    ['SC', 240, 1493, 1135, 0.24, 1090, 0.27,  '특수물량협의'],
    ['SC', 300, 1408, 1070, 0.24, 1028, 0.27,  ''],
    ['SC', 350, 1401, 1065, 0.24, 1023, 0.27,  ''],
    ['SC', 400, 1379, 1048, 0.24, 1007, 0.27,  ''],

    ['IV',  260, 1862, '', '', '', '', ''],
    ['IV',  300, 1822, '', '', '', '', ''],
    ['IV',  350, 1804, '', '', '', '', ''],
    ['IV',  400, 1787, '', '', '', '', ''],

    ['RIV', 240, 2786, '', '', '', '', ''],
    ['RIV', 300, 2786, '', '', '', '', ''],
    ['RIV', 350, 2786, '', '', '', '', ''],
    ['RIV', 400, 2786, '', '', '', '', ''],

    ['CCP', 300, '', '', '', '', '', ''],
    ['CCP', 350, '', '', '', '', '', ''],
    ['CCP', 400, '', '', '', '', '', ''],

    ['스노우', 250, '', '', '', '', '', ''],
    ['스노우', 300, '', '', '', '', '', ''],
    ['스노우', 350, '', '', '', '', '', ''],

    ['편아트지', 150, '', '', '', '', '', ''],
    ['편아트지', 180, '', '', '', '', '', ''],

    ['양아트지', 200, '', '', '', '', '', ''],
    ['양아트지', 250, '', '', '', '', '', ''],

    ['알리킹', '', '', '', '', '', '', ''],

    ['모조지', 120, '', '', '', '', '', ''],
    ['모조지', 140, '', '', '', '', '', ''],
    ['모조지', 160, '', '', '', '', '', ''],
    ['모조지', 180, '', '', '', '', '', ''],

    ['노루지', '', '', '', '', '', '', ''],

    ['무염료KRAFT', 240, '', '', '', '', '', ''],
    ['무염료KRAFT', 300, '', '', '', '', '', ''],
    ['무염료KRAFT', 350, '', '', '', '', '', ''],
    ['무염료KRAFT', 400, '', '', '', '', '', ''],

    ['수입KRAFT', 250, '', '', '', '', '', ''],
    ['수입KRAFT', 300, '', '', '', '', '', ''],
    ['수입KRAFT', 350, '', '', '', '', '', ''],
    ['수입KRAFT', 400, '', '', '', '', '', ''],

    ['Blanq Light',  190, '', '', '', '', '', ''],
    ['Blanq Bright', 270, '', '', '', '', '', ''],
    ['Blanq Bright', 300, '', '', '', '', '', ''],
    ['Blanq Bright', 325, '', '', '', '', '', ''],
  ]
};

/* =========================================================
   원단가격참조: JSON 붙여넣기 로더 (V1)
   - app.js 안에서 REF_SAMPLE['원단가격참조']를 확실히 채움
   - head/rows 형태든, rows에 헤더가 포함된 형태든 자동 정규화
   - 각 행은 20열(B~U)로 강제 맞춤
   ========================================================= */
(function materialRefFromJsonV1(){
  const KEY = '원단가격참조';
  const COLS = 20;

  // 원단가격참조 기본 헤더(20열)
  const DEFAULT_HEAD = [
    '골','표면지','골심지1','중심지','골심지2','이면지',
    '표면원지가','골심1원지가','중심원지가','골심2원지가','이면원지가',
    '원재료비','Loss10%','가공비','단가','비고',
    '원지종류',"평량(g/㎡)",'톤당금액','원재료단가'
  ];

  function isNumLike(s){
    if (typeof s !== 'string') return false;
    const t = s.trim();
    if (!t) return false;
    // 쉼표/원/공백 제거 후 숫자 판정
    const u = t.replace(/[, ]/g,'').replace(/원/g,'');
    return /^-?\d+(\.\d+)?$/.test(u);
  }

  function coerceCell(v){
    if (v == null) return '';
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    const s = String(v).replace(/\r/g,'').trim();
    if (!s) return '';
    if (isNumLike(s)) {
      const n = Number(s.replace(/[, ]/g,'').replace(/원/g,''));
      return Number.isFinite(n) ? n : s;
    }
    return s;
  }

  function looksLikeHeaderRow(row){
    if (!Array.isArray(row)) return false;
    const t = row.map(x => String(x ?? '')).join('|');
    // 헤더에 흔히 들어가는 단어들로 휴리스틱 판단
    return t.includes('골') && (t.includes('표면') || t.includes('표면지')) && (t.includes('단가') || t.includes('원지가'));
  }

  function normalizeSheet(input){
    // 허용 형태:
    // 1) { head: [...], rows: [...] }
    // 2) { headers: [...], data: [...] }
    // 3) rows만 덩어리로 들어온 경우: [ [...], [...], ... ]
    let head = input && (input.head || input.headers) || null;
    let rows = input && (input.rows || input.data) || input;

    if (!Array.isArray(rows)) rows = [];

    // head가 없고 rows[0]가 헤더처럼 보이면 첫 행을 head로 승격
    if (!head && rows.length && looksLikeHeaderRow(rows[0])) {
      head = rows[0];
      rows = rows.slice(1);
    }

    // head 정리
    if (!Array.isArray(head) || head.length === 0) head = DEFAULT_HEAD.slice();
    head = head.slice(0, COLS).map(h => String(h ?? '').replace(/\s+/g,' ').trim());
    while (head.length < COLS) head.push('');

    // rows 정리(항상 20칸)
    const outRows = [];
    for (const r of rows) {
      if (!Array.isArray(r)) continue;
      const out = new Array(COLS).fill('');
      for (let i=0; i<COLS; i++) out[i] = coerceCell(r[i]);
      // “완전 빈 줄”은 제거(선택)
      const any = out.some(x => x !== '' && x !== null && x !== undefined);
      if (any) outRows.push(out);
    }

    return { head, rows: outRows };
  }

    // 1) "JSON"이 아니라, 탭(TSV) 원문을 그대로 넣습니다. (A1:T119 복사한 내용)
  //    반드시 탭(\t)이 포함돼야 빈 칸 컬럼이 유지됩니다.
  const MATERIAL_REF_TSV = `A	K180			S120	S120	86.4			94.08	58.8	239.28	263.208	6	269.208		SK180	180	580000	104.4
A	K180			K180	K180	86.4			138.24	86.4	311.04	342.144	6	348.144		백180	180	740000	133.2
A	SK180			KT160	KT160	104.4			128	80	312.4	343.64	6	349.64		황180	180	580000	104.4
A	SK180			K180	K180	104.4			138.24	86.4	329.04	361.944	6	367.944		황210	210	630000	132.3
A	SK180			K180	K180	104.4			138.24	86.4	329.04	361.944	6	367.944		SK210	210	640000	134.4
A	SK180			CK180	K180	104.4			161.28	86.4	352.08	387.288	6	393.288		KLB175	175	680000	119
A	KLB175			S120	K180	119			94.08	86.4	299.48	329.428	6	335.428		KLB225	225	680000	153
A	KLB175			S120	K180	119			94.08	86.4	299.48	329.428	6	335.428		KLB300	300	820000	246
A	KLB175			KT160	K180	119			128	86.4	333.4	366.74	6	372.74		SC220	220	890000	195.8
A	KLB175			KT160	KT160	119			128	80	327	359.7	6	365.7		SC240	240	890000	213.6
A	KLB175			K180	K180	119			138.24	86.4	343.64	378.004	6	384.004		홍220	220	640000	140.8
A	KLB175			CK180	K180	119			161.28	86.4	366.68	403.348	6	409.348		S110	110	500000	55
A	S120			K180	K180	58.8			138.24	86.4	283.44	311.784	6	317.784		S120	120	490000	58.8
A	백180			B150	K180	133.2			120	86.4	339.6	373.56	6	379.56		B150	150	500000	75
A	백180			KT160	B150	133.2			128	75	336.2	369.82	6	375.82		KT160	160	500000	80
A	백180			KT160	K180	133.2			128	86.4	347.6	382.36	6	388.36		CK180	180	560000	100.8
A	백180			K180	K180	133.2			138.24	86.4	357.84	393.624	6	399.624		K180	180	480000	86.4
A	백180			CK180	K180	133.2			161.28	86.4	380.88	418.968	6	424.968		K250	250	480000	120
B	K180	K180			K180	86.4	120.96			86.4	293.76	323.136	6	329.136		K200	200	480000	96
B	SK180	K180			K180	104.4	120.96			86.4	311.76	342.936	6	348.936					0
B	KLB175	K180			KLB175	119	120.96			119	358.96	394.856	6	400.856					0
B	K180	CK180			K180	86.4	141.12			86.4	313.92	345.312	6	351.312					0
B	KLB175	Ck180			K180	119	141.12			86.4	346.52	381.172	6	387.172					0
B	KLB175	K180			k180	119	120.96			86.4	326.36	358.996	6	364.996					0
B	KLB175	KT160			KT160	119	112			80	311	342.1	6	348.1					0
B	KLB175	S120			K180	119	82.32			86.4	287.72	316.492	6	322.492					0
B	SK180	CK180			k180	104.4	141.12			86.4	331.92	365.112	6	371.112					0
B	KLB225	CK180			홍220	153	141.12			140.8	434.92	478.412	6	484.412					
B	SC220	K250			SK210	195.8	168			134.4	498.2	548.02	6	554.02					
B	백180	K180			K180	133.2	120.96			86.4	340.56	374.616	6	380.616					
B	백180	CK180			K180	133.2	141.12			86.4	360.72	396.792	6	402.792					
E	SK180	S120			K180	104.4	76.44			86.4	267.24	293.964	6	299.964					
E	SK180	B150			K180	104.4	97.5			86.4	288.3	317.13	6	323.13					
E	SK180	K180			K180	104.4	112.32			86.4	303.12	333.432	6	339.432					
E	SK180	KT160			KT160	104.4	104			80	288.4	317.24	6	323.24					
E	SK180	CK180			K180	104.4	131.04			86.4	321.84	354.024	6	360.024					
E	KLB175	S120			K180	119	76.44			86.4	281.84	310.024	6	316.024					
E	KLB175	B150			K180	119	97.5			86.4	302.9	333.19	6	339.19					
E	KLB175	K180			K180	119	112.32			86.4	317.72	349.492	6	355.492					
E	KLB175	KT160			KT160	119	104			80	303	333.3	6	339.3					
E	KLB175	CK180			K180	119	131.04			86.4	336.44	370.084	6	376.084					
E	S120	K180			K180	58.8	120.96			86.4	266.16	292.776	6	298.776					
E	KLB175	K180			KLB175	119	120.96			119	358.96	394.856	6	400.856					
E	백180	S120			k180	133.2	82.32			86.4	301.92	332.112	6	338.112					
E	백180	CK180			K180	133.2	141.12			86.4	360.72	396.792	6	402.792					
AB	백180	S120	S120	S120	K180	133.2	82.32	58.8	94.08	86.4	454.8	500.28	23	523.28					
AB	황180	CK180	K180	CK180	K180	104.4	141.12	86.4	161.28	86.4	579.6	637.56	23	660.56					
AB	SK180	S110	S110	S110	K180	104.4	77	55	88	86.4	410.8	451.88	23	474.88					
AB	SK180	S120	S120	K180	SK180	104.4	82.32	58.8	138.24	104.4	488.16	536.976	23	559.976					
AB	SK180	S120	S120	S120	B150	104.4	82.32	58.8	94.08	75	414.6	456.06	23	479.06					
AB	SK180	K180	K180	K180	K180	104.4	120.96	86.4	138.24	86.4	536.4	590.04	23	613.04					
AB	SK180	K180	K180	K180	K180	104.4	120.96	86.4	138.24	86.4	536.4	590.04	23	613.04					
AB	SK180	S120	K180	S120	K180	104.4	82.32	86.4	94.08	86.4	453.6	498.96	23	521.96					
AB	SK180	KT160	S120	KT160	KT160	104.4	112	58.8	128	80	483.2	531.52	23	554.52					
AB	KLB175	S120	S120	S120	K180	119	82.32	58.8	94.08	86.4	440.6	484.66	23	507.66					
AB	KLB175	S120	S120	S120	K180	119	82.32	58.8	94.08	86.4	440.6	484.66	23	507.66					
AB	KLB175	S120	S120	B150	K180	119	82.32	58.8	120	86.4	466.52	513.172	23	536.172					
AB	KLB175	S120	S120	K180	K180	119	82.32	58.8	138.24	86.4	484.76	533.236	23	556.236					
AB	KLB175	K180	K180	K180	k180	119	120.96	86.4	138.24	86.4	551	606.1	23	629.1					
AB	KLB175	CK180	K180	CK180	K180	119	141.12	86.4	161.28	86.4	594.2	653.62	23	676.62					
AB	백180	S120	S120	KT160	KT160	133.2	82.32	58.8	128	80	482.32	530.552	23	553.552					
AB	백180	S120	S120	S120	B150	133.2	82.32	58.8	94.08	75	443.4	487.74	23	510.74					
AB	백180	S120	S120	B150	K180	133.2	82.32	58.8	120	86.4	480.72	528.792	23	551.792					
AB	백180	S120	S120	K180	K180	133.2	82.32	58.8	138.24	86.4	498.96	548.856	23	571.856					
AB	백180	CK180	K180	CK180	K180	133.2	141.12	86.4	161.28	86.4	608.4	669.24	23	692.24					
AB	황180	K180	S120	K180	K180	104.4	120.96	58.8	138.24	86.4	508.8	559.68	23	582.68					
BB	백180	K180	K180	S120	s120	133.2	120.96	86.4	82.32	58.8	481.68	529.848	23	552.848					
BB	SK180	S120	S120	S120	k180	104.4	82.32	58.8	82.32	86.4	414.24	455.664	23	478.664					
BB	SK180	CK180	K180	CK180	K180	104.4	141.12	86.4	141.12	86.4	559.44	615.384	23	638.384					
BB	SK180	K180	S120	K180	K180	104.4	120.96	58.8	120.96	86.4	491.52	540.672	23	563.672					
BB	SK180	S120	K180	S120	K180	104.4	82.32	86.4	82.32	86.4	441.84	486.024	23	509.024					
BB	SK180	K180	K180	K180	K180	104.4	120.96	86.4	120.96	86.4	519.12	571.032	23	594.032					
BB	KLB175	CK180	K180	CK180	K180	119	141.12	86.4	141.12	86.4	574.04	631.444	23	654.444					
BB	KLB175	S120	S120	S120	K180	119	82.32	58.8	82.32	86.4	428.84	471.724	23	494.724					
BB	KLB175	S120	S120	K180	K180	119	82.32	58.8	120.96	86.4	467.48	514.228	23	537.228					
BB	K180	K250	K180	K180	홍220	86.4	168	86.4	120.96	140.8	602.56	662.816	23	685.816					
BB	KLB175	S120	K180	S120	K180	119	82.32	86.4	82.32	86.4	456.44	502.084	23	525.084					
BB	KLB175	CK180	k180	CK180	KLB175	119	141.12	86.4	141.12	119	606.64	667.304	23	690.304					
BB	백180	K180	S120	K180	S120	133.2	120.96	58.8	120.96	58.8	492.72	541.992	23	564.992					
BB	백180	ck180	k180	ck180	K180	133.2	141.12	86.4	141.12	86.4	588.24	647.064	23	670.064					
BB	백180	S120	S120	B150	K180	133.2	82.32	58.8	105	86.4	465.72	512.292	23	535.292					
BB	백180	K180	S120	S120	S120	133.2	120.96	58.8	82.32	58.8	454.08	499.488	23	522.488					
BB	백180	S120	K180	S120	K180	133.2	82.32	86.4	82.32	86.4	470.64	517.704	23	540.704					
BB	백180	KT160	S120	KT160	황180	133.2	112	58.8	112	104.4	520.4	572.44	23	595.44					
EB	SC220	S120	S120	K180	K180	195.8	82.32	58.8	120.96	86.4	544.28	598.708	23	621.708					
EB	S120	S120	S120	CK180	황180	58.8	82.32	58.8	141.12	104.4	445.44	489.984	23	512.984					
EB	KT160	KT160	KT160	CK180	SK180	80	112	80	141.12	104.4	517.52	569.272	23	592.272					
EB	황180	s120	S120	S120	K180	104.4	82.32	58.8	82.32	86.4	414.24	455.664	23	478.664					
EB	K180	K180	K180	K180	K180	86.4	120.96	86.4	120.96	86.4	501.12	551.232	23	574.232					
EB	SK180	k180	k180	k180	K180	104.4	120.96	86.4	120.96	86.4	519.12	571.032	23	594.032					
EB	S120	K180	S120	CK180	KLB225	58.8	120.96	58.8	141.12	153	532.68	585.948	23	608.948					
EB	KLB175	S120	S120	K180	K180	119	82.32	58.8	120.96	86.4	467.48	514.228	23	537.228					
EB	KLB175	S120	S120	B150	K180	119	82.32	58.8	105	86.4	451.52	496.672	23	519.672					
EB	KLB175	S120	S120	S120	K180	119	82.32	58.8	82.32	86.4	428.84	471.724	23	494.724					
EB	KLB175	S120	K180	S120	K180	119	82.32	86.4	82.32	86.4	456.44	502.084	23	525.084					
EB	KLB175	S120	S120	K180	K180	119	82.32	58.8	120.96	86.4	467.48	514.228	23	537.228					
EB	백180	S120	S120	k180	K180	133.2	82.32	58.8	120.96	86.4	481.68	529.848	23	552.848					
EB	백180	S120	S120	S120	B150	133.2	82.32	58.8	82.32	75	431.64	474.804	23	497.804					
EB	백180	S120	S120	B150	K180	133.2	82.32	58.8	105	86.4	465.72	512.292	23	535.292					
EB	백180	S120	S120	S120	K180	133.2	82.32	58.8	82.32	86.4	443.04	487.344	23	510.344					
EB	백180	s120	S120	K180	S120	133.2	82.32	58.8	120.96	58.8	454.08	499.488	23	522.488					
EB	백180	K180	K180	CK180	K180	133.2	120.96	86.4	141.12	86.4	568.08	624.888	23	647.888					
EF	백180	S120				133.2	82.32				215.52	237.072	30	267.072					
EF	SK180	S120				104.4	82.32				186.72	205.392	20	225.392	25.05.01 215원				
EF	KLB175	S120				119	82.32				201.32	221.452	20	241.452					
EF	K180	S120				86.4	82.32				168.72	185.592	20	205.592	25.05.01 197원				
EF	백180	K180				133.2	120.96				254.16	279.576	20	299.576					
EF	SK180	K180				104.4	120.96				225.36	247.896	20	267.896					
EF	KLB175	K180				119	120.96				239.96	263.956	20	283.956					
EF	K180	K180				86.4	120.96				207.36	228.096	20	248.096					
BF	백180	S120				133.2	82.32				215.52	237.072	50	287.072					
BF	SK180	S120				104.4	82.32				186.72	205.392	40	245.392					
BF	K180	S120				86.4	82.32				168.72	185.592	40	225.592					
BF	백180	K180				133.2	120.96				254.16	279.576	40	319.576					
BF	SK180	K180				104.4	120.96				225.36	247.896	40	287.896					
BF	KLB175	K180				119	120.96				239.96	263.956	40	303.956					
BF	황180	K180				104.4	120.96				225.36	247.896	40	287.896					
BF	K180	K180				86.4	120.96				207.36	228.096	40	268.096					`;

  function sheetFromTSV(tsv){
    if (typeof tsv !== 'string') return { head: DEFAULT_HEAD.slice(), rows: [] };

    // 탭이 없으면(=공백으로 깨져버리면) 빈 칸 컬럼/메모(공백 포함) 컬럼이 망가져서 정확 파싱 불가
    if (!tsv.includes('\t')) {
      console.error('[원단가격참조] TSV에 탭(\\t)이 없습니다. 엑셀에서 범위(B4:U136) 복사한 탭 텍스트를 그대로 붙여넣어야 합니다.');
      return { head: DEFAULT_HEAD.slice(), rows: [] };
    }

    const lines = tsv
      .replace(/\r/g,'')
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.trim() !== '');

    const rows = [];
    for (const line of lines) {
      const cellsRaw = line.split('\t');         // 탭 기준 분리(빈칸 보존)
      const out = new Array(COLS).fill('');
      for (let i = 0; i < COLS; i++) out[i] = coerceCell(cellsRaw[i]);
      const any = out.some(x => x !== '' && x !== null && x !== undefined);
      if (any) rows.push(out);
    }
    return { head: DEFAULT_HEAD.slice(), rows };
  }

  // 2) REF_SAMPLE에 주입
  window.REF_SAMPLE = window.REF_SAMPLE || {};
  window.REF_SAMPLE[KEY] = sheetFromTSV(MATERIAL_REF_TSV);


  // 3) 탭 목록에도 없으면 추가(이미 있으면 유지)
  window.REF_SHEETS = window.REF_SHEETS || [];
  if (!window.REF_SHEETS.some(s => s && s.key === KEY)) {
    window.REF_SHEETS.push({ key: KEY, title: KEY });
  }

  // 4) 디버그 확인용(원하면 콘솔에서 확인)
  window.__materialRefDebug = {
    key: KEY,
    headLen: window.REF_SAMPLE[KEY].head.length,
    rowLen: window.REF_SAMPLE[KEY].rows.length,
    sample0: window.REF_SAMPLE[KEY].rows[0]
  };
})();


  // 옵셋인쇄비참조.xlsx (1~50 전체)
window.REF_SAMPLE['옵셋인쇄비참조'] = {
  head: ['수량R','대국전','하드롱','특하드롱','','구분','도수적용','비고'],
  rows: [
    [ 1, 20000, 25000, 30000, '', '기본도수', '3도', '3도이내' ],
    [ 2, 15000, 18000, 25000, '', '기본가격', '100000', '4원색' ],
    [ 3, 15000, 15000, 20000, '', '베다면적', '1도', '50%미만' ],
    [ 4, 10000, 12000, 18000, '', '', '2도', '50-80%' ],
    [ 5, 10000, 12000, 18000, '', '', '3도', '80%이상' ],
    [ 6,  9000, 10000, 15000, '', '별색', '인쇄도수+2도', '50%미만' ],
    [ 7,  9000, 10000, 15000, '', '별색', '인쇄도수+3도', '50-80%' ],
    [ 8,  8000, 10000, 15000, '', '별색', '인쇄도수+4도', '80%이상' ],

    [ 9,  8000, 10000, 15000, '', '', '', '' ],
    [10,  8000, 10000, 15000, '', '', '', '' ],

    [11,  7000,  9000, 13000, '', '', '', '' ],
    [12,  7000,  9000, 13000, '', '', '', '' ],
    [13,  7000,  9000, 13000, '', '', '', '' ],

    [14,  6500,  9000, 13000, '', '', '', '' ],
    [15,  6500,  9000, 13000, '', '', '', '' ],
    [16,  6500,  9000, 13000, '', '', '', '' ],

    [17,  6000,  9000, 13000, '', '', '', '' ],
    [18,  6000,  9000, 13000, '', '', '', '' ],
    [19,  6000,  9000, 13000, '', '', '', '' ],

    [20,  5500,  9000, 13000, '', '', '', '' ],

    [21,  5500,  8000, 12000, '', '', '', '' ],
    [22,  5500,  8000, 12000, '', '', '', '' ],
    [23,  5500,  8000, 12000, '', '', '', '' ],
    [24,  5500,  8000, 12000, '', '', '', '' ],
    [25,  5500,  8000, 12000, '', '', '', '' ],
    [26,  5500,  8000, 12000, '', '', '', '' ],
    [27,  5500,  8000, 12000, '', '', '', '' ],
    [28,  5500,  8000, 12000, '', '', '', '' ],
    [29,  5500,  8000, 12000, '', '', '', '' ],

    [30,  5000,  8000, 12000, '', '', '', '' ],

    [31,  5000,  7500, 11000, '', '', '', '' ],
    [32,  5000,  7500, 11000, '', '', '', '' ],
    [33,  5000,  7500, 11000, '', '', '', '' ],
    [34,  5000,  7500, 11000, '', '', '', '' ],
    [35,  5000,  7500, 11000, '', '', '', '' ],
    [36,  5000,  7500, 11000, '', '', '', '' ],
    [37,  5000,  7500, 11000, '', '', '', '' ],
    [38,  5000,  7500, 11000, '', '', '', '' ],
    [39,  5000,  7500, 11000, '', '', '', '' ],

    [40,  4500,  7500, 11000, '', '', '', '' ],

    [41,  4500,  7000, 10000, '', '', '', '' ],
    [42,  4500,  7000, 10000, '', '', '', '' ],
    [43,  4500,  7000, 10000, '', '', '', '' ],
    [44,  4500,  7000, 10000, '', '', '', '' ],
    [45,  4500,  7000, 10000, '', '', '', '' ],
    [46,  4500,  7000, 10000, '', '', '', '' ],
    [47,  4500,  7000, 10000, '', '', '', '' ],
    [48,  4500,  7000, 10000, '', '', '', '' ],
    [49,  4500,  7000, 10000, '', '', '', '' ],

    [50,  4000,  7000, 10000, '', '', '', '' ],
  ]
};


  // 탭 버튼이 없을 수도 있으니 존재 보장(이미 있으면 덮어씀)
  upsertSheet('용지가격참조','용지가격참조');
  upsertSheet('원단가격참조','원단가격참조'); // 데이터는 나중에 추가 가능
  upsertSheet('옵셋인쇄비참조','옵셋인쇄비참조');
  upsertSheet('코팅비참조','코팅비참조');
  upsertSheet('운송비참조','운송비참조');
})();


function _nz(v){ return v == null ? '' : String(v); }
function _n0(v){ v = Number(v); return Number.isFinite(v) ? v : 0; }
function _i0(v){ return Math.round(_n0(v)); }

function basisDirectMaterial(){
  // 원단 탭에서 실제로 쓰는 키들(프로젝트에서 이미 쓰는 키 기준)
  const top = _i0(state.materialTopNail);
  const h   = _i0(state.materialHeight);
  const bot = _i0(state.materialBottomNail);
  const cut = _i0(state.materialCutSpec);
  const len = _i0(state.materialLen);
  const m2p = _n0(state.materialM2Price);

  // 문자열은 "항상" 리턴(빈값이면 '-'로)
  const parts = [];
  if(len) parts.push(`장 ${len}mm`);
  if(cut) parts.push(`재단폭 ${cut}mm`);
  if(top || h || bot) parts.push(`(윗${top}+높이${h}+아래${bot})`);
  if(m2p) parts.push(`단가 ${m2p}원/m²`);

  return parts.length ? parts.join(' / ') : '-';
}

function basisDirectPaper(){
  // 종이 키는 프로젝트마다 다를 수 있어, 흔한 키 위주로 최대한 안전 구성
  const gsm = _n0(state.paperGsm);
  const m2p = _n0(state.paperM2Price);
  const type = _nz(state.paperType || state.paperName);

  const parts = [];
  if(type) parts.push(type);
  if(gsm) parts.push(`${gsm}g`);
  if(m2p) parts.push(`단가 ${m2p}원/m²`);

  return parts.length ? parts.join(' / ') : '-';
}


// ==============================
// 필드검색: Enter로 해당 필드로 이동
// ==============================

function walkFieldDefs(defs, fn){
  if(!defs) return;
  if(Array.isArray(defs)){
    for(const d of defs){
      if(!d) continue;
      if(Array.isArray(d)) walkFieldDefs(d, fn);
      else if(typeof d === 'object'){
        fn(d);
        for(const k of Object.keys(d)){
          if(k === 'key' || k === 'label' || k === 'group') continue;
          walkFieldDefs(d[k], fn);
        }
      }
    }
    return;
  }
  if(typeof defs === 'object'){
    for(const k of Object.keys(defs)) walkFieldDefs(defs[k], fn);
  }
}

function ensureFieldSearchStyle(){
  if(document.getElementById('fieldSearchStyle')) return;
  const st = document.createElement('style');
  st.id = 'fieldSearchStyle';
  st.textContent = `
    .field-search-hit{
      outline: 2px solid #ff9800 !important;
      box-shadow: 0 0 0 4px rgba(255,152,0,.25) !important;
      border-radius: 6px !important;
    }
  `;
  document.head.appendChild(st);
}


// ------------------------------
// 탭 버튼을 "텍스트"로 찾아 클릭
// ------------------------------
function clickTabByText(text){
  const t = String(text || '').trim();
  if(!t) return false;

  const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
  const btn = btns.find(el => String(el.textContent || '').trim().includes(t));
  if(btn){ btn.click(); return true; }
  return false;
}

// group -> 탭 텍스트 매핑 (당신 UI 명칭 기준)
function openGroupTabIfPossible(group){
  if(!group) return;

  // 기존 함수가 있으면 우선 사용
  if(typeof setActiveTab === 'function'){ setActiveTab(group); return; }
  if(typeof openTab === 'function'){ openTab(group); return; }
  if(typeof switchTab === 'function'){ switchTab(group); return; }

  const map = {
    basic: '기본정보',
    material: '원단',
    paper: '용지',
    flexo: '플렉소인쇄',
    print: 'CTP/옵셋인쇄',
    coating: '코팅/후가공',
    shipping: '운송',
    admin: '관리비/이윤',
    dev: '개발비',
  };

  // data-tab 류가 있으면 먼저 시도
  const btn =
    document.querySelector(`[data-tab='${group}']`) ||
    document.querySelector(`[data-group-tab='${group}']`);
  if(btn){ btn.click(); return; }

  // 텍스트로 클릭
  clickTabByText(map[group] || group);
}

// ------------------------------
// 특정 필드 엘리먼트가 "생길 때까지" 기다리기
// ------------------------------
function waitForFieldEl(key, cb, opt){
  const tries = (opt && opt.tries) ? opt.tries : 30;     // 30 * 50ms = 1.5s
  const delay = (opt && opt.delay) ? opt.delay : 50;

  let n = 0;
  const timer = setInterval(()=>{
    n++;

    const el =
      document.querySelector(`[data-key='${key}__sel']`) ||
      document.querySelector(`[data-key='${key}']`);

    if(el){
      clearInterval(timer);
      cb(el);
      return;
    }

    if(n >= tries){
      clearInterval(timer);
      cb(null);
    }
  }, delay);
}

// ------------------------------
// FIELD_DEFS에서 첫 매칭 찾기
// ------------------------------
function findFirstFieldByQuery(query){
  const qy = String(query || '').trim();
  if(!qy) return null;

  const hits = [];
  if(typeof walkFieldDefs === 'function'){
    walkFieldDefs(FIELD_DEFS, (d)=>{
      if(!d || !d.key || !d.label) return;
      const lab = String(d.label).trim();
      if(lab.includes(qy)) hits.push({ key:d.key, label:lab, group:d.group });
    });
  }
  return hits[0] || null;
}

// ------------------------------
// DOM에서 "라벨 텍스트"로 입력 찾기 (개발비 탭 같은 FIELD_DEFS 밖도 커버)
// ------------------------------
function findFieldElByLabelInDOM(query){
  const qy = String(query || '').trim();
  if(!qy) return null;

  const labelCandidates = Array.from(document.querySelectorAll(
    'label, .label, .field-label, .fld-label, .control-label, .lbl, div, span'
  )).filter(el => {
    const t = String(el.textContent || '').trim();
    return t && t.includes(qy);
  });

  for(const labEl of labelCandidates){
    // 보통 같은 row/container 안에 input이 있음
    const row = labEl.closest('.field-row, .row, .form-row, .grid-row, .field') || labEl.parentElement;
    if(!row) continue;

    const control =
      row.querySelector('[data-key]') ||
      row.querySelector('input, select, textarea');

    if(control) return control;
  }
  return null;
}

// ------------------------------
// "탭이 닫혀 있어도" 찾기 위해 탭을 순회하며 DOM 검색 (개발비 포함)
// ------------------------------
function bruteSearchAcrossTabs(query, onFound){
  const tabs = ['기본정보','원단','용지','플렉소인쇄','CTP/옵셋인쇄','코팅/후가공','운송','관리비/이윤','개발비'];
  let i = 0;

  function step(){
    // 현재 열려있는 화면에서 먼저 찾아보기
    const elNow = findFieldElByLabelInDOM(query);
    if(elNow){ onFound(elNow); return; }

    if(i >= tabs.length){ onFound(null); return; }

    clickTabByText(tabs[i]);
    i++;

    // 탭 전환/렌더 반영 시간을 조금 준 뒤 다시 검색
    setTimeout(step, 60);
  }

  step();
}

function openSectionForGroup(group){
  let anchor = null;

  if(group === 'dev'){
    anchor = q('#devList') || q('#btnDevAdd') || q('#btnDevClear');
  }else{
    anchor = q(`#group_${group}`);
  }
  if(!anchor) return null;

  const sec = anchor.closest('.section');
  if(!sec) return null;

  // ✅ 닫혀있으면 강제로 열기
  sec.setAttribute('data-open', '1');
  const sbd = sec.querySelector('.sbd');
  if(sbd) sbd.style.display = 'block';

  return sec;
}

function focusAndHighlight(el){
  if(!el) return;
  el.scrollIntoView({ behavior:'smooth', block:'center' });
  try{ el.focus({ preventScroll:true }); }catch(_){ try{ el.focus(); }catch(__){} }

  el.classList.add('field-search-hit');
  setTimeout(()=> el.classList.remove('field-search-hit'), 1200);
}

function findControlByKey(key){
  return (
    document.querySelector(`[data-key='${key}__sel']`) ||
    document.querySelector(`[data-key='${key}']`)
  );
}

// group 섹션 안에서 라벨(.lab) 기준으로 컨트롤 찾기
function findControlInGroupByLabelText(group, query){
  const host = q(`#group_${group}`);
  if(!host) return null;

  const labs = Array.from(host.querySelectorAll('.lab'));
  for(const lab of labs){
    const t = String(lab.textContent || '').trim();
    if(!t || !t.includes(query)) continue;

    const fieldCell = lab.nextElementSibling; // renderInputs() 구조상 lab 다음이 field
    if(!fieldCell) continue;

    const control =
      fieldCell.querySelector("[data-key]") ||
      fieldCell.querySelector("select, input, textarea");

    if(control) return control;
  }
  return null;
}

function findDevControlByQuery(query){
  // 개발비 섹션은 라벨이 없으니 별도 처리
  const devList = q('#devList');
  const addBtn = q('#btnDevAdd');

  // "개발비"라고 검색하면 무조건 개발비 영역으로 이동(입력 없으면 추가버튼으로)
  if(String(query).includes('개발비')){
    if(devList){
      const firstInput = devList.querySelector('input,select,textarea');
      return firstInput || addBtn || devList;
    }
    return addBtn;
  }

  // 그 외 검색어는 placeholder/value에 포함되면 해당 input으로
  if(devList){
    const controls = Array.from(devList.querySelectorAll('input,select,textarea,button'));
    const hit = controls.find(c=>{
      const ph = String(c.getAttribute?.('placeholder') || '');
      const val = String(c.value || '');
      const txt = String(c.textContent || '');
      return ph.includes(query) || val.includes(query) || txt.includes(query);
    });
    if(hit) return hit;
  }

  return null;
}

function gotoFieldByQuery(query){
  const qy = String(query || '').trim();
  if(!qy) return false;

  // 1) FIELD_DEFS에서 먼저 찾기
  const hit = findFirstFieldByQuery(qy);

  if(hit){
    // ✅ 닫힌 섹션이면 열기
    openSectionForGroup(hit.group);

    // 해당 key 컨트롤 찾기(셀렉트+커스텀도 __sel 우선)
    const el = findControlByKey(hit.key);
    if(el){
      focusAndHighlight(el);
      return true;
    }

    // 혹시 필터/렌더 상태로 key 컨트롤이 없으면 label 기반으로 재탐색
    const el2 = findControlInGroupByLabelText(hit.group, qy);
    if(el2){
      focusAndHighlight(el2);
      return true;
    }
  }

  // 2) FIELD_DEFS에 없거나 못 찾으면: 모든 섹션을 열어가며 label로 찾기
  const groups = ['basic','material','paper','print','coating','shipping','admin'];
  for(const g of groups){
    openSectionForGroup(g);
    const el = findControlInGroupByLabelText(g, qy);
    if(el){
      focusAndHighlight(el);
      return true;
    }
  }

  // 3) 개발비는 별도(라벨 없음)
  openSectionForGroup('dev');
  const devEl = findDevControlByQuery(qy);
  if(devEl){
    focusAndHighlight(devEl);
    return true;
  }

  return false;
}


// ===== 필드검색 input을 강제로 찾아내기(placeholder 없어도 동작) =====
function findFieldSearchInput(){
  // 1) 혹시 id가 있으면 우선
  let el =
    document.querySelector('#fieldSearch') ||
    document.querySelector('#fieldSearchInput') ||
    document.querySelector("input[data-role='fieldSearch']");
  if(el) return el;

  // 2) "지우기" 버튼을 기준으로 같은 영역의 input 찾기 (현재 UI에서 가장 확실)
  const clearBtn = Array.from(document.querySelectorAll('button'))
    .find(b => String(b.textContent || '').trim() === '지우기');

  if(clearBtn){
    // 같은 컨테이너 안에 input이 있으면 그걸 사용
    const wrap = clearBtn.closest('div')?.parentElement || clearBtn.parentElement;
    const inWrap = wrap ? wrap.querySelector('input') : null;
    if(inWrap) return inWrap;

    // 형제/이전요소를 거슬러 올라가며 input 찾기
    let p = clearBtn.previousElementSibling;
    while(p){
      if(p.tagName === 'INPUT') return p;
      if(p.querySelector){
        const t = p.querySelector('input');
        if(t) return t;
      }
      p = p.previousElementSibling;
    }
  }

  return null;
}

let __fieldSearchBound = false;

function initFieldSearch(){
  if(__fieldSearchBound) return;
  __fieldSearchBound = true;

  ensureFieldSearchStyle();

  // ✅ 헤더가 다시 렌더돼서 input이 바뀌어도 계속 동작하도록 "문서 이벤트 위임"
  document.addEventListener('keydown', (e)=>{
    if(e.isComposing) return;
    if(e.key !== 'Enter') return;

    const input = findFieldSearchInput();
    if(!input) return;

    // 검색창에서 Enter 친 경우만 처리
    if(e.target !== input) return;

    e.preventDefault();
    gotoFieldByQuery(input.value);
  }, true);
}


// =======================================================
// A1형 + 골종류별 원단 윗날개/아래날개(mm) 자동계산
// 조건: 견적타입="일반골판지 A형박스" && 박스형태="A1형"
// 골종류: E골/B골/C골/A골/EB골/BB골/BA골
// =======================================================

function getBoxTypeValue(){
  // boxType이 select+custom이라 __sel 우선
  const sel = (typeof q === 'function') ? q("[data-key='boxType__sel']") : null;
  if(sel) return String(sel.value || '').trim();
  return String(state.boxType || '').trim();
}

function isBoxTypeDirectInputMode(){
  const sel = q("[data-key='boxType__sel']");
  const vSel = sel ? String(sel.value || '').trim() : '';
  if(vSel === '직접입력') return true;

  // 옵션에서 '직접입력'이 실제 값으로 들어온 경우도 방어
  const v = String(state.boxType || '').trim();
  return v === '직접입력';
}

function applyBoxTypeDirectInputMode(){
  const on = isBoxTypeDirectInputMode();

  // 모드 전환 감지용
  if(state.__boxTypeDirectMode == null) state.__boxTypeDirectMode = false;

  const keys = ['materialLen','materialTopNail','materialHeight','materialBottomNail','materialCutSpec'];

  // ✅ 직접입력 모드로 "진입"하는 순간에만 0으로 초기화
  if(on && !state.__boxTypeDirectMode){
    for(const k of keys) state[k] = 0;
  }

  state.__boxTypeDirectMode = on;

  // ✅ 직접입력 모드면: 5개 입력칸은 항상 편집 가능 + (입력 중이 아니면) 값 표시 동기화
  if(on){
    for(const k of keys){
      const el = q(`[data-key='${k}']`);
      if(el){
        el.readOnly = false;
        if(document.activeElement !== el){
          el.value = String(Math.round(safe0(state[k])));
        }
      }
    }
  }
}


function normalizeCorrugatedType(v){
  const s = String(v || '').trim();

  // 이미 'E골' 같은 한글이면 그대로 사용
  if(/골$/.test(s)) return s;

  // 혹시 코드값이 들어오는 경우를 대비 (예: 'E', 'B', 'C', 'A', 'EB', 'BB', 'BA')
  const upper = s.toUpperCase();
  const map = {
    'E': 'E골',
    'B': 'B골',
    'C': 'C골',
    'A': 'A골',
    'EB': 'EB골',
    'BB': 'BB골',
    'BA': 'BA골',
  };
  return map[upper] || s;
}


function applyMaterialFlapsAuto(){
  if(isBoxTypeDirectInputMode()) return;
  const qt = String(state.quoteType || '').trim();

  // 견적타입이 A형박스가 아니면: 윗/높이/아래 모두 0
  if(qt !== '일반골판지 A형박스'){
    state.materialTopNail = 0;
    state.materialHeight = 0;
    state.materialBottomNail = 0;

    const t = q("[data-key='materialTopNail']"); if(t) t.value = '0';
    const h = q("[data-key='materialHeight']"); if(h) h.value = '0';
    const b = q("[data-key='materialBottomNail']"); if(b) b.value = '0';
    return;
  }

  // ✅ A형박스 + 골종류 GF/FF/EF/BF이면: 윗날개/박스높이/아래날개 모두 0
  const cor = String(state.corrugatedType || '').trim().toUpperCase();
  if(cor === 'GF' || cor === 'FF' || cor === 'EF' || cor === 'BF'){
    state.materialTopNail = 0;
    state.materialHeight = 0; // applyBoxHeightAuto 결과가 있어도 여기서 0으로 덮어씀
    state.materialBottomNail = 0;

    const t = q("[data-key='materialTopNail']"); if(t) t.value = '0';
    const h = q("[data-key='materialHeight']"); if(h) h.value = '0';
    const b = q("[data-key='materialBottomNail']"); if(b) b.value = '0';
    return;
  }

  const bt = getBoxTypeValue();                   // A1형/A2형(겹날개)/A3형...
  const W  = Math.round(safe0(state.innerWidth)); // 폭(내측,mm)
  if(W <= 0) return;

  // 공통(폭/2 기반) 테이블용
  const base = W / 2;            // x.0 또는 x.5
  const isInt = (W % 2 === 0);   // 정수/소수(.5) 판단

  function ruleValueByHalf(){
    // A3에서 쓰는 "폭/2 + 보정" 테이블
    if(cor === 'E')  return base + (isInt ? 0 : 0.5);       // 소수면 +0.5
    if(cor === 'B')  return base + (isInt ? 1 : 0.5);
    if(cor === 'C' || cor === 'A' || cor === 'EB' || cor === 'BB') return base + (isInt ? 2 : 1.5);
    if(cor === 'BA') return base + (isInt ? 3 : 2.5);
    return null;
  }

  // =========================
  // A1형 규칙 (윗=아래)  ※ 기존 유지
  // =========================
  if(bt === 'A1형' || bt === 'A1형 2합'){
    let v;
    if(cor === 'E'){
      v = Math.round(base); // x.5면 올림 → 정수
    }else if(cor === 'B'){
      v = base + (isInt ? 1 : 0.5);
    }else if(cor === 'C' || cor === 'A' || cor === 'EB' || cor === 'BB'){
      v = base + (isInt ? 2 : 1.5);
    }else if(cor === 'BA'){
      v = base + (isInt ? 3 : 2.5);
    }else{
      return;
    }

    const r = Math.round(v);
    state.materialTopNail = r;
    state.materialBottomNail = r;
  }

  // =========================
  // A2형(겹날개) 규칙 (윗=아래)  ※ 사용자 변경(W/1) 유지
  // =========================
  else if(bt === 'A2형(겹날개)'){
    // ⚠️ 사용자 코드 그대로: result=W, isIntResult=true(항상)
    const result = W / 1;
    const isIntResult = (W % 1 === 0);

    let out;

    if(cor === 'E'){
      out = W;
    }else if(cor === 'B'){
      out = result + (isIntResult ? 1 : 0.5);
    }else if(cor === 'C' || cor === 'A' || cor === 'EB' || cor === 'BB'){
      out = result + (isIntResult ? 2 : 1.5);
    }else if(cor === 'BA'){
      out = result + (isIntResult ? 3 : 2.5);
    }else{
      return;
    }

    const r = Math.round(out);
    state.materialTopNail = r;
    state.materialBottomNail = r;
  }

  // =========================
  // A3형(상외날개): 아래=0, 위=폭/2+보정
  // A3형(하외날개): 위=0, 아래=폭/2+보정
  // =========================
  else if(bt === 'A3형(상외날개)' || bt === 'A3형(하외날개)'){
    const v = ruleValueByHalf();
    if(v == null) return;

    const flap = Math.round(v);

    if(bt === 'A3형(상외날개)'){
      state.materialTopNail = flap;
      state.materialBottomNail = 0;
    }else{
      state.materialTopNail = 0;
      state.materialBottomNail = flap;
    }
  }else{
    // 그 외 박스형태는 자동계산 범위 밖
    return;
  }

  // UI 반영
  const elTop = q("[data-key='materialTopNail']");
  if(elTop) elTop.value = String(state.materialTopNail);

  const elBot = q("[data-key='materialBottomNail']");
  if(elBot) elBot.value = String(state.materialBottomNail);
}

 
// =======================================================
// 박스높이(mm) ↔ 고(내측, mm) 자동 연동 (키/구조 자동 대응)
// 조건: 견적타입="일반골판지 A형박스" && 박스형태가 지정 4종일 때
// =======================================================

function _walkFieldDefs(defs, fn){
  if(!defs) return;

  if(Array.isArray(defs)){
    for(const d of defs){
      if(!d) continue;
      if(Array.isArray(d) || (typeof d === 'object' && !d.key && !d.label)){
        _walkFieldDefs(d, fn);
      }else if(typeof d === 'object'){
        fn(d);
      }
    }
    return;
  }

  if(typeof defs === 'object'){
    for(const k of Object.keys(defs)){
      _walkFieldDefs(defs[k], fn);
    }
  }
}

function _findFieldKeyByLabels(labels){
  let found = null;
  try{
    _walkFieldDefs(FIELD_DEFS, (d)=>{
      if(found) return;
      const lab = String(d.label || '').trim();
      if(lab && labels.includes(lab)) found = d.key;
    });
  }catch(_){}
  return found;
}

function getCurrentQuoteTypeValue(){
  // UI 셀렉트가 있으면 우선 (렌더 타이밍/동기화 이슈 회피)
  const elSel = (typeof q === 'function') ? q("[data-key='quoteType__sel']") : null;
  if(elSel) return String(elSel.value || '').trim();
  const el = (typeof q === 'function') ? q("[data-key='quoteType']") : null;
  if(el) return String(el.value || '').trim();
  return String(state.quoteType || '').trim();
}

function getCurrentBoxTypeValue(){
  // boxType이 select+custom 구조인 경우 __sel에 값이 있을 수 있음
  const elSel = (typeof q === 'function') ? q("[data-key='boxType__sel']") : null;
  if(elSel) return String(elSel.value || '').trim();
  const el = (typeof q === 'function') ? q("[data-key='boxType']") : null;
  if(el) return String(el.value || '').trim();
  return String(state.boxType || '').trim();
}

function applyBoxHeightAuto(){
  if(isBoxTypeDirectInputMode()) return;
  const qt = String(state.quoteType || '').trim();

  // 박스높이(mm) = materialHeight
  if(qt === '일반골판지 A형박스'){
    // ✅ 박스높이(mm) = 고(내측, mm)
    const H = Math.round(safe0(state.innerHeight));
    state.materialHeight = (H > 0 ? H : 0);
  }else{
    // ✅ A형박스가 아니면 0
    state.materialHeight = 0;
  }

  // UI 즉시 반영
  const elH = q("[data-key='materialHeight']");
  if(elH) elH.value = String(state.materialHeight);
}



/** =========================
 * State
 * ========================= */
const state = { devItems: [] };
function ensureDevItems(){ if(!Array.isArray(state.devItems)) state.devItems=[]; }

function initState(){
  for(const f of FIELD_DEFS){
    const k=f.key;
    if([
      'lossRate1','lossRate2',
      'shipBaseAuto','shipManualExtra','shipTotal',
      'paperTotalR','paperTotalKg',
      'materialAreaM2','materialUnitSheet',
      'materialRealWid','materialWid',
    ].includes(k)) continue;

    state[k] = (f.default !== undefined) ? f.default : '';
  }

  ensureDevItems();

  state.lossRate1 = 0;
  state.lossRate2 = 0;
  state.shipBaseAuto = 0;
  state.shipManualExtra = 0;
  state.shipTotal = 0;

  state.paperTotalR = 0;
  state.paperTotalKg = 0;

  state.materialAreaM2 = 0;
  state.materialUnitSheet = 0;
  state.materialRealWid = 0;
  state.materialWid = 0;
  state.materialWidText = '0';

  state.createdAt = new Date().toISOString(); // 날짜+시간
  state.__openGroups = ['basic']; // ✅ 기본정보만 오픈

}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function loadState(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return false;
  try{
    Object.assign(state, JSON.parse(saved));
    applyOpenGroupsFromState(); // ✅ 추가

    // 기본 보정
    if(state.shipIncludeMode == null) state.shipIncludeMode = '포함';
    if(state.shipTruckCount == null) state.shipTruckCount = 1;
    if(state.shipCapacityQty == null) state.shipCapacityQty = 0;

    // createdAt 보정(구버전 날짜만 있던 것 포함)
    if(!state.createdAt) state.createdAt = new Date().toISOString();
    if(String(state.createdAt).length === 10) state.createdAt = new Date().toISOString();

    // 고객 필드 기본값
    if(state.clientDept == null) state.clientDept = '';
    if(state.clientJobTitle == null) state.clientJobTitle = '';
    if(state.clientName == null) state.clientName = '';

    // 구버전 키 마이그레이션 (dept/jobTitle/userName -> client*)
    if(state.dept != null && !state.clientDept) state.clientDept = state.dept;
    if(state.jobTitle != null && !state.clientJobTitle) state.clientJobTitle = state.jobTitle;
    if(state.userName != null && !state.clientName) state.clientName = state.userName;

    ensureDevItems();

    if(state.materialRealWid == null) state.materialRealWid = 0;
    if(state.materialWid == null) state.materialWid = 0;
    if(state.materialWidText == null) state.materialWidText = '0';

    if(state.quoteType == null) state.quoteType = '견적타입선택';
    return true;
  }catch(_){
    return false;
  }
}

function migrateDefaultsV1(){
  // 필드 경로는 프로젝트 실제 구조로 맞춰야 합니다.
  const cur = state?.basic?.productName; // 예: 품명 필드
  if (!cur || cur === '처음처럼') {
    state.basic = state.basic || {};
    state.basic.productName = '포장박스';
  }
}

/** =========================
 * DOM helpers
 * ========================= */
const q = (sel)=>document.querySelector(sel);
const qa = (sel)=>Array.from(document.querySelectorAll(sel));

function el(tag, attrs={}, html=''){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class') e.className=v;
    else if(k==='value') e.value=v;
    else if(k==='rowspan') e.rowSpan = Number(v);
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k,v);
  }
  if(html!==undefined) e.innerHTML=html;
  return e;
}

function ensureShareButton(){
  const actions = document.querySelector('.actions');
  if(!actions){
    console.warn('[Share] .actions not found');
    return null;
  }

  let btn = document.getElementById('btnShare');
  if(!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnShare';
    btn.className = 'btn btn-share';
    btn.textContent = '공유';
    actions.appendChild(btn);
  }
  return btn;
}


/** =========================
 * Utils
 * ========================= */
function safeStep(name, fn) {
  try { return fn(); }
  catch (e) {
    console.error(`[${name}] failed:`, e);
    window.__lastQuoteError = { name, message: String(e?.message || e), stack: e?.stack };
    return undefined;
  }
}


function safe0(x){ x=Number(x)||0; return isFinite(x)?x:0; }
function round2(x){ x=Number(x)||0; return Math.round(x*100)/100; }

function toNumLoose(v){
  if(v==null) return 0;
  const s=String(v).replace(/[, ]/g,'').trim();
  if(s==='') return 0;
  const n=parseFloat(s);
  return isFinite(n)?n:0;
}

function fmtMoney(v){ return Math.round(Number(v)||0).toLocaleString('ko-KR'); }

function parsePercentLoose(v){
  const s=String(v??'').replace(/[% ,]/g,'').trim();
  const n=parseFloat(s);
  return isFinite(n)?n:0;
}

function unitPricePerBox(amount){
  const qty = safe0(state.qty);
  if(qty<=0) return 0;
  return Math.round((Number(amount)||0) / qty);
}

function pctText(v){ return (Number(v)||0).toFixed(2) + '%'; }

function ceilTo(x, step){
  if(!isFinite(x) || !isFinite(step) || step<=0) return 0;
  return Math.ceil(x/step)*step;
}

function formatKoreanDateTime(iso){
  if(!iso) return '-';
  const d = new Date(iso);
  if(!isFinite(d.getTime())) return String(iso);
  return d.toLocaleString('ko-KR', {
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit'
  });
}

// “생성날짜”를 수정할 때마다 업데이트(실질적으로는 수정일시)
function touchStamp(){
  state.createdAt = new Date().toISOString();
}
function getCurrentQuoteType(){
  const elQt = q("[data-key='quoteType']");
  return String((elQt && elQt.value) || state.quoteType || '').trim();
}

function getCurrentBoxType(){
  // select+custom 구조라 select 값이 더 정확할 수 있어 DOM을 우선 사용
  const sel = q("[data-key='boxType__sel']");
  const vSel = sel ? String(sel.value || '').trim() : '';
  if(vSel && vSel !== '박스형태선택') return vSel;
  return String(state.boxType || '').trim();
}

function isMaterialLenAutoActive(){
  const qt = getCurrentQuoteType();
  const bt = getCurrentBoxType();

  if(qt !== '일반골판지 A형박스') return false;

  const okBox = new Set(['A1형','A1형 2합','A2형(겹날개)','A3형(상외날개)','A3형(하외날개)']);
  return okBox.has(bt);
}

function updateMaterialLenAutoBadge(){
  const badge = document.getElementById('materialLenAutoBadge');
  if(!badge) return;
  badge.style.display = isMaterialLenAutoActive() ? 'inline-flex' : 'none';
}


async function saveStateAsFileWithPicker(){
  const data = JSON.stringify(state, null, 2);
  const suggestedName = `Quote_state_${new Date().toISOString().slice(0,10)}.json`;

  if(window.showSaveFilePicker){
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'Quote JSON',
        accept: {'application/json': ['.json']}
      }]
    });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return true;
  }

  const name = prompt('저장할 파일명을 입력하세요', suggestedName) || suggestedName;
  const blob = new Blob([data], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return false;
}

function buildSharePayload(){
  // 최신 계산값 반영(원하면 recalcLite() 호출해도 됨)
  let res;
  try { res = calculateQuote(); } catch(_) { res = null; }

  const company = String(state.companyName || '').trim() || '-';
  const item = String(state.itemName || '').trim() || '-';
  const qty = Math.round(safe0(state.qty));
  const qtyText = qty > 0 ? qty.toLocaleString('ko-KR') : '-';

  const sellTotal = Math.round(Number(res?.totals?.sellTotal) || 0);
  const unit = (qty > 0) ? Math.round(sellTotal / qty) : 0;

  const title = `견적 공유 - ${company} / ${item}`;

  const lines = [];
  lines.push(`[견적] ${company} / ${item}`);
  lines.push(`수량: ${qtyText}`);
  lines.push(`총금액: ${fmtMoney(sellTotal)}원`);
  lines.push(`개당: ${fmtMoney(unit)}원`);

  // 비용 상위 몇 개만 요약(너무 길어지는 것 방지)
  if(res?.items?.length){
    const top = [...res.items]
      .filter(x => Number(x.amount) > 0)
      .sort((a,b)=>(Number(b.amount)||0)-(Number(a.amount)||0))
      .slice(0, 6);

    if(top.length){
      lines.push('');
      lines.push('상위 비용 항목:');
      for(const it of top){
        lines.push(`- ${it.name}: ${fmtMoney(it.amount)}원`);
      }
    }
  }

  // URL은 http/https일 때만 포함(파일로 열 때 방지)
  const url = (location.protocol === 'http:' || location.protocol === 'https:') ? location.href : '';

  const text = lines.join('\n');

  // 상태 JSON 파일(공유 지원 시 files로 첨부)
  const json = JSON.stringify(state, null, 2);
  const fileName = `Quote_state_${new Date().toISOString().slice(0,10)}.json`;
  const file = new File([json], fileName, { type: 'application/json' });

  return { title, text, url, file };
}


async function copyToClipboardFallback(text){
  // 1) Clipboard API (가능하면)
  try{
    if(window.isSecureContext && navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(String(text ?? ''));
      return true;
    }
  }catch(e){
    // NotAllowedError 포함 → 아래 fallback로 진행
    console.warn('[Clipboard] writeText blocked:', e?.name, e?.message);
  }

  // 2) execCommand fallback
  try{
    const ta = document.createElement('textarea');
    ta.value = String(text ?? '');
    ta.setAttribute('readonly','readonly');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return !!ok;
  }catch(e){
    console.warn('[Clipboard] execCommand failed:', e?.name, e?.message);
    return false;
  }
}

/** =========================
 * Box preview
 * ========================= */
function updateBoxPreview(){
  const labelEl = q('#boxPreviewLabel');
  const imgEl = q('#boxPreviewImg');
  const emptyEl = q('#boxPreviewEmpty');

  if(!labelEl || !imgEl || !emptyEl) return;

  const name = String(state.boxType || '').trim();
  labelEl.textContent = name || '-';

  if(!name || name === '박스형태선택' || name === '직접입력'){
    imgEl.style.display = 'none';
    imgEl.removeAttribute('src');
    emptyEl.style.display = 'block';
    emptyEl.textContent = '박스형태를 선택하면 이미지가 표시됩니다.';
    return;
  }

  const src = BOX_TYPE_IMAGE[name] || '';
  if(!src){
    imgEl.style.display = 'none';
    imgEl.removeAttribute('src');
    emptyEl.style.display = 'block';
    emptyEl.textContent = '등록된 이미지가 없습니다. (관리자: 매핑/파일 추가 필요)';
    return;
  }

  imgEl.alt = `박스형태: ${name}`;
  imgEl.onerror = () => {
    imgEl.style.display = 'none';
    imgEl.removeAttribute('src');
    emptyEl.style.display = 'block';
    emptyEl.textContent = '이미지 파일을 불러오지 못했습니다. (경로/파일명 확인)';
  };
  imgEl.src = src;
  imgEl.style.display = 'block';
  emptyEl.style.display = 'none';
}

/** =========================
 * Header (작성자 프로필 자동표기)
 * ========================= */
function renderHeader(){
  const c = (state.companyName && String(state.companyName).trim()) || '-';
  const p = (state.itemName && String(state.itemName).trim()) || '-';

  const me = getMyProfile();
  const created = formatKoreanDateTime(state.createdAt);

  q('#hdrCompany') && (q('#hdrCompany').textContent = c);
  q('#hdrProduct') && (q('#hdrProduct').textContent = p);

  q('#hdrDept') && (q('#hdrDept').textContent = (me.dept || '-'));
  q('#hdrJobTitle') && (q('#hdrJobTitle').textContent = (me.jobTitle || '-'));
  q('#hdrUserName') && (q('#hdrUserName').textContent = (me.name || '-'));
  q('#hdrCreatedAt') && (q('#hdrCreatedAt').textContent = created);
}

/** =========================
 * Derived calcs
 * ========================= */
function syncPaperCutsToBoxCount(){
  const bc = Math.round(safe0(state.boxCount));
  if(bc <= 0) return;

  if(Math.round(safe0(state.paperCuts)) !== bc){
    state.paperCuts = bc;
    const pc = q("[data-key='paperCuts']");
    if(pc && document.activeElement !== pc) pc.value = String(bc);
  }
}

function calcPaperTotalR(){
  const qty = safe0(state.qty);
  const cuts = safe0(state.paperCuts);
  const spare = safe0(state.lossQty);
  if(qty<=0 || cuts<=0) return 0;
  return ((qty/cuts)/500) + (spare/500);
}

function calcPaperTotalKg(){
  const len = safe0(state.paperSheetLen);
  const wid = safe0(state.paperSheetWid);
  const gsm = safe0(state.gsm);
  const totalR = safe0(state.paperTotalR);
  if(len<=0 || wid<=0 || gsm<=0 || totalR<=0) return 0;

  const kgPerR = (((len/1000) * (wid/1000)) * (gsm/1000)) * 500;
  const raw = kgPerR * totalR;
  const oneDec = Math.round(raw * 10) / 10;
  return Math.round(oneDec);
}

function calcMaterialRealWidMm(){
  const cut = safe0(state.materialCutSpec);
  const cuts = safe0(state.materialCuts);
  if(cut<=0 || cuts<=0) return 0;

  const cor = String(state.corrugatedType || '').trim().toUpperCase();
  const plus10 = new Set(['GF','FF','EF']);
  const add = plus10.has(cor) ? 10 : 20;

  return Math.round((cut * cuts) + add);
}

function calcMaterialWidAuto(){
  const real = safe0(state.materialRealWid);

  if(real <= 0) return { value: 0, text: '0' };
  if(real > 2500) return { value: 0, text: '계산불가' };

  if(real >= 1800){
    const v = ceilTo(real, 100);
    return { value: v, text: String(v) };
  }

  if((real + 20) > 600){
    const v = ceilTo(real, 50);
    return { value: v, text: String(v) };
  }

  return { value: 0, text: '규격확인' };
}

function calcMaterialAreaM2(){
  const len = safe0(state.materialLen);
  const wid = safe0(state.materialWid);
  const cuts = safe0(state.materialCuts);
  if(len<=0 || wid<=0 || cuts<=0) return 0;
  return round2(((len/1000) * (wid/1000)) / cuts);
}

function calcMaterialUnitSheet(){
  const area = safe0(state.materialAreaM2);
  const m2Price = safe0(state.materialM2Price);
  return Math.round(area * m2Price);
}

function calcLossRates(){
  const qty=safe0(state.qty);

  const pCuts=safe0(state.paperCuts);
  const pSpare=Math.max(0, safe0(state.lossQty));
  const pNeed=(qty>0 && pCuts>0)?(qty/pCuts):0;
  state.lossRate1 = (pNeed>0)?(pSpare/pNeed)*100:0;

  // ✅ 원단로스율(%): (박스개수 * 원단절수 * 원단지폭 여유수량) / 박스수량 * 100
  const boxCount = safe0(state.boxCount);
  const mCuts = safe0(state.materialCuts);
  const mSpare = safe0(state.materialSpareQty);
  const numerator = (boxCount > 0 && mCuts > 0 && mSpare > 0) ? (boxCount * mCuts * mSpare) : 0;
  state.lossRate2 = (qty > 0) ? (numerator / qty) * 100 : 0;

  if(!isFinite(state.lossRate1)) state.lossRate1=0;
  if(!isFinite(state.lossRate2)) state.lossRate2=0;
}

function calcDerived(){
  state.paperTotalR = calcPaperTotalR();
  state.paperTotalKg = calcPaperTotalKg();

  state.materialRealWid = calcMaterialRealWidMm();
  const mw = calcMaterialWidAuto();
  state.materialWid = mw.value;
  state.materialWidText = mw.text;

  state.materialAreaM2 = calcMaterialAreaM2();
  state.materialUnitSheet = calcMaterialUnitSheet();
}

function applyMaterialLenAuto(){
  if(isBoxTypeDirectInputMode()) return;
  const qt = String(state.quoteType || '').trim();

  // 입력 엘리먼트
  const elLen = q("[data-key='materialLen']");

  // 자동계산 모드 여부(이미 구현해둔 함수 재사용)
  const autoActive = (typeof isMaterialLenAutoActive === 'function')
    ? isMaterialLenAutoActive()
    : (qt === '일반골판지 A형박스');

  // 내부 플래그(자동이었는지 추적)
  if(state.__materialLenAuto == null) state.__materialLenAuto = false;

  // -------------------------
  // 자동계산 모드가 아닐 때
  // -------------------------
  if(!autoActive){
    // ✅ 견적타입이 A형박스가 아니면: 원단 장(mm)=0으로 리셋 + 직접입력 가능
    if(qt !== '일반골판지 A형박스'){
      if(state.__materialLenAuto) state.materialLen = 0;  // A에서 넘어온 값이면 1회 리셋
      if(state.materialLen == null || state.materialLen === '') state.materialLen = 0;
      state.materialLen = Math.round(safe0(state.materialLen));

      if(elLen){
        elLen.readOnly = false;
        if(document.activeElement !== elLen) elLen.value = String(state.materialLen);
      }

      state.__materialLenAuto = false;
      return;
    }

    // ✅ 견적타입은 A형박스지만(예: 박스형태가 대상이 아닐 때) 자동계산이 비활성이라면: 값 유지 + 직접입력
    state.materialLen = Math.round(safe0(state.materialLen));
    if(elLen){
      elLen.readOnly = false;
      if(document.activeElement !== elLen) elLen.value = String(state.materialLen);
    }
    state.__materialLenAuto = false;
    return;
  }

  const L = safe0(state.innerLength);
  const W = safe0(state.innerWidth);
  
  let autoLen = 0;
  if(L > 0 && W > 0){
    const bt = getBoxTypeValue(); // 이미 위에 정의된 헬퍼 사용
    if(bt === 'A1형 2합'){
      autoLen = Math.round((L + W) + 40);        // ✅ 요청식
    }else{
      autoLen = Math.round(((L + W) * 2) + 40);  // 기존식 유지
    }
  }
    // ✅ 계산값을 state/UI에 반영 (이게 빠져서 0으로 남았던 것)
    state.materialLen = autoLen;
    state.__materialLenAuto = true;
  
    if(elLen){
      elLen.readOnly = true;
      elLen.value = String(autoLen);
    }
}


function applyMaterialCutSpecAuto(){
  if(isBoxTypeDirectInputMode()){
    const el = q("[data-key='materialCutSpec']");
    if(el) el.readOnly = false;
    return;
  }
  const qt = String(state.quoteType || '').trim();
  const el = q("[data-key='materialCutSpec']");
  const isA = (qt === '일반골판지 A형박스');

  // 내부 플래그(필드에는 없지만 state에 저장해서 "자동값이었는지"만 추적)
  if(state.__materialCutSpecAuto == null) state.__materialCutSpecAuto = false;

  if(isA){
    // ✅ A형박스: 재단폭 = 윗날개 + 박스높이 + 아래날개 (자동, 정수, readonly)
    const top = Math.round(safe0(state.materialTopNail));
    const h   = Math.round(safe0(state.materialHeight));   // applyBoxHeightAuto 결과(=고(내측))
    const bot = Math.round(safe0(state.materialBottomNail));
    const v = Math.round(top + h + bot);

    state.materialCutSpec = v;
    state.__materialCutSpecAuto = true;

    if(el){
      el.value = String(v);
      el.readOnly = true;
    }
    return;
  }

  // ✅ 비 A형박스: "0으로 표시" + "직접입력 가능"
  // 단, 사용자가 입력한 값은 recalc 때 덮어쓰지 않도록 함

  // A형박스에서 넘어온 직후(자동이었던 값)에는 1회 0으로 리셋
  if(state.__materialCutSpecAuto){
    state.materialCutSpec = 0;
  }

  // 값이 비정상이면 0으로 보정
  if(!isFinite(Number(state.materialCutSpec))){
    state.materialCutSpec = 0;
  }

  state.__materialCutSpecAuto = false;

  if(el){
    el.readOnly = false;

    // 사용자가 지금 입력 중이면 건드리지 않음
    if(document.activeElement !== el){
      el.value = String(Math.round(safe0(state.materialCutSpec)));
    }
  }
}



/** =========================
 * Shipping (REF_SAMPLE['운송비참조'])
 * ========================= */
function shipTable(){ return (window.REF_SAMPLE||{})['운송비참조']; }

function normalizeRegionName(r){
  const t=String(r||'').trim();
  if(!t) return '';
  if(t.includes('경기') || t==='경기') return '경기도';
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
function normalizeTruckName(truck){
  const t=String(truck||'').trim();
  if(t==='3.5광폭') return '3.5광폭';        // 엑셀 헤더 그대로
  if(t==='3.5톤 광폭') return '3.5광폭';     // ✅ 앱 옵션 -> 엑셀 헤더로 변환

  if(t==='5톤윙') return '5톤(윙)';
  if(t==='5톤(윙)') return '5톤(윙)';

  return t;
}
function normalizeShippingTableValue(v){
  const n=Number(v);
  if(!isFinite(n) || n<=0) return 0;
  if(n>=1000) return Math.round(n);
  return Math.round(n*10000);
}
function getShipRegionOptions(){
  const tbl=shipTable();
  if(!tbl || !Array.isArray(tbl.rows)) return [];
  const set=new Set(tbl.rows.map(r=>String(r[0]||'').trim()).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'ko-KR'));
}
function splitShipDrops(cell){
  // "가평/양평/강촌" -> ["가평","양평","강촌"]
  // 혹시 구분자가 섞여도 대비
  return String(cell||'')
    .split(/[\/,，·]/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function getShipDropOptions(){
  const tbl=shipTable();
  if(!tbl || !Array.isArray(tbl.rows)) return [];

  const region=normalizeRegionName(state.shipRegion);
  const set=new Set();

  for(const r of tbl.rows){
    if(String(r[0]||'').trim() !== region) continue;
    const cell = String(r[1]||'').trim();
    if(!cell) continue;

    for(const d of splitShipDrops(cell)){
      set.add(d);
    }
  }

  return Array.from(set).sort((a,b)=>a.localeCompare(b,'ko-KR'));
}

function lookupBaseShippingAuto(){
  const tbl=shipTable();
  if(!tbl || !Array.isArray(tbl.rows) || !Array.isArray(tbl.head)) return 0;

  const region = normalizeRegionName(state.shipRegion);
  const drop = String(state.shipDrop||'').trim();
  const truck = normalizeTruckName(state.shipTruck);

  if(!region || !drop || !truck) return 0;

  const col = tbl.head.indexOf(truck);
  if(col < 0) return 0;

  for(const row of tbl.rows){
    const rr=String(row[0]||'').trim();
    const rd=String(row[1]||'').trim();
    if(rr===region && rd===drop) return normalizeShippingTableValue(row[col]);
  }

  // ✅ 세분화 선택(예: "가평")을 묶음 셀(예: "가평/양평/강촌")에 우선 매칭
  for(const row of tbl.rows){
    const rr=String(row[0]||'').trim();
    const rd=String(row[1]||'').trim();
    if(rr!==region) continue;
    if(!rd) continue;

    // "rd"를 split해서 정확 토큰 매칭(오탐 줄이기)
    const tokens = splitShipDrops(rd);
    if(tokens.includes(drop)) return normalizeShippingTableValue(row[col]);
  }

  for(const row of tbl.rows){
    const rr=String(row[0]||'').trim();
    const rd=String(row[1]||'').trim();
    if(rr!==region) continue;
    if(!rd) continue;
    if(drop.includes(rd) || rd.includes(drop)) return normalizeShippingTableValue(row[col]);
  }
  for(const row of tbl.rows){
    const rr=String(row[0]||'').trim();
    if(rr===region) return normalizeShippingTableValue(row[col]);
  }
  return 0;
}
function manualUnloadExtraFee(truck){
  const t=normalizeTruckName(truck);
  if(!t) return 0;
  if(t==='다마스') return 0;
  if(t==='라보' || t==='1톤' || t==='1.4톤') return 20000;
  if(t==='2.5톤' || t==='3.5톤' || t==='3.5톤 광폭') return 40000;
  if(t==='5톤' || t==='5톤플') return 60000;
  if(t==='11톤') return 80000;
  return 0;
}
function calcShipping(){
    // ✅ 운송비 미포함이면 전부 0 처리
    if(String(state.shipIncludeMode || '포함').trim() === '미포함'){
      state.shipBaseAuto = 0;
      state.shipManualExtra = 0;
      state.shipTotal = 0;
      return 0;
    }
  const baseInput = Math.max(0, Number(state.shipBaseInput)||0);
  const baseAuto = lookupBaseShippingAuto();

  state.shipBaseAuto = (baseInput > 0) ? 0 : baseAuto;
  const baseUsed = (baseInput > 0) ? baseInput : baseAuto;

  const manualExtra = (String(state.manualUnload||'')==='예') ? manualUnloadExtraFee(state.shipTruck) : 0;
  state.shipManualExtra = manualExtra;

  const specialExtra = Number(state.shipSpecialExtra) || 0; // 음수 허용
  const cnt = Math.max(1, Math.round(safe0(state.shipTruckCount))); // 최소 1대

  state.shipTotal = (baseUsed + manualExtra + specialExtra) * cnt;
  return state.shipTotal;
}

/** =========================
 * Costs
 * ========================= */
function calcPaperCost(){
  return Math.round(safe0(state.paperTotalKg) * safe0(state.paperKgPrice));
}

// 원단: 원단단가(1장) x ((박스수량/박스개수)+(원단지폭 여유수량 * 원단절수))
function calcMaterialCost(){
  const qty = safe0(state.qty);
  const boxCount = Math.max(1, safe0(state.boxCount));
  const spare = safe0(state.materialSpareQty);
  const cuts = safe0(state.materialCuts);
  const unit = safe0(state.materialUnitSheet);

  if(unit<=0) return 0;
  const sheets = (qty / boxCount) + (spare * cuts);
  if(!isFinite(sheets) || sheets<=0) return 0;

  return Math.round(unit * sheets);
}

function calcPrintCost(){
  const colors = safe0(state.printColors);
  const unit = safe0(state.printUnitPrice);
  const qty = safe0(state.qty);
  const cuts = safe0(state.paperCuts);
  if(colors<=0 || unit<=0 || qty<=0 || cuts<=0) return 0;
  return Math.round((colors * unit) * ((qty/cuts)/500));
}

function paperAreaM2_round2(){
  const len = safe0(state.paperSheetLen);
  const wid = safe0(state.paperSheetWid);
  if(len<=0 || wid<=0) return 0;
  return round2((len/1000) * (wid/1000));
}

function calcCoatingCost(){
  const area = paperAreaM2_round2();
  const unit = safe0(state.coatingUnitPrice);
  const qty = safe0(state.qty);
  const cuts = safe0(state.paperCuts);
  if(area<=0 || unit<=0 || qty<=0 || cuts<=0) return 0;
  return Math.round(area * unit * (qty/cuts));
}

function calcLaminationCost(){
  const area = paperAreaM2_round2();
  const unit = safe0(state.laminationUnitPrice);
  const qty = safe0(state.qty);
  const cuts = safe0(state.paperCuts);
  if(area<=0 || unit<=0 || qty<=0 || cuts<=0) return 0;
  return Math.round(area * unit * (qty/cuts));
}

// 톰슨: 단가 = (1통/박스개수), 금액 = 박스수량*단가
function calcThomsonCost(){
  const unit = safe0(state.thomsonUnitPrice);
  const qty = safe0(state.qty);
  const bc = Math.max(1, Math.round(safe0(state.boxCount)));
  if(unit<=0 || qty<=0) return 0;
  return Math.round(qty * (unit / bc));
}

// 실크인쇄: 단가 = (1통/박스개수), 금액 = 박스수량*단가
function calcMaterialSilkCost(){
  const unit = safe0(state.silkPrintingUnitPrice);
  const qty = safe0(state.qty);
  const bc = Math.max(1, Math.round(safe0(state.boxCount)));
  if(unit<=0 || qty<=0) return 0;
  return Math.round(qty * (unit / bc));
}

// 형압: 단가 = (1통/박스개수), 금액 = 박스수량*단가
function calcEmbossCost(){
  const unit = safe0(state.embossUnitPrice);
  const qty = safe0(state.qty);
  const bc = Math.max(1, Math.round(safe0(state.boxCount)));
  if(unit<=0 || qty<=0) return 0;
  return Math.round(qty * (unit / bc));
}

// 박인쇄: 단가 = (1통/박스개수), 금액 = 박스수량*단가
function calcStampingCost(){
  const unit = safe0(state.stampingUnitPrice);
  const qty = safe0(state.qty);
  const bc = Math.max(1, Math.round(safe0(state.boxCount)));
  if(unit<=0 || qty<=0) return 0;
  return Math.round(qty * (unit / bc));
}

function calcWindowAttachCost(){
  return Math.round(safe0(state.qty) * safe0(state.windowAttachUnitPrice));
}

function calcAdhesiveCost(){
  return Math.round(safe0(state.qty) * safe0(state.adhesiveUnitPrice));
}

function calcStapleCost(){
  return Math.round((safe0(state.stapleCount) * safe0(state.stapleUnitPrice)) * safe0(state.qty));
}

function calcHandleCost(){
  return Math.round(safe0(state.handleUnitPrice) * safe0(state.qty));
}

function calcFlexoPrintCost(){
  const qty = safe0(state.qty);
  const areaM2 = safe0(state.materialAreaM2);        // ✅ 이미 계산되어 state에 있음(스크린샷 0.43m²)
  const unitPriceM2 = safe0(state.flexoUnitPriceM2); // 인쇄단가(1m²)

  if(qty<=0 || areaM2<=0 || unitPriceM2<=0) return 0;

  const unit = unitPriceM2 * areaM2;   // 단가(원) = 인쇄단가(1m²) × 원단면적(m²)
  return Math.round(qty * unit);       // 금액(원) = 수량 × 단가(원)
}

function formatDegree(v) {
  if (v == null || Number.isNaN(v)) return '-';
  return Number(v).toFixed(1).replace(/\.0$/, '');
}

function calcFlexoDiecutterCost(){
  const qty = safe0(state.qty);
  const unit = safe0(state.flexoDiecutterUnitPrice); // 다이커터단가(원/개)로 사용
  if(qty<=0 || unit<=0) return 0;
  return Math.round(qty * unit);
}


/** =========================
 * Quote calculation + grouping
 * ========================= */
function addItem(items, it){
  if(!it || typeof it !== 'object') return;

  // amount 정규화
  const amount = Math.round(Number(it.amount) || 0);
  if(amount === 0 && !it.force) return; // 0원 숨김 기본 규칙

  // basis 정규화: 함수면 실행, 결과가 falsy면 '-' 처리
  let basis = it.basis;
  if(typeof basis === 'function'){
    try { basis = basis(); } catch(e){ basis = '-'; }
  }
  basis = _nz(basis).trim();
  if(!basis) basis = '-';

  const row = {
    group: it.group || 'ETC',
    name : it.name  || '(항목명 누락)',
    qty  : it.qty ?? '',       // 렌더가 기대하면 유지
    unit : it.unit ?? '',
    sort : it.sort ?? 9999,
    basis,
    amount,
    force: !!it.force,
  };

  items.push(row);
}


function sumGroup(items, g){
  return items.filter(x=>x.group===g).reduce((a,b)=>a+(Number(b.amount)||0),0);
}

function ratioItemName(raw){
  const s = String(raw||'').trim();
  if(s.startsWith('플렉소인쇄')) return '플렉소인쇄';
  if(s.startsWith('플렉소 다이커터') || s.startsWith('플렉소다이커터')) return '플렉소 다이커터';
  if(s.startsWith('인쇄(')) return '인쇄';
  if(s.startsWith('코팅(') || s==='코팅') return '코팅';
  if(s.startsWith('접착(') || s==='접착') return '접착';
  if(s.startsWith('형압(') || s==='형압') return '형압';
  if(s.startsWith('박인쇄(') || s==='박인쇄') return '박인쇄';
  if(s.startsWith('견철(') || s==='견철') return '견철';
  if(s.startsWith('팔레트(') || s==='팔레트') return '팔레트';
  if(s.startsWith('손잡이(') || s==='손잡이') return '손잡이';
  return s;
}

const GROUP_LABEL = {
  MATERIAL: '직접재료비',
  PROCESSING: '가공비',
  SHIPPING: '운송비',
  MGMT: '관리비',
  PROFIT: '이윤',
  DEV: '개발비',
};
const GROUP_ORDER = ['MATERIAL','PROCESSING','SHIPPING','MGMT','PROFIT','DEV'];

function calculateQuote(){
  const items=[];

  // 직접재료비
  addItem(items,{group:'MATERIAL',name:'용지',amount: calcPaperCost(),basis: basisPaper(),sort: 10});
  addItem(items,{group:'MATERIAL',name:'원단',amount:calcMaterialCost(),basis:basisMaterial(),sort:20});

  // 가공비
  addItem(items,{group:'PROCESSING',name:'플렉소인쇄',amount: calcFlexoPrintCost(),basis: basisFlexoPrint(),sort: 108});
  addItem(items,{group:'PROCESSING',name:'플렉소 다이커터',amount: calcFlexoDiecutterCost(),basis: basisFlexoDiecutter(),sort: 109});
  addItem(items,{group:'PROCESSING',name:'CTP',amount:safe0(state.ctpPlates)*safe0(state.ctpUnitPrice),basis:basisCTP(),sort:110});
  addItem(items,{group:'PROCESSING',name:'인쇄',amount:calcPrintCost(),basis:basisPrint(),sort:115});

  // 코팅(선택 시, 0원이어도 표시)
const coatName = String(state.coatingType || '').trim();
const coatSelected = coatName && coatName !== '코팅종류선택' && coatName !== '직접입력';

if(coatSelected){
  addItem(items,{
    group:'PROCESSING',
    name:`코팅(${coatName})`,
    amount: calcCoatingCost(),
    basis: `${coatName} x ${fmtMoney(state.coatingUnitPrice||0)}원/m²`,
    sort: 116,
    // force: true/false 는 취향(0원 숨김이면 빼기)
  });
}

  // 실크인쇄
   // 실크인쇄 (입력값 0이면 숨김)
   if(safe0(state.silkPrintingUnitPrice) > 0){
    addItem(items,{
      group:'PROCESSING',
      name:'실크인쇄',
      amount: calcMaterialSilkCost(),  // addItem이 0원이면 자동 숨김
      basis: basisSilk(),
      sort: 125
    });
  }


  // 형압 (실크인쇄 밑)
  const embossType = String(state.embossType||'').trim() || '-';
  if(safe0(state.embossUnitPrice) > 0){
    addItem(items,{
      group:'PROCESSING',
      name:`형압(${embossType})`,
      amount: calcEmbossCost(),
      basis: basisEmboss(),
      sort: 126,
      force: true
    });
  }

  // 박인쇄 (형압 밑)
  const stampType = String(state.stampingType||'').trim();
  const stampSelected = stampType && stampType !== '박인쇄종류선택' && stampType !== '직접입력';
  if(stampSelected || safe0(state.stampingUnitPrice) > 0){
    addItem(items,{
      group:'PROCESSING',
      name:`박인쇄(${stampType || '-'})`,
      amount: calcStampingCost(),
      basis: basisStamping(),
      sort: 127,
      force: true
    });
  }

  // 합지/톰슨/창문접착 (요청 순서: 합지 밑 톰슨, 그 밑 창문접착)
  addItem(items,{group:'PROCESSING',name:'합지',amount:calcLaminationCost(),basis:basisAreaUnit('합지', state.laminationUnitPrice),sort:150});
    // 톰슨 (입력값 0이면 숨김)
    if(safe0(state.thomsonUnitPrice) > 0){
      addItem(items,{
        group:'PROCESSING',
        name:'톰슨',
        amount: calcThomsonCost(),   // addItem이 0원이면 자동 숨김
        basis: basisThomson(),
        sort: 151
      });
    }
  
  addItem(items,{group:'PROCESSING',name:'창문접착',amount:calcWindowAttachCost(),basis:basisWindow(),sort:152});

  addItem(items,{group:'PROCESSING',name:'접착',amount:calcAdhesiveCost(),basis:basisAdhesive(),sort:165});
  addItem(items,{group:'PROCESSING',name:'견철',amount:calcStapleCost(),basis:basisStaple(),sort:170});
  addItem(items,{group:'PROCESSING',name:'팔레트',amount:safe0(state.palletUnitPrice),sort:175});
  addItem(items,{group:'PROCESSING',name:'손잡이',amount:calcHandleCost(),sort:190});

  // 운송
  addItem(items,{group:'SHIPPING',name:'운송비',amount:safe0(state.shipTotal),basis:basisShipping(),sort:310});

  // 개발비
  ensureDevItems();
  (state.devItems||[]).forEach((d,idx)=>{
    const name=(String(d?.name||'').trim()||'개발비');
    addItem(items,{group:'DEV',name,amount:safe0(d?.amount),sort:800+idx});
  });

  // 관리비/이윤
  const base = sumGroup(items,'MATERIAL') + sumGroup(items,'PROCESSING') + sumGroup(items,'SHIPPING');
  const devSum = sumGroup(items,'DEV');

  const mgmtAmount = Math.round(base * (safe0(state.mgmtRatePct)/100));
  const profitAmount = Math.round(base * (safe0(state.profitRatePct)/100));

  addItem(items,{group:'MGMT',name:'관리비',amount:mgmtAmount,sort:900});
  addItem(items,{group:'PROFIT',name:'이윤',amount:profitAmount,sort:910});

  const sellTotal = Math.round(base + mgmtAmount + profitAmount + devSum);

  // 정렬
  const idxMap = new Map(GROUP_ORDER.map((g,i)=>[g,i]));
  items.sort((a,b)=>{
    const ga = idxMap.has(a.group) ? idxMap.get(a.group) : 999;
    const gb = idxMap.has(b.group) ? idxMap.get(b.group) : 999;
    if(ga!==gb) return ga-gb;
    return (a.sort||0)-(b.sort||0);
  });

  return { items, totals:{ base, mgmtAmount, profitAmount, devSum, sellTotal } };

  // ---- basis helpers (표시 문자열) ----
  function n0(x){ return Math.round(safe0(x)); }
  function money(x){ return fmtMoney(Math.round(safe0(x))); }

  function basisPaper(){
    const type = String(state.paperType||'').trim() || '-';
    const gsm = n0(state.gsm);
    const L = n0(state.paperSheetLen);
    const W = n0(state.paperSheetWid);
    const totalKg = n0(state.paperTotalKg);
    const kgPrice = n0(state.paperKgPrice);
  
    // ✅ 용지 할인율(%) 표시
    const disc = Math.round(safe0(state.paperDiscount)); // FIELD_DEFS key: paperDiscount (percent-int)
    const discText = `, ${disc}%`;
  
    return `${type} ${gsm}, ${L}mm x ${W}mm, ${totalKg}kg x ${kgPrice}원${discText} 할인적용`;
  }
  

  function basisMaterial(){
    const len = n0(state.materialLen);
    const cutW = n0(state.materialCutSpec);
    const unitSheet = n0(state.materialUnitSheet);

    const qty = safe0(state.qty);
    const boxCount = Math.max(1, safe0(state.boxCount));
    const spare = safe0(state.materialSpareQty);
    const cuts = safe0(state.materialCuts);

    const usedSheets = Math.round((qty / boxCount) + (spare * cuts));
    return `${len}mm x ${cutW}mm = ${unitSheet}원 x ${usedSheets}개`;
  }

  function basisFlexoPrint(){
    const pressType = String(state.flexoPressType||'').trim() || '-';
    const colors = Math.round(safe0(state.flexoPrintColors));  // ✅ 정수 표기
    const colorInfo = String(state.flexoColorInfo||'').trim();

    const qty = n0(state.qty);
    const areaM2 = Number(state.materialAreaM2)||0;
    const unitPriceM2 = n0(state.flexoUnitPriceM2);

    const unit = Math.round(unitPriceM2 * areaM2);
    const amount = Math.round(qty * unit);

    const colorPart = colorInfo ? `, 색상정보 "${colorInfo}"` : '';

    return `"${pressType}", ${colors}도, `
      + `인쇄단가(1m²) ${money(unitPriceM2)} × 원단면적(m²) ${areaM2.toFixed(2)}`;
  }

  function basisFlexoDiecutter(){
    const die = String(state.flexoDiecutter||'').trim() || '-';
    const unitPrice = n0(state.flexoDiecutterUnitPrice);
    const qty = n0(state.qty);
    const amount = Math.round(qty * unitPrice);
    return `"${die}", 단가 ${money(unitPrice)} × 수량 ${qty} = ${money(amount)}`;
  }
  
  


  function basisCTP(){
    return `CTP: ${n0(state.ctpPlates)}판 × ${money(state.ctpUnitPrice)}원/판`;
  }

  function basisPrint(){
    const pressType = String(state.pressType || '').trim() || '-';
    const colors = (Number(state.printColors)||0).toFixed(1);
    const unit = money(state.printUnitPrice);
    const R = (safe0(state.qty) > 0 && safe0(state.paperCuts) > 0)
      ? (safe0(state.qty)/safe0(state.paperCuts)/500)
      : 0;
    return `인쇄기 ${pressType}, 적용도수 ${colors} × ${unit}원/R × ${R.toFixed(2)}R`;
  }

  function basisAreaUnit(label, unitPrice){
    const L = n0(state.paperSheetLen);
    const W = n0(state.paperSheetWid);
    return `${label}: ${L}×${W}mm × ${money(unitPrice)}원/m²`;
  }

  function basisSilk(){
    const unit = n0(state.silkPrintingUnitPrice);
    const bc = Math.max(1, n0(state.boxCount));
    const unitPerBox = Math.round(unit / bc);
    return `실크인쇄: ${money(unit)}원/통 ÷ 박스개수 ${bc} (= ${money(unitPerBox)}원)`;
  }

  function basisEmboss(){
    const type = String(state.embossType||'').trim() || '-';
    const unit = n0(state.embossUnitPrice);
    const bc = Math.max(1, n0(state.boxCount));
    const unitPerBox = Math.round(unit / bc);
    return `형압 ${type}: ${money(unit)}원/통 ÷ 박스개수 ${bc} (= ${money(unitPerBox)}원)`;
  }

  function basisStamping(){
    const type = String(state.stampingType||'').trim() || '-';
    const unit = n0(state.stampingUnitPrice);
    const bc = Math.max(1, n0(state.boxCount));
    const unitPerBox = Math.round(unit / bc);
    return `박인쇄 ${type}: ${money(unit)}원/통 ÷ 박스개수 ${bc} (= ${money(unitPerBox)}원)`;
  }

  function basisWindow(){
    return `창문접착: ${money(state.windowAttachUnitPrice)}원/개당`;
  }

  function basisThomson(){
    const unit = n0(state.thomsonUnitPrice);
    const bc = Math.max(1, n0(state.boxCount));
    const unitPerBox = Math.round(unit / bc);
    return `톰슨: ${money(unit)}원/통 ÷ 박스개수 ${bc} (= ${money(unitPerBox)}원)`;
  }

  function basisAdhesive(){
    return `접착: ${money(state.adhesiveUnitPrice)}원/개당`;
  }

  function basisStaple(){
    return `견철: ${money(state.stapleUnitPrice)}원/방 × ${n0(state.stapleCount)}방`;
  }

  function basisShipping(){
    const region = String(state.shipRegion||'').trim() || '-';
    const drop = String(state.shipDrop||'').trim() || '-';
    const truck = String(state.shipTruck||'').trim() || '-';
    const cnt = Math.max(1, n0(state.shipTruckCount||1));
    const manual = (String(state.manualUnload||'') === '예') ? ', 수작업하차' : '';
    return `운송: ${region}, ${drop}, ${truck}, 차량대수 ${cnt}대${manual}`;
  }
}

/** =========================
 * Render inputs
 * ========================= */
function fieldMatchesFilter(f, needle){
  if(!needle) return true;
  const t=needle.toLowerCase();
  return String(f.label||'').toLowerCase().includes(t) ||
         String(f.key||'').toLowerCase().includes(t) ||
         String(f.group||'').toLowerCase().includes(t);
}
function getGroupHost(group){ return q(`#group_${group}`); }

function renderFieldControl(f){
  if(f.type === 'float1'){
    const i = el('input',{type:'text','data-key':f.key,inputmode:'decimal',placeholder:'0.0'});
    const v = Number(state[f.key] ?? f.default ?? 0);
    i.value = (isFinite(v) ? v.toFixed(1) : '0.0');

    i.addEventListener('input', onFieldInput);
    i.addEventListener('blur', ()=>{
      const n=Math.round(toNumLoose(i.value));
      if(f.key === 'materialCuts'){
        if(!isFinite(n)) n = 1;
        n = Math.max(1, Math.min(4, n));
      }

      if(f.type === 'mm-f1'){
        const i = el('input',{type:'text','data-key':f.key,inputmode:'decimal',placeholder:'0 또는 0.0'});
    
        const formatMm1 = (n)=>{
          if(!isFinite(n)) return '';
          const r = Math.round(n * 10) / 10;
          // 정수면 ".0" 없이 표시, 소수면 1자리 표시
          return (Math.abs(r - Math.round(r)) < 1e-9) ? String(Math.round(r)) : r.toFixed(1);
        };
    
        const v0 = (state[f.key] == null || state[f.key] === '') ? '' : Number(state[f.key]);
        i.value = (v0 === '' ? '' : formatMm1(v0));
    
        i.addEventListener('input', onFieldInput);
    
        i.addEventListener('blur', ()=>{
          const n = toNumLoose(i.value);
          const v1 = Math.round(n * 10) / 10;   // ✅ 소수 1자리로 고정 저장
          state[f.key] = v1;
          i.value = formatMm1(v1);
          touchStamp();
          recalc();
          scheduleAutosave();
        });
    
        return i;
      }    
    
      state[f.key]=n;
      i.value = (i.value.trim()===''?'':String(n));
      touchStamp();
      recalc(); scheduleAutosave();

   
    });
    
    return i;
  }

  if(f.type==='readonly-money'){
    const i=el('input',{type:'text',readonly:'readonly','data-key':f.key});
    i.value = fmtMoney(state[f.key] ?? 0);
    return i;
  }

  if(f.type==='readonly-text' || f.readOnly){
    const i=el('input',{type:'text',readonly:'readonly','data-key':f.key});

    if(f.key==='createdAt') i.value = formatKoreanDateTime(state.createdAt);
    else if(f.key==='lossRate1') i.value = pctText(safe0(state.lossRate1));
    else if(f.key==='lossRate2') i.value = pctText(safe0(state.lossRate2));
    else if(f.key==='paperTotalR') i.value = (safe0(state.paperTotalR)>0 ? (Number(state.paperTotalR)).toFixed(2)+' R' : '0');
    else if(f.key==='paperTotalKg') i.value = (safe0(state.paperTotalKg)>0 ? String(Math.round(state.paperTotalKg))+' kg' : '0');
    else if(f.key==='materialAreaM2') i.value = (safe0(state.materialAreaM2)>0 ? (Number(state.materialAreaM2)).toFixed(2)+' m²' : '0');
    else if(f.key==='materialRealWid') i.value = (safe0(state.materialRealWid)>0 ? String(Math.round(state.materialRealWid)) : '0');
    else if(f.key==='materialWid') i.value = (state.materialWidText ?? '0');
    else i.value = String(state[f.key] ?? '');

    return i;
  }

  if(f.type==='select'){
    const s=el('select', {'data-key':f.key});
    for(const opt of (f.options||[])) s.appendChild(el('option',{value:opt},opt));
    s.value = (state[f.key] ?? f.default ?? '');
    s.addEventListener('input', onFieldInput);
    return s;
  }

  if(f.type==='select+custom'){
    const wrap=el('div',{style:'display:grid;grid-template-columns:1fr;gap:6px;'});
    const sel=el('select', {'data-key': f.key+'__sel'});
    for(const opt of (f.options||[])) sel.appendChild(el('option',{value:opt},opt));
    const inp=el('input',{type:'text', placeholder:f.placeholder||'', 'data-key':f.key});
    const placeholder=f.placeholder || (f.options?f.options[0]:'');
    const customLabel=f.customLabel || '직접입력';
    const current=String(state[f.key] ?? '');
    

    if(!current){
      sel.value=placeholder; inp.value=''; inp.disabled=true;
    }else if((f.options||[]).includes(current) && current!==customLabel && current!==placeholder){
      sel.value=current; inp.value=current; inp.disabled=true;
    }else{
      sel.value=customLabel; inp.value=current; inp.disabled=false;
    }

    sel.addEventListener('change', ()=>{
      if(sel.value===placeholder){
        inp.value=''; inp.disabled=true; state[f.key]='';
    
        // ✅ 코팅종류: 선택 해제 시 단가도 0
        if(f.key === 'coatingType') setCoatingUnitPriceValue(0);
    
        touchStamp(); recalc(); scheduleAutosave();
        return;
      }
    
      if(sel.value===customLabel){
        inp.disabled=false; inp.value=''; state[f.key]='';
        inp.focus();
    
        // ✅ 코팅종류 직접입력: 단가 0으로 초기화(직접 수정 가능)
        if(f.key === 'coatingType') setCoatingUnitPriceValue(0);
    
        touchStamp(); recalc(); scheduleAutosave();
        return;
      }
    
      // 일반 선택
      inp.disabled=true;
      inp.value=sel.value;
      state[f.key]=sel.value;
    
      // ✅ 코팅종류면 참조표 단가 자동 입력
      if(f.key === 'coatingType'){
        const p = lookupCoatingUnitPriceByType(sel.value);
        if(p != null) setCoatingUnitPriceValue(p);
      }
    
      touchStamp(); recalc(); scheduleAutosave();
    });
    

    inp.addEventListener('input', ()=>{
      if(sel.value===customLabel){
        state[f.key]=inp.value;
        touchStamp();
        recalc();
        scheduleAutosave();
      }
    });

    wrap.appendChild(sel); wrap.appendChild(inp);
    return wrap;
  }

  if(f.type==='datalist'){
    const wrap=el('div',{style:'display:grid;grid-template-columns:1fr;gap:6px;'});
    const listId = `dl_${f.key}`;
    const input = el('input',{type:'text','data-key':f.key,placeholder:f.placeholder||'',list:listId});
    input.value = String(state[f.key] ?? '');
    input.addEventListener('input', onFieldInput);

    const dl = el('datalist',{id:listId});
    const opts = (f.key==='shipRegion') ? getShipRegionOptions()
               : (f.key==='shipDrop') ? getShipDropOptions()
               : [];
    for(const o of opts) dl.appendChild(el('option',{value:o}));

    wrap.appendChild(input);
    wrap.appendChild(dl);
    return wrap;
  }

  if(f.type==='percent-int'){
    const i=el('input',{type:'text','data-key':f.key,inputmode:'numeric',placeholder:'0%'});
    const v = Math.round(Number(state[f.key] ?? f.default ?? 0) || 0);
    i.value = v + '%';
    i.addEventListener('focus', ()=>{ i.value = String(Math.round(parsePercentLoose(i.value))); try{i.select();}catch(_){ } });
    i.addEventListener('input', ()=>{
      state[f.key]=Math.round(parsePercentLoose(i.value));
      touchStamp();
      recalc(); scheduleAutosave();
    });
    i.addEventListener('blur', ()=>{ i.value = (Math.round(Number(state[f.key]||0)) + '%'); });
    return i;
  }

  if(f.type==='percent'){
    const i=el('input',{type:'text','data-key':f.key,inputmode:'decimal',placeholder:'0.00%'});
    const v=Number(state[f.key] ?? f.default ?? 0) || 0;
    i.value = v.toFixed(2) + '%';
    i.addEventListener('focus', ()=>{ i.value = parsePercentLoose(i.value).toFixed(2); try{i.select();}catch(_){ } });
    i.addEventListener('input', ()=>{
      state[f.key]=parsePercentLoose(i.value);
      touchStamp();
      recalc(); scheduleAutosave();
    });
    i.addEventListener('blur', ()=>{ i.value = (Number(state[f.key]||0)).toFixed(2)+'%'; });
    return i;
  }

  if(f.type==='money'){
    const im = (f.key === 'shipSpecialExtra') ? 'decimal' : 'numeric';
    const i=el('input',{type:'text','data-key':f.key,inputmode:im,placeholder:'0'});

    i.value = fmtMoney(Number(state[f.key] ?? f.default ?? 0));
    i.addEventListener('focus', ()=>{ i.value=String(Math.round(toNumLoose(i.value))); try{i.select();}catch(_){ } });
    i.addEventListener('input', ()=>{
      state[f.key]=toNumLoose(i.value);
      touchStamp();
      recalc(); scheduleAutosave();
    });
    i.addEventListener('blur', ()=>{ i.value=fmtMoney(state[f.key] ?? 0); });
    return i;
  }

  const i=el('input',{type:'text','data-key':f.key,inputmode:(f.type==='text'?'text':'numeric'),placeholder:f.placeholder||''});
  const v=state[f.key];

  if(f.type==='int' || f.type==='mm'){
    i.value = (v==null||v==='')?'':String(Math.round(Number(v)));
    i.addEventListener('input', onFieldInput);
    i.addEventListener('blur', ()=>{
      const n=Math.round(toNumLoose(i.value));
      state[f.key]=n;
      i.value = (i.value.trim()===''?'':String(n));
      touchStamp();
      recalc(); scheduleAutosave();
    });
 // ✅ 여기부터 추가: materialLen이면 오른쪽 배지 붙이기
 if(f.key === 'materialLen'){
  const wrap = el('div',{class:'auto-badge-wrap'});
  const badge = el('span',{class:'auto-badge', id:'materialLenAutoBadge'}, '자동계산중');
  wrap.appendChild(i);
  wrap.appendChild(badge);

  // 최초 렌더 시 표시/숨김 반영
  setTimeout(()=>{ if(typeof updateMaterialLenAutoBadge === 'function') updateMaterialLenAutoBadge(); }, 0);


  return wrap;
}
// ✅ 여기까지 추가

  }else{
    i.value = String(v ?? '');
    i.addEventListener('input', onFieldInput);
  }
  return i;
}

function renderInputs(){
  const filter=(q('#fieldFilter')?.value||'').trim();

  const groups=['basic','material','paper','flexo','print','coating','shipping','admin'];
  for(const g of groups){
    const host=getGroupHost(g);
    if(host) host.innerHTML='';
  }

  for(const f of FIELD_DEFS){
    if(!fieldMatchesFilter(f, filter)) continue;
    const host=getGroupHost(f.group);
    if(!host) continue;
    host.appendChild(el('div',{class:'lab'}, f.label));
    const cell=el('div',{class:'field'});
    cell.appendChild(renderFieldControl(f));
    host.appendChild(cell);
  }

  syncReadonlyFields();
  refreshShipDatalists();
   // ✅ 입력폼이 그려진 직후 배지 갱신
   if(typeof updateMaterialLenAutoBadge === 'function') updateMaterialLenAutoBadge();
}

function onFieldInput(e){
  const key=e.target.getAttribute('data-key');
  const f=FIELD_DEFS.find(x=>x.key===key);
  if(!f) return;

  if(f.type==='text' || f.type==='datalist'){
    state[key]=e.target.value;
  }else if(f.type==='int' || f.type==='mm'){
    state[key]=toNumLoose(e.target.value);
  }else if(f.type==='float1' || f.type==='mm-f1'){
    state[key]=toNumLoose(e.target.value);

  }else{
    state[key]=e.target.value;
  }

  if(key==='shipRegion'){
    state.shipDrop = '';
    const dropEl = q('[data-key="shipDrop"]');
    if(dropEl) dropEl.value = '';
    refreshShipDatalists();
  }

  touchStamp();
  if(!SAFE_MODE){
    recalc();
  }
  scheduleAutosave();
}

/** =========================
 * Sync readonly fields
 * ========================= */
function syncReadonlyFields(){
  const ca=q("[data-key='createdAt']");
  if(ca) ca.value = formatKoreanDateTime(state.createdAt);

  const lr1=q("[data-key='lossRate1']"); if(lr1) lr1.value = pctText(safe0(state.lossRate1));
  const lr2=q("[data-key='lossRate2']"); if(lr2) lr2.value = pctText(safe0(state.lossRate2));

  const r=q("[data-key='paperTotalR']");
  if(r) r.value = (safe0(state.paperTotalR)>0 ? (Number(state.paperTotalR)).toFixed(2)+' R' : '0');

  const k=q("[data-key='paperTotalKg']");
  if(k) k.value = (safe0(state.paperTotalKg)>0 ? String(Math.round(state.paperTotalKg))+' kg' : '0');

  const mr=q("[data-key='materialRealWid']");
  if(mr) mr.value = (safe0(state.materialRealWid)>0 ? String(Math.round(state.materialRealWid)) : '0');

  const mw=q("[data-key='materialWid']");
if(mw){
  mw.value = (state.materialWidText ?? '0');

  const t = String(state.materialWidText ?? '').trim();
  const warn = (t === '규격확인' || t === '계산불가');
  mw.classList.toggle('warn-red', warn);
}

  const ma=q("[data-key='materialAreaM2']");
  if(ma) ma.value = (safe0(state.materialAreaM2)>0 ? (Number(state.materialAreaM2)).toFixed(2)+' m²' : '0');

  const mu=q("[data-key='materialUnitSheet']");
  if(mu) mu.value = fmtMoney(state.materialUnitSheet ?? 0);

  const sba=q("[data-key='shipBaseAuto']"); if(sba) sba.value = fmtMoney(state.shipBaseAuto ?? 0);
  const sme=q("[data-key='shipManualExtra']"); if(sme) sme.value = fmtMoney(state.shipManualExtra ?? 0);
  const stt=q("[data-key='shipTotal']"); if(stt) stt.value = fmtMoney(state.shipTotal ?? 0);
}

function refreshShipDatalists(){
  const dlR = q('#dl_shipRegion');
  if(dlR){
    dlR.innerHTML='';
    for(const o of getShipRegionOptions()) dlR.appendChild(el('option',{value:o}));
  }
  const dlD = q('#dl_shipDrop');
  if(dlD){
    dlD.innerHTML='';
    for(const o of getShipDropOptions()) dlD.appendChild(el('option',{value:o}));
  }
}

/** =========================
 * Enter -> next input (left panel)
 * ========================= */
function wireEnterToNextField(){
  if(window.__quoteEnterNextWired) return;
  window.__quoteEnterNextWired = true;

  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter' || e.isComposing) return;

    const t = e.target;
    if(!t) return;
    if(t.tagName === 'TEXTAREA') return;

    const left = document.getElementById('leftPanel');
    if(!left || !left.contains(t)) return;

    if(t.tagName === 'BUTTON') return;

    e.preventDefault();
    try{ t.blur(); }catch(_){}

    const scope = left.querySelector('.panel-bd') || left;

    const nodes = Array.from(scope.querySelectorAll('input,select,textarea'));
    const focusables = nodes.filter(n=>{
      if(n.disabled) return false;
      if(n.type === 'hidden') return false;
      if(n.hasAttribute('readonly')) return false;

      const sbd = n.closest('.sbd');
      if(sbd && getComputedStyle(sbd).display === 'none') return false;

      if(n.offsetParent === null) return false;
      return true;
    });

    const idx = focusables.indexOf(t);
    if(idx < 0) return;

    const next = focusables[idx + 1] || focusables[0];
    next.focus();
    if(typeof next.select === 'function'){
      try{ next.select(); }catch(_){}
    }
  }, true);
}

/** =========================
 * Dev items
 * ========================= */
function uid(){ return 'd'+Math.random().toString(16).slice(2)+Date.now().toString(16); }

function renderDevPanel(){
  ensureDevItems();
  const host=q('#devList');
  if(!host) return;
  host.innerHTML='';

  (state.devItems||[]).forEach((it, idx)=>{
    const row=el('div',{style:'display:grid;grid-template-columns:1.2fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;'});
    const name=el('input',{type:'text',placeholder:'항목명 (예: 샘플비)',value:it.name||''});
    const amt=el('input',{type:'text',inputmode:'numeric',placeholder:'금액(원)',value:(it.amount||0).toLocaleString('ko-KR')});
    const del=el('button',{class:'btn',type:'button'},'삭제');

    name.addEventListener('input', ()=>{
      state.devItems[idx].name=name.value;
      touchStamp();
      recalcLite();
      scheduleAutosave();
    });

    amt.addEventListener('focus', ()=>{
      amt.value=String(Math.round(toNumLoose(amt.value)));
      try{amt.select();}catch(_){}
    });
    amt.addEventListener('input', ()=>{
      state.devItems[idx].amount=toNumLoose(amt.value);
      touchStamp();
      recalcLite();
      scheduleAutosave();
    });
    amt.addEventListener('blur', ()=>{
      amt.value=(state.devItems[idx].amount||0).toLocaleString('ko-KR');
    });

    del.addEventListener('click', ()=>{
      state.devItems.splice(idx,1);
      touchStamp();
      renderDevPanel();
      recalcLite();
      scheduleAutosave();
    });

    row.appendChild(name);
    row.appendChild(amt);
    row.appendChild(del);
    host.appendChild(row);
  });
}

/** =========================
 * Render: calc table
 * ========================= */
function renderCalcGrid(){
  const tbody=q('#calcGrid tbody');
  if(!tbody) return;
  tbody.innerHTML='';

  const res=calculateQuote();
  const { totals:t } = res;

  const hasDev = (t.devSum||0) > 0;
  const line2 = hasDev
    ? '(재료+가공+운송) + (관리비/이윤) + (개발비포함) = 총금액'
    : '(재료+가공+운송) + (관리비/이윤) = 총금액';

  const headerLine2 = q('#calcHeaderLine2');
  if(headerLine2) headerLine2.textContent = line2;

  const summary = [
    { label:'총금액', item: hasDev ? '(재료+가공+운송) + (관리비/이윤) + (개발비포함)' : '(재료+가공+운송) + (관리비/이윤)', amount: t.sellTotal, emph:true },
    { label:'원가금액', item:'원가 = 직접재료비+가공비+운송비', amount: t.base },
    { label:'관리비', item:`관리비율: ${(safe0(state.mgmtRatePct)).toFixed(2)}%`, amount: t.mgmtAmount },
    { label:'이윤', item:`이윤율: ${(safe0(state.profitRatePct)).toFixed(2)}%`, amount: t.profitAmount },
    { label:'개발비', item:'개발비 합계', amount: t.devSum },
  ];

  const qty = Math.round(safe0(state.qty));
  const qtyText = qty > 0 ? qty.toLocaleString('ko-KR') : '-';

  for(const s of summary){
    const tr=el('tr',{class: s.emph ? 'sumrow' : ''});
    tr.appendChild(el('td',{class:'emph'}, s.label));
    tr.appendChild(el('td',{}, `<span class="ro">${s.item}</span>`));
    tr.appendChild(el('td',{class:'num ro'}, qtyText));
    tr.appendChild(el('td',{class:'num ro'}, fmtMoney(unitPricePerBox(s.amount))));
    tr.appendChild(el('td',{class:'num ro'}, fmtMoney(Math.round(s.amount||0))));
    tbody.appendChild(tr);
  }

  for(const it of res.items){
    const tr=el('tr');
    tr.appendChild(el('td',{class:'emph'}, GROUP_LABEL[it.group] || it.group));
    tr.appendChild(el('td',{}, `
      <span class="ro">${it.name}</span>
      ${it.basis ? `<span class="calc-basis">${it.basis}</span>` : ``}
    `));
    tr.appendChild(el('td',{class:'num ro'}, qtyText));
    tr.appendChild(el('td',{class:'num ro'}, fmtMoney(unitPricePerBox(it.amount))));
    tr.appendChild(el('td',{class:'num ro'}, fmtMoney(Math.round(it.amount||0))));
    tbody.appendChild(tr);
  }
}

/** =========================
 * Render: ratio table
 * ========================= */
function renderRatios(){
  const res = calculateQuote();
  const items = res.items || [];
  const total = Number(res.totals?.sellTotal) || 0;

  const body = q('#ratioBody');
  const sumEl = q('#ratioSum');
  if(!body) return;

  body.innerHTML = '';
  const pct = (amt)=> total>0 ? (amt/total)*100 : 0;

  const buckets = {
    '직접재료비': new Map(),
    '가공비': new Map(),
    '운송비': new Map(),
    '관리비': new Map(),
    '이윤': new Map(),
    '개발비': new Map(),
  };
  function add(title, name, amt){
    const a = Number(amt)||0;
    if(a<=0) return;
    const m = buckets[title];
    m.set(name, (m.get(name)||0) + a);
  }

  for(const it of items){
    const amt = Number(it.amount)||0;
    if(amt<=0) continue;

    if(it.group==='MATERIAL') add('직접재료비', ratioItemName(it.name), amt);
    else if(it.group==='PROCESSING') add('가공비', ratioItemName(it.name), amt);
    else if(it.group==='SHIPPING') add('운송비', ratioItemName(it.name), amt);
    else if(it.group==='MGMT') add('관리비', ratioItemName(it.name), amt);
    else if(it.group==='PROFIT') add('이윤', ratioItemName(it.name), amt);
    else if(it.group==='DEV') add('개발비', String(it.name||'개발비').trim()||'개발비', amt);
  }

  const orderDef = [
    { title:'직접재료비', merge:true, order:['용지','원단'] },
    { title:'가공비', merge:true, order:['플렉소인쇄','플렉소 다이커터','CTP','인쇄','코팅','실크인쇄','형압','박인쇄','합지','톰슨','창문접착','접착','견철','팔레트','손잡이'] },
    { title:'운송비', merge:true, order:['운송비'] },
    { title:'관리비', merge:false, order:['관리비'] },
    { title:'이윤', merge:false, order:['이윤'] },
    { title:'개발비', merge:true, order:null },
  ];
  
  let sumPct = 0;

  for(const g of orderDef){
    const map = buckets[g.title];
    if(!map || map.size===0) continue;

    const remaining = new Map(map);
    const rows = [];

    if(g.order){
      for(const name of g.order){
        if(remaining.has(name)){
          rows.push({item:name, amount:remaining.get(name)});
          remaining.delete(name);
        }
      }
    }
    for(const [item, amount] of remaining.entries()){
      rows.push({item, amount});
    }

    const groupSum = rows.reduce((s,r)=>s+(Number(r.amount)||0),0);
    const groupPct = pct(groupSum);
    sumPct += groupPct;

    rows.forEach((r, idx)=>{
      const tr = document.createElement('tr');

      if(g.merge){
        if(idx===0){
          tr.appendChild(el('td',{rowspan:rows.length, class:'ratio-grp'}, g.title));
        }
      }else{
        tr.appendChild(el('td',{class:'ratio-grp'}, g.title));
      }

      tr.appendChild(el('td',{class:'ratio-item'}, r.item));
      tr.appendChild(el('td',{class:'num ro ratio-rate'}, pct(r.amount).toFixed(2)+'%'));

      if(g.merge){
        if(idx===0){
          tr.appendChild(el('td',{rowspan:rows.length, class:'num ro ratio-sum'}, groupPct.toFixed(2)+'%'));
        }
      }else{
        tr.appendChild(el('td',{class:'num ro ratio-sum'}, groupPct.toFixed(2)+'%'));
      }

      body.appendChild(tr);
    });
  }

  if(sumEl) sumEl.textContent = `합계: ${sumPct.toFixed(2)}%`;
}

/** =========================
 * REF tabs
 * ========================= */

/* =========================
   REF: Single renderer (scrollable inline) - RESET VERSION
   ========================= */
   (function(){
    const STYLE_ID = 'refInlineStyleV5';
    const HOST_ID  = 'refScrollHostV5';
  
    function ensureRefStyle(){
      if(document.getElementById(STYLE_ID)) return;
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = `
        #${HOST_ID}{
          border: 1px solid rgba(15,23,42,.10);
          border-radius: 10px;
          background: #fff;
          overflow: auto;
          height: 520px;          /* JS에서 화면에 맞게 재계산 */
          max-height: 720px;
        }
        #${HOST_ID} table{
          width: 100%;
          border-collapse: collapse;
        }
        #${HOST_ID} th, #${HOST_ID} td{
          padding: 6px 8px;
          border-bottom: 1px solid rgba(15,23,42,.08);
          white-space: nowrap;
          vertical-align: top;
        }
        #${HOST_ID} thead th{
          position: sticky;
          top: 0;
          z-index: 2;
          background: #f8fafc;
          border-bottom: 1px solid rgba(15,23,42,.14);
        }
        #${HOST_ID} td.num{ text-align: right; font-variant-numeric: tabular-nums; }
      `;
      document.head.appendChild(st);
    }
  
    function ensureHost(){
      ensureRefStyle();
      const tabbar = q('#tabbar');
      if(!tabbar) return null;
  
      let host = q('#' + HOST_ID);
      if(!host){
        host = document.createElement('div');
        host.id = HOST_ID;
        tabbar.insertAdjacentElement('afterend', host);
      }
      return host;
    }
  
    function applyHostHeight(host){
      if(!host) return;
      const rect = host.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const bottomMargin = 24;
      const h = Math.max(240, Math.min(720, Math.floor(vh - rect.top - bottomMargin)));
  
      // max-height만으로 안 뜨는 케이스를 막기 위해 height도 같이 고정
      host.style.height = h + 'px';
      host.style.maxHeight = h + 'px';
      host.style.overflow = 'auto';
    }
  
    function escapeHtml(s){
      return String(s ?? '')
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'","&#039;");
    }
  
    function isNumericCell(v){
      // 숫자/소수 문자열까지 우측정렬
      if(typeof v === 'number') return true;
      const s = String(v ?? '').trim();
      if(!s) return false;
      return /^-?\d+(\.\d+)?$/.test(s);
    }
  
    function renderSheetToHost(key){
      const host = ensureHost();
      if(!host) return;
  
      const tbl = (window.REF_SAMPLE || {})[key];
      if(!tbl){
        host.innerHTML = `<div style="padding:12px;color:#64748b;">참조표 데이터가 없습니다: ${escapeHtml(key)}</div>`;
        applyHostHeight(host);
        return;
      }
  
      const head = tbl.head || [];
      const rows = tbl.rows || [];
  
      const thead = `<thead><tr>${
        head.map(h=>`<th>${escapeHtml(h)}</th>`).join('')
      }</tr></thead>`;
  
      const tbody = `<tbody>${
        rows.map(r=>{
          const tds = (r||[]).map(v=>{
            const cls = isNumericCell(v) ? 'num' : '';
            return `<td class="${cls}">${escapeHtml(v)}</td>`;
          }).join('');
          return `<tr>${tds}</tr>`;
        }).join('')
      }</tbody>`;
  
      host.innerHTML = `<table>${thead}${tbody}</table>`;
      applyHostHeight(host);
    }
  
    // 외부에서 호출 가능하게 노출
    window.__renderRefSheet = renderSheetToHost;
  
    // resize 시에도 높이 보정
    if(!window.__refV5Bound){
      window.__refV5Bound = true;
      window.addEventListener('resize', ()=>{
        const host = q('#' + HOST_ID);
        if(host) applyHostHeight(host);
      }, { passive:true });
    }
  
    // renderTabs/activateTab를 이 방식으로 “리셋 교체”
    window.renderTabs = function renderTabs(){
      const bar=q('#tabbar');
      if(!bar) return;
      bar.innerHTML='';
  
      const sheets=window.REF_SHEETS||[];
      sheets.forEach((s,i)=>{
        const btn = el('button',{
          class:'tab'+(i===0?' active':''),
          type:'button',
          'data-key':s.key
        }, s.title);
        bar.appendChild(btn);
      });
  
      if(sheets[0]) window.activateTab(sheets[0].key);
    };
  
    
  })();
  

function renderTabs(){
  const bar=q('#tabbar');
  if(!bar) return;
  bar.innerHTML='';

  const sheets=window.REF_SHEETS||[];
  sheets.forEach((s,i)=>{
    const btn = el('button',{
      class:'tab'+(i===0?' active':''),
      type:'button',
      'data-key':s.key
    }, s.title);
    bar.appendChild(btn);
  });

  if(sheets[0]) activateTab(sheets[0].key);
}

function activateTab(key){
  qa('#tabbar .tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-key')===key));

  const tbl=(window.REF_SAMPLE||{})[key];
  const head=q('#refHead'), body=q('#refBody');
  if(!head||!body) return;

  head.innerHTML=''; 
  body.innerHTML='';
  if(!tbl) return;

  (tbl.head||[]).forEach(h=>head.appendChild(el('th',{},h)));

  (tbl.rows||[]).forEach(r=>{
    const tr=el('tr');
    r.forEach(v=>{
      const isNum = typeof v === 'number';
      tr.appendChild(el('td',{class:(isNum?'num ro':'ro')}, (v==null?'':String(v))));
    });
    body.appendChild(tr);
  });

  // ✅ 여기! 루프 밖에서 딱 1번만 실행
  ensureRefTableScrollable();
  syncRefHeaderScrollbarWidth();
}


/** =========================
 * Recalc
 * ========================= */
function recalc(){
  syncPaperCutsToBoxCount();
  applyBoxTypeDirectInputMode();
  calcLossRates();
  applyMaterialLenAuto();
  applyBoxHeightAuto();
  applyMaterialFlapsAuto();
  applyMaterialCutSpecAuto();
  applyMaterialPaperPriceAuto();
  calcDerived();
  calcShipping();

  syncReadonlyFields();
  renderHeader();
  renderCalcGrid();
  renderRatios();
  updateBoxPreview();
  validateCorrugatedInputPlan(); 
  applyShippingIncludeModeUI();
// ✅ 추가


  // ✅ 마지막에 배지 상태 갱신
  if(typeof updateMaterialLenAutoBadge === 'function') updateMaterialLenAutoBadge();

}

function recalcLite(){
  syncPaperCutsToBoxCount();
  applyBoxTypeDirectInputMode();
  calcLossRates();
  applyMaterialLenAuto();
  applyBoxHeightAuto();
  applyMaterialFlapsAuto();
  applyMaterialCutSpecAuto();
  calcDerived();
  calcShipping();

  syncReadonlyFields();
  renderHeader();
  renderCalcGrid();
  renderRatios();
  validateCorrugatedInputPlan(); // ✅ 추가
  applyShippingIncludeModeUI();


  if(typeof updateMaterialLenAutoBadge === 'function') updateMaterialLenAutoBadge();

}

/* =========================
 * RECLAC_THROTTLE_V1 (emergency)
 * - make recalc/recalcLite run at most once per animation frame
 * - prevents "typing impossible" due to heavy sync rendering
 * ========================= */
(function RECLAC_THROTTLE_V1(){
  if (window.__RECLAC_THROTTLE_V1__) return;
  window.__RECLAC_THROTTLE_V1__ = true;

  const origRecalc = window.recalc;
  const origRecalcLite = window.recalcLite;

  let q1 = false, q2 = false;
  let lastArgs1 = null, lastArgs2 = null;

  window.recalc = function(...args){
    lastArgs1 = args;
    if (window.__PAUSE_RECALC__) return;
    if (q1) return;
    q1 = true;
    requestAnimationFrame(() => {
      q1 = false;
      try { origRecalc && origRecalc.apply(this, lastArgs1 || []); }
      catch(e){ console.error('[recalc throttled] error:', e); }
    });
  };

  window.recalcLite = function(...args){
    lastArgs2 = args;
    if (window.__PAUSE_RECALC__) return;
    if (q2) return;
    q2 = true;
    requestAnimationFrame(() => {
      q2 = false;
      try { origRecalcLite && origRecalcLite.apply(this, lastArgs2 || []); }
      catch(e){ console.error('[recalcLite throttled] error:', e); }
    });
  };

  // optional: quick kill switch you can toggle from address bar via console later
  window.__PAUSE_RECALC__ = false;

  console.log('[PATCH] RECLAC_THROTTLE_V1 applied');
})();

/** =========================
 * Load normalize (file import)
 * ========================= */
function normalizeLoadedState(obj){
  // 누락 필드 보정
  if(obj.shipTruckCount == null) obj.shipTruckCount = 1;
  if(obj.shipCapacityQty == null) obj.shipCapacityQty = 0;

  if(!obj.createdAt) obj.createdAt = new Date().toISOString();

  if(obj.clientDept == null) obj.clientDept = '';
  if(obj.clientJobTitle == null) obj.clientJobTitle = '';
  if(obj.clientName == null) obj.clientName = '';

  if(obj.materialRealWid == null) obj.materialRealWid = 0;
  if(obj.materialWid == null) obj.materialWid = 0;
  if(obj.materialWidText == null) obj.materialWidText = '0';

  if(!Array.isArray(obj.devItems)) obj.devItems = [];
  if (obj.flexoPrintColors != null) obj.flexoPrintColors = Math.round(Number(obj.flexoPrintColors) || 0);
  if(!Array.isArray(obj.__openGroups)) obj.__openGroups = ['basic'];

  return obj;
}
const UI_GROUPS = ['basic','material','paper','flexo','print','coating','shipping','admin','dev'];

function sectionElByGroup(group){
  let anchor = null;
  if(group === 'dev'){
    anchor = q('#devList') || q('#btnDevAdd') || q('#btnDevClear');
  }else{
    anchor = q(`#group_${group}`);
  }
  return anchor ? anchor.closest('.section') : null;
}

function setGroupOpen(group, open){
  const sec = sectionElByGroup(group);
  if(!sec) return;
  sec.setAttribute('data-open', open ? '1' : '0');
  const sbd = sec.querySelector('.sbd');
  if(sbd) sbd.style.display = open ? 'block' : 'none';
}

function captureOpenGroups(){
  const out = [];
  for(const g of UI_GROUPS){
    const sec = sectionElByGroup(g);
    if(sec && sec.getAttribute('data-open') === '1') out.push(g);
  }
  return out;
}

function applyOpenGroupsFromState(){
  const arr = Array.isArray(state.__openGroups) ? state.__openGroups : null;
  const openSet = new Set((arr && arr.length ? arr : ['basic']).map(String));

  for(const g of UI_GROUPS){
    setGroupOpen(g, openSet.has(g));
  }
}


function ensureShareButton(){
  const actions = document.querySelector('.actions');
  if(!actions) return null;

  let btn = document.getElementById('btnShare');
  if(!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnShare';
    btn.className = 'btn btn-share';
    btn.textContent = '공유';

    // 설치 버튼 앞에 넣기(있으면)
    const installBtn =
      actions.querySelector('#btnInstallPwa') ||
      actions.querySelector('#btnInstall') ||
      Array.from(actions.querySelectorAll('button'))
        .find(b => (b.textContent||'').trim() === '설치');

    actions.insertBefore(btn, installBtn || null);
  }
  return btn;
}

function wireShareButtonOnce(){
  const btn = ensureShareButton();
  if(!btn || btn.__shareBoundV1) return;
  btn.__shareBoundV1 = true;

  btn.addEventListener('click', async (e)=>{
    e.preventDefault();
    try{
      const p = buildSharePayload();
      const shareText = [p.text, p.url].filter(Boolean).join('\n\n');

      if(navigator.share){
        try{
          const data = { title:p.title, text:p.text };
          if(p.url) data.url = p.url;
          if(navigator.canShare && p.file && navigator.canShare({ files:[p.file] })){
            data.files = [p.file];
          }
          await navigator.share(data);
          return;
        }catch(err){
          if(err?.name === 'AbortError') return;
          console.warn('[Share] failed:', err?.name, err?.message);
        }
      }

      const ok = await copyToClipboardFallback(shareText);
      if(ok) alert('클립보드에 복사했습니다.');
      else prompt('복사해서 사용하세요:', shareText);
    }catch(err){
      alert('공유 오류(콘솔 확인)');
    }
  });
}

function wireShareButtonOnce(){
  if (window.__quoteShareBoundV1) return;
  window.__quoteShareBoundV1 = true;

  const btn =
    document.getElementById('btnShare') ||
    document.querySelector('[data-action="share"]');

  if (!btn) return;

  btn.addEventListener('click', async () => {
    const payload = (typeof buildSharePayload === 'function')
      ? buildSharePayload()
      : { title: document.title, text: location.href, url: location.href };

    const title = payload.title || document.title;
    const text  = payload.text  || payload.url || location.href;
    const url   = payload.url   || location.href;

    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); alert('복사했습니다.'); }
      else prompt('복사해서 공유하세요:', text);
    } catch (e) {
      console.warn('[share] failed', e);
    }
  }, { passive: true });
}

// =========================
// Share (A: link + text, always works)
// =========================
function buildShareTextFromDom(){
  const company = (document.getElementById('hdrCompany')?.textContent || '').trim();
  const product = (document.getElementById('hdrProduct')?.textContent || '').trim();
  const created = (document.getElementById('hdrCreatedAt')?.textContent || '').trim();
  const url = location.href;

  const lines = [];
  lines.push(document.title || '견적 공유');
  if (company && company !== '-') lines.push(`업체명: ${company}`);
  if (product && product !== '-') lines.push(`품명: ${product}`);
  if (created && created !== '-') lines.push(`생성: ${created}`);
  lines.push(`링크: ${url}`);

  return lines.join('\n');
}

async function shareLinkAndTextAlways(){
  const url = location.href;
  const title = document.title || '견적 공유';

  let text = '';
  try {
    text = (typeof buildSharePayload === 'function')
      ? (buildSharePayload()?.text || '')
      : '';
  } catch (_) {}
  if (!text) text = buildShareTextFromDom();

  // 1) Web Share 우선
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      // 사용자가 공유창을 닫은 경우는 조용히 종료
      if (e?.name === 'AbortError' || e?.name === 'NotAllowedError') return;
    }
  }

  // 2) 클립보드 폴백(텍스트+링크를 우리가 직접 복사)
  const toCopy = text.includes(url) ? text : `${text}\n${url}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(toCopy);
    alert('공유용 텍스트+링크를 클립보드에 복사했습니다.');
    return;
  }

  // 3) 최후 폴백
  prompt('복사해서 공유하세요:', toCopy);
}

function wireShareButtonOnce(){
  if (window.__quoteShareBoundV1) return;
  window.__quoteShareBoundV1 = true;

  const btn = document.getElementById('btnShare');
  if (!btn) return;

  // 기존 onclick이 남아있으면 제거(중복 실행 방지)
  btn.onclick = null;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await shareLinkAndTextAlways();
    } catch (err) {
      console.warn('[share] failed', err);
      alert('공유에 실패했습니다.');
    }
  }, { passive:false });
}


/** =========================
 * UI wiring
 * ========================= */
function wireUI(){
  ensureShareButton(); // ✅ 공유 버튼이 없으면 생성
  if (typeof wireShareButtonOnce === 'function') wireShareButtonOnce();

  // 섹션 토글
  document.addEventListener('click', (e)=>{
    const shd = e.target.closest('.section .shd');
    if(!shd) return;
    const sec = shd.closest('.section');
    if(!sec) return;
    const SAFE_MODE = new URLSearchParams(location.search).has('safe');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation && e.stopImmediatePropagation();

    const sbd = sec.querySelector('.sbd');
    const open = sec.getAttribute('data-open') === '1';
    sec.setAttribute('data-open', open ? '0' : '1');
    if(sbd) sbd.style.display = open ? 'none' : 'block';
    state.__openGroups = captureOpenGroups(); // ✅ 열린 상태 저장
    scheduleAutosave();     
  }, true);
                   // ✅ 자동저장에 포함
  
  // 참조탭
  const tabbar = q('#tabbar');
  if(tabbar){
    tabbar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab');
      if(!btn) return;
      const key = btn.getAttribute('data-key');
      if(key) activateTab(key);
    });
  }

  // 헤더 작성자 프로필 수정(더블클릭)
  document.addEventListener('dblclick', (e)=>{
    if(e.target.closest('#hdrDept, #hdrJobTitle, #hdrUserName')){
      editMyProfile();
    }
  }, true);




  function doResetAll(){
    initState();
    state.devItems = [];
    renderInputs();
    renderDevPanel();
    recalcLite();
    updateBoxPreview();
    scheduleAutosave();
  }

  // 저장
  q('#btnSaveFile')?.addEventListener('click', async ()=>{
    try{
      const usedPicker = await saveStateAsFileWithPicker();
      if(usedPicker){
        alert('저장 완료: 원하는 위치/파일명으로 저장했습니다.');
      }else{
        alert('저장 완료: 파일을 다운로드로 저장했습니다.\n※ 이 환경에서는 저장 위치는 브라우저 정책에 따릅니다.');
      }
    }catch(err){
      console.warn('save cancelled or failed:', err);
    }
  });

  // 불러오기
  q('#btnLoadFile')?.addEventListener('click', ()=>{
    q('#stateFileInput')?.click();
  });

  q('#stateFileInput')?.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    e.target.value = '';
    if(!file) return;

    try{
      const text = await file.text();
      const obj = normalizeLoadedState(JSON.parse(text));
      initState();   
      Object.assign(state, obj);

      renderInputs();
      renderDevPanel();
      recalcLite();
      updateBoxPreview();
      scheduleAutosave();

      alert('불러오기 완료');
    }catch(err){
      console.error('LOAD ERROR:', err);
      alert('불러오기 실패: JSON 파일이 아니거나 내용이 올바르지 않습니다.');
    }
  });

  // PDF/인쇄
  q('#btnPdf')?.addEventListener('click', ()=>{
    alert('PDF 저장: 인쇄 창에서 “PDF로 저장”을 선택하세요.');
    window.print();
  });
  q('#btnPrint')?.addEventListener('click', ()=>window.print());

  // 개발비 add/clear (이벤트 위임)
  document.addEventListener('click', (e)=>{
    const addBtn = e.target.closest('#btnDevAdd');
    if(addBtn){
      ensureDevItems();
      state.devItems.push({ id: uid(), name:'', amount:0 });
      touchStamp();
      renderDevPanel();
      recalcLite();
      scheduleAutosave();
      return;
    }

    const clearBtn = e.target.closest('#btnDevClear');
    if(clearBtn){
      ensureDevItems();
      state.devItems = [];
      touchStamp();
      renderDevPanel();
      recalcLite();
      scheduleAutosave();
      return;
    }
  }, true);

  // 초기화
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#btnReset');
    if(!btn) return;
    try{
      doResetAll();
    }catch(err){
      console.error('RESET ERROR:', err);
      alert('초기화 중 오류가 발생했습니다. 콘솔의 RESET ERROR를 확인해주세요.');
    }
  }, true);
  wireShareButtonOnce(); // ✅ 공유 버튼 연결
}

/** =========================
 * Footer
 * ========================= */

function ensureFooter(){
  // ✅ body가 아직 없으면 DOM 준비 후 다시 실행
  if(!document.body){
    document.addEventListener('DOMContentLoaded', ensureFooter, { once:true });
    return;
  }

  const year = new Date().getFullYear();
  const txt = `© ${year} Dev. Done by Dongseok Han · ${APP_VERSION}`;

  if(!q('#quoteFooterStyle')){
    const st = document.createElement('style');
    st.id = 'quoteFooterStyle';
    st.textContent = `
      body{ padding-bottom: 38px; }
      #quoteFooter{
        position: fixed;
        left: 0; right: 0; bottom: 0;
        height: 32px;
        display:flex; align-items:center; justify-content:center;
        font-size: 12px;
        color: rgba(15,23,42,.75);
        background: rgba(255,255,255,.90);
        border-top: 1px solid rgba(15,23,42,.12);
        backdrop-filter: blur(10px);
        z-index: 9999;
      }
    `;
    (document.head || document.documentElement).appendChild(st);
  }

  let f = q('#quoteFooter');
  if(!f){
    f = document.createElement('div');
    f.id = 'quoteFooter';
    document.body.appendChild(f);
  }
  f.textContent = txt;
}



function ensureAutoBadgeStyle(){
  if(document.getElementById('autoBadgeStyle')) return;
  const st = document.createElement('style');
  st.id = 'autoBadgeStyle';
  st.textContent = `
    .auto-badge-wrap{
      position: relative;
      display: grid;
      align-items: center;
    }
    .auto-badge-wrap > input{
      padding-right: 88px; /* 배지 공간 확보 */
    }
    .auto-badge{
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      display: none;
      align-items: center;
      height: 20px;
      padding: 0 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      background: rgba(255, 193, 7, 0.35);
      border: 1px solid rgba(255, 193, 7, 0.75);
      pointer-events: none;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(st);
}

(function materialWidWarnStyle(){
  if(document.getElementById('materialWidWarnStyle')) return;
  const st = document.createElement('style');
  st.id = 'materialWidWarnStyle';
  st.textContent = `
    .warn-red{
      border: 2px solid #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,.18) !important;
      border-radius: 8px !important;
    }
  `;
  document.head.appendChild(st);
})();


/* =========================================================
   REF table scroll patch V4 (FINAL)
   - Makes <tbody id="refBody"> scrollable (most reliable)
   - Unwraps legacy wrappers (.ref-scroll-wrap / v2 / v3)
   - No dependency on table wrapper layouts (flex/grid safe)
   ========================================================= */
   (function REF_SCROLL_PATCH_V4(){
    const STYLE_ID = 'refScrollStyleV4';
  
    function ensureStyle(){
      if(document.getElementById(STYLE_ID)) return;
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = `
        /* tbody scrolling layout */
        #refBody{
          display:block;           /* 핵심: tbody를 block으로 */
          overflow:auto;           /* 스크롤 발생 */
          min-height:0;            /* flex/grid에서 필수인 경우가 많음 */
          -webkit-overflow-scrolling: touch;
        }
        /* header stays visible because only tbody scrolls */
        #refBody tr{ display:table; width:100%; table-layout:fixed; }
        #refHead{ display:table; width:100%; table-layout:fixed; }
  
        /* table must be block-ish for fixed header + scroll body pattern */
        #refHead th, #refBody td{
          white-space:nowrap;
          box-sizing:border-box;
        }
         /* 테이블 전체 고정 레이아웃 */
#refBody { scrollbar-gutter: stable; } /* tbody가 스크롤 컨테이너라 여기에 걸어야 함 */

#refBody, #refBody tr, #refHead, #refHead th, #refBody td{
  box-sizing: border-box;
}

/* 핵심: 헤더(tr)에 "스크롤바 폭"만큼의 가짜 셀을 추가해 폭을 맞춤 */
table{ table-layout: fixed; }
table thead tr::after{
  content: "";
  display: table-cell;
  width: var(--ref-sbw, 0px);
}
#refBody{ scrollbar-gutter: stable; }
table thead tr::after{
  content:"";
  display:table-cell;
  width: var(--ref-sbw, 0px);
}

/* 헤더 중앙정렬 */
#refHead th{
  text-align: center;
  vertical-align: middle;
}

/* 기본 셀 중앙정렬 */
#refBody td{
  text-align: center;
  vertical-align: middle;
}

/* 숫자 컬럼은 우측정렬(가독성) */
#refBody td.num{
  text-align: right;
}

/* 마지막 열(비고)은 좌측정렬(문장 가독성) */
#refHead th:last-child,
#refBody td:last-child{
  text-align: left;
  white-space: nowrap; /* 필요하면 줄바꿈 허용으로 변경 */
}

      `;
      document.head.appendChild(st);
    }
  
    function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
  
    function unwrapAnyWrappers(table){
      const p = table && table.parentElement;
      if(!p || !p.classList) return;
  
      const cls = p.classList;
      const isLegacy =
        cls.contains('ref-scroll-wrap') ||
        cls.contains('ref-scroll-wrap-v2') ||
        cls.contains('ref-scroll-wrap-v3');
  
      if(isLegacy){
        const host = p.parentElement;
        if(host){
          host.insertBefore(table, p);
          p.remove();
        }
      }
    }
  
    function ensureRefTableScrollableV4(){
      ensureStyle();
  
      const body = q('#refBody');
      const head = q('#refHead');
      if(!body || !head) return;
  
      const table = body.closest('table');
      if(!table) return;
  
      unwrapAnyWrappers(table);
  
      // thead/tbody 요소 잡기
      const thead = head.closest('thead') || table.querySelector('thead');
      const tbody = body.closest('tbody') || table.querySelector('tbody');
      if(!tbody) return;
  
      // 테이블 레이아웃 고정(헤더/바디 컬럼 정렬)
      table.style.width = '100%';
      table.style.tableLayout = 'fixed';
  
      if(thead){
        thead.style.display = 'table';
        thead.style.width = '100%';
        thead.style.tableLayout = 'fixed';
      }
  
      // tbody를 스크롤 영역으로 설정
      tbody.style.display = 'block';
      tbody.style.overflow = 'auto';
      tbody.style.minHeight = '0';
  
      // 화면 높이에 맞춰 maxHeight 계산
      const rect = tbody.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const bottomMargin = 24;
      const available = vh - rect.top - bottomMargin;
  
      const maxH = clamp(Math.floor(available), 220, 720);
      tbody.style.maxHeight = maxH + 'px';
    }
  
    // 기존 이름으로 “마지막에” 확정 덮어쓰기 (중복 정의/패치 충돌 종결)
    window.ensureRefTableScrollable = ensureRefTableScrollableV4;
  
    // 탭 렌더 직후/리렌더 대응: activateTab이 매번 호출하니 거기서도 호출됨
    // 추가로 resize에서도 동작하도록 1회 바인딩
    if(!window.__refScrollV4Bound){
      window.__refScrollV4Bound = true;
      window.addEventListener('resize', ()=>window.ensureRefTableScrollable(), { passive:true });
      window.addEventListener('orientationchange', ()=>window.ensureRefTableScrollable(), { passive:true });
    }
  
    // 최초 1회 시도
    setTimeout(()=>window.ensureRefTableScrollable(), 0);
  })();
  
  function syncRefHeaderScrollbarWidth(){
    const tbody = q('#refBody');
    if(!tbody) return;
    const table = tbody.closest('table');
    if(!table) return;
  
    requestAnimationFrame(() => {
      const sbw = (tbody.offsetWidth - tbody.clientWidth) || 0; // 스크롤바 폭
      table.style.setProperty('--ref-sbw', sbw + 'px');
      table.style.tableLayout = 'fixed';
    });
  }
  
  /* =========================================================
   matC~matG 입력값 자동 대문자 통일 (V1)
   - 입력 중: 영문만 대문자화(길이 불변 -> 커서 안 튐)
   - blur 시: trim + 대문자화
   ========================================================= */
(function matCodeUppercasePatchV1(){
  const MAT_KEYS = new Set(['matC','matD','matE','matF','matG']);

  function upperAsciiOnly(s){
    return String(s ?? '').replace(/[a-z]/g, ch => ch.toUpperCase());
  }

  // 입력 중에는 대문자만(커서 유지 목적), 공백 trim은 blur에서 처리
  document.addEventListener('input', (e)=>{
    const t = e.target;
    if(!t || !t.getAttribute) return;
    const key = t.getAttribute('data-key');
    if(!MAT_KEYS.has(key)) return;

    const v = String(t.value ?? '');
    const nv = upperAsciiOnly(v);
    if(nv === v) return;

    const ss = t.selectionStart, se = t.selectionEnd;
    t.value = nv;
    try{ t.setSelectionRange(ss, se); }catch(_){}
  }, true);

  // 포커스 빠질 때는 trim까지
  document.addEventListener('blur', (e)=>{
    const t = e.target;
    if(!t || !t.getAttribute) return;
    const key = t.getAttribute('data-key');
    if(!MAT_KEYS.has(key)) return;

    const v = String(t.value ?? '');
    const nv = upperAsciiOnly(v.trim());
    if(nv === v) return;

    t.value = nv;
  }, true);
})();

/* =========================================================
   원단코드 매칭 실패 하이라이트 UX (V1)
   - matC~matG 입력칸에 빨간 테두리 표시
   ========================================================= */
   (function materialMatchUxV1(){
    const STYLE_ID = 'materialMatchUxStyleV1';
    if(!document.getElementById(STYLE_ID)){
      const st = document.createElement('style');
      st.id = STYLE_ID;
      st.textContent = `
        .mat-miss{
          border: 2px solid #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239,68,68,.18) !important;
          border-radius: 8px !important;
        }
      `;
      document.head.appendChild(st);
    }
  
    const MAT_KEYS = ['matC','matD','matE','matF','matG'];
  
    window.__setMatMissKeys = function(keys){
      const set = new Set((keys || []).filter(Boolean));
      for(const k of MAT_KEYS){
        const el = document.querySelector(`[data-key='${k}']`);
        if(!el) continue;
        el.classList.toggle('mat-miss', set.has(k));
      }
    };
  })();
  
  (function materialWidWarnStyle(){
    if(document.getElementById('materialWidWarnStyle')) return;
    const st = document.createElement('style');
    st.id = 'materialWidWarnStyle';
    st.textContent = `
      .warn-red{
        border: 2px solid #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239,68,68,.18) !important;
        border-radius: 8px !important;
      }
    `;
    document.head.appendChild(st);
  })();

  (function corrWarnStyleV1(){
    if(document.getElementById('corrWarnStyleV1')) return;
    const st = document.createElement('style');
    st.id = 'corrWarnStyleV1';
    st.textContent = `
      .warn-red{
        border: 2px solid #ef4444 !important;
        box-shadow: 0 0 0 3px rgba(239,68,68,.18) !important;
        border-radius: 8px !important;
      }
    `;
    document.head.appendChild(st);
  })();
 

/* =========================
 * Boot (DOM ready safe)
 * ========================= */
function boot(){
  try{
    initState();

    if (SAFE_MODE){
      // 최소 렌더만 하고, 문서 전역 리스너/자동recalc를 건드리지 않음
      ensureMyProfileOnce();
      renderHeader();
      renderInputs();
      renderTabs();
      ensureFooter();
      renderDevPanel();
      updateBoxPreview();
      ensureAutoBadgeStyle();

      // recalc는 수동으로만(원하면 버튼/콘솔로 호출)
      _autosaveBooted = false;

      const note = document.createElement('div');
      note.style.cssText = 'position:fixed;top:8px;right:8px;z-index:100000;padding:8px 10px;border:1px solid rgba(15,23,42,.2);background:#fff;font-size:12px;font-weight:800;border-radius:10px;';
      note.textContent = 'SAFE MODE (자동계산/전역이벤트 최소화)';
      document.body.appendChild(note);

      console.log(`[${APP_VERSION}] boot SAFE_MODE ok`);
      return;
    }

    // --- 기존 boot 흐름 유지 ---
    ensureMyProfileOnce();
    wireUI();
    wireEnterToNextField();
    renderInputs();

    try{ applyOpenGroupsFromState(); }catch(_){}

    renderTabs();
    ensureFooter();
    renderDevPanel();
    recalcLite();
    updateBoxPreview();
    ensureAutoBadgeStyle();
    initFieldSearch();

    _autosaveBooted = true;
    console.log(`[${APP_VERSION}] boot ok`);
  }catch(err){
    console.error('BOOT ERROR:', err);
    alert('스크립트 오류로 화면이 먹통입니다.\n\n' + (err?.message||err));
  }
}

(function bootLauncher(){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  }else{
    if (!window.__QUOTE_SAFE_NOAUTOBOOT__) {
      boot();
    } else {
      // safe 모드에서는 자동 부팅 대신, 페이지가 멈추지 않는지부터 확인
      // (필요하면 여기서 bootSafe() 같은 최소 렌더만 호출)
    }
  }
})();


/* =========================
   Header action buttons color theme v1
   - Reset / Save / Load / PDF / Print colors
========================= */
(function HEADER_ACTION_BTN_COLORS_V1(){
  const STYLE_ID = 'hdrActionBtnColorsV1';
  if(document.getElementById(STYLE_ID)) return;

  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
    /* 공통 톤(기존 .btn이 있어도 과하게 덮어쓰지 않도록 id로만 지정) */
    #btnReset, #btnSaveFile, #btnLoadFile, #btnPdf, #btnPrint{
      border-radius: 10px;
      font-weight: 800;
      border: 1px solid rgba(15,23,42,.14);
      box-shadow: 0 1px 0 rgba(15,23,42,.06);
      transition: background .12s ease, border-color .12s ease, box-shadow .12s ease, transform .02s ease;
    }
    #btnReset:active, #btnSaveFile:active, #btnLoadFile:active, #btnPdf:active, #btnPrint:active{
      transform: translateY(1px);
    }
    #btnReset:focus, #btnSaveFile:focus, #btnLoadFile:focus, #btnPdf:focus, #btnPrint:focus{
      outline: none;
    }
    #btnReset:focus-visible{ box-shadow: 0 0 0 3px rgba(239,68,68,.25); }
    #btnSaveFile:focus-visible{ box-shadow: 0 0 0 3px rgba(59,130,246,.25); }
    #btnLoadFile:focus-visible{ box-shadow: 0 0 0 3px rgba(139,92,246,.25); }
    #btnPdf:focus-visible{ box-shadow: 0 0 0 3px rgba(245,158,11,.25); }
    #btnPrint:focus-visible{ box-shadow: 0 0 0 3px rgba(16,185,129,.25); }

    /* 초기화: Red */
    #btnReset{
      background: rgba(239,68,68,.10);
      border-color: rgba(239,68,68,.35);
      color: rgba(185,28,28,.95);
    }
    #btnReset:hover{ background: rgba(239,68,68,.14); }

    /* 저장: Blue */
    #btnSaveFile{
      background: rgba(59,130,246,.12);
      border-color: rgba(59,130,246,.35);
      color: rgba(29,78,216,.98);
    }
    #btnSaveFile:hover{ background: rgba(59,130,246,.16); }

    /* 불러오기: Violet */
    #btnLoadFile{
      background: rgba(139,92,246,.12);
      border-color: rgba(139,92,246,.35);
      color: rgba(109,40,217,.98);
    }
    #btnLoadFile:hover{ background: rgba(139,92,246,.16); }

    /* PDF: Amber */
    #btnPdf{
      background: rgba(245,158,11,.14);
      border-color: rgba(245,158,11,.40);
      color: rgba(180,83,9,.98);
    }
    #btnPdf:hover{ background: rgba(245,158,11,.18); }

    /* 인쇄: Green */
    #btnPrint{
      background: rgba(16,185,129,.12);
      border-color: rgba(16,185,129,.35);
      color: rgba(4,120,87,.98);
    }
    #btnPrint:hover{ background: rgba(16,185,129,.16); }
  `;
  document.head.appendChild(st);
})();


/* =========================
   AUTHOR PROFILE BUTTONS: between Name and CreatedAt v1
   - inserts a new row between "이름(작성자)" line and "생성날짜" line
   - no DOM relocation, no observer
========================= */
(function AUTHOR_PROFILE_BTNS_BETWEEN_V1(){
  const STYLE_ID = 'authorProfileBtnsStyleV1_between';
  const ROW_ID   = 'myProfileBtnRowV1_between';
  const WRAP_ID  = 'myProfileBtnWrapV1_between';

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      #${ROW_ID}{
        display:flex;
        align-items:center;
        gap:8px;
        margin: 4px 0;
      }
      /* 라벨 폭에 맞춰 살짝 들여쓰기(필요하면 숫자만 조절) */
      #${ROW_ID}{ padding-left: 0px; }

      #${WRAP_ID}{
        display:inline-flex;
        gap:6px;
        align-items:center;
        white-space:nowrap;
      }
      #${WRAP_ID} .btn-mini{
        height: 22px;
        padding: 0 8px;
        border-radius: 8px;
        border: 1px solid rgba(15,23,42,.18);
        background: #fff;
        color: rgba(15,23,42,.85);
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }
      #${WRAP_ID} .btn-mini:hover{ background: rgba(15,23,42,.04); }
      #${WRAP_ID} .btn-danger{
        border-color: rgba(239,68,68,.35);
        color: rgba(185,28,28,.95);
        background: rgba(239,68,68,.06);
      }
      #${WRAP_ID} .btn-danger:hover{ background: rgba(239,68,68,.10); }
    `;
    document.head.appendChild(st);
  }

  function resetMyProfileSafe(){
    try{ localStorage.removeItem(USER_PROFILE_KEY); }catch(_){}
  }

  function findRowByContaining(el, mustIncludeText){
    if(!el) return null;
    let cur = el;
    for(let i=0; i<8 && cur && cur !== document.body; i++){
      const t = (cur.textContent || '').replace(/\s+/g,' ').trim();
      if(t && t.includes(mustIncludeText)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function ensureButtons(){
    ensureStyle();

    // 기존 삽입물 제거(중복/이전 패치 잔존 방지)
    document.getElementById(ROW_ID)?.remove();

    const nameEl = document.getElementById('hdrUserName');
    const createdEl = document.getElementById('hdrCreatedAt');
    if(!nameEl || !createdEl) return;

    // “이름(작성자)” 줄 / “생성날짜” 줄 컨테이너 찾기
    const nameRow = findRowByContaining(nameEl, '이름(작성자)') || nameEl.parentElement;
    const createdRow = findRowByContaining(createdEl, '생성날짜') || createdEl.parentElement;
    if(!createdRow || !createdRow.parentElement) return;

    // createdRow 바로 위에 새 row 삽입(= 이름과 생성날짜 사이)
    const row = document.createElement(createdRow.tagName === 'P' ? 'P' : 'DIV');
    row.id = ROW_ID;

    const wrap = document.createElement('span');
    wrap.id = WRAP_ID;

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn-mini';
    btnEdit.textContent = '작성자 수정';

    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.className = 'btn-mini btn-danger';
    btnReset.textContent = '작성자 초기화';

    btnEdit.addEventListener('click', ()=>{
      try{
        editMyProfile();   // 기존 함수 사용
        renderHeader();
      }catch(e){
        console.error(e);
        alert('작성자 수정 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
      }
    });

    btnReset.addEventListener('click', ()=>{
      if(!confirm('작성자(소속/직책/이름) 정보를 초기화하고 다시 입력할까요?')) return;
      try{
        resetMyProfileSafe();
        ensureMyProfileOnce();
        renderHeader();
      }catch(e){
        console.error(e);
        alert('작성자 초기화 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
      }
    });

    wrap.appendChild(btnEdit);
    wrap.appendChild(btnReset);
    row.appendChild(wrap);

    createdRow.parentElement.insertBefore(row, createdRow);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(ensureButtons, 0), { once:true });
  }else{
    setTimeout(ensureButtons, 0);
  }

  // 헤더 텍스트만 바꾸는 renderHeader 이후에도 1회 더 보장(안전 후킹)
  if(typeof window.renderHeader === 'function' && !window.renderHeader.__profileBetweenHookedV1){
    const _orig = window.renderHeader;
    window.renderHeader = function(...args){
      const r = _orig.apply(this, args);
      try{ ensureButtons(); }catch(_){}
      return r;
    };
    window.renderHeader.__profileBetweenHookedV1 = true;
  }
})();
/* =========================
   REF tab order: move "원지가격참조" to far left v1
========================= */
(function REF_TAB_ORDER_PAPER_VALUE_FIRST_V1(){
  const KEY = '원지가격참조';

  function moveToFront(){
    const arr = window.REF_SHEETS;
    if(!Array.isArray(arr) || arr.length === 0) return;

    const idx = arr.findIndex(s => s && s.key === KEY);
    if(idx <= 0) return; // 없거나 이미 맨 앞

    const it = arr.splice(idx, 1)[0];
    arr.unshift(it);
  }

  function apply(){
    moveToFront();
    // 탭을 다시 그려서 순서 반영
    if(typeof window.renderTabs === 'function') window.renderTabs();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(apply, 0), { once:true });
  }else{
    setTimeout(apply, 0);
  }
})();

function validateCorrugatedInputPlan(){
  const el = q("[data-key='corrugatedType']");
  if(!el) return;

  const corr = String(state.corrugatedType || '').trim().toUpperCase();

  // 기대 입력 필드 셋
  // matC=표면지, matD=골심1, matE=중심지, matF=골심2, matG=이면지
  const expectedMap = {
    GF: new Set(['matC','matD']),
    FF: new Set(['matC','matD']),
    EF: new Set(['matC','matD']),
    BF: new Set(['matC','matD']), // 안전 포함(프로젝트에 존재)
    E : new Set(['matC','matD','matG']),
    B : new Set(['matC','matD','matG']),
    C : new Set(['matC','matF','matG']),
    A : new Set(['matC','matF','matG']),
    EB: new Set(['matC','matD','matE','matF','matG']),
    BB: new Set(['matC','matD','matE','matF','matG']),
    BA: new Set(['matC','matD','matE','matF','matG']),
  };

  const expected = expectedMap[corr];
  if(!expected){
    el.classList.remove('warn-red');
    el.removeAttribute('title');
    return;
  }

  // 실제로 입력된 필드 셋(값이 있으면 "입력됨"으로 간주)
  const filled = new Set();
  ['matC','matD','matE','matF','matG'].forEach(k=>{
    const v = String(state[k] ?? '').trim();
    if(v) filled.add(k);
  });

  // 아무 것도 입력 안 했으면 경고는 안 띄움(초기 상태 배려)
  if(filled.size === 0){
    el.classList.remove('warn-red');
    el.removeAttribute('title');
    return;
  }

  // filled == expected 인지 검사(추가/누락 모두 체크)
  const ok =
    filled.size === expected.size &&
    Array.from(expected).every(k => filled.has(k));

  el.classList.toggle('warn-red', !ok);

  if(!ok){
    const expText = Array.from(expected).map(k=>({
      matC:'표면지', matD:'골심지1', matE:'중심지', matF:'골심지2', matG:'이면지'
    }[k] || k)).join(', ');

    const filledText = Array.from(filled).map(k=>({
      matC:'표면지', matD:'골심지1', matE:'중심지', matF:'골심지2', matG:'이면지'
    }[k] || k)).join(', ');

    el.title = `골종류(${corr}) 입력 조합 불일치\n필요: ${expText}\n현재: ${filledText}`;
  }else{
    el.removeAttribute('title');
  }
}

function applyShippingIncludeModeUI(){
  const off = String(state.shipIncludeMode || '포함').trim() === '미포함';

  const keys = [
    'shipRegion','shipDrop','shipTruck','shipCapacityQty','shipTruckCount',
    'manualUnload','shipBaseInput','shipSpecialExtra'
  ];

  for(const k of keys){
    const el =
      q(`[data-key='${k}__sel']`) ||
      q(`[data-key='${k}']`);
    if(!el) continue;
    el.disabled = off;
  }
}

/* =========================
   WARN LABELS + FIELDS: boxCount/materialCuts/paperCuts (red + bold + border) v2
========================= */
(function WARN_LABELS_AND_FIELDS_V2(){
  const STYLE_ID = 'warnLabelsStyleV2';
  const LAB_CLS = 'warn-lab-red';
  const FLD_CLS = 'warn-field-red';

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      /* 라벨 강조 */
      .${LAB_CLS}{
        color: #dc2626 !important;      /* red-600 */
        font-weight: 900 !important;
      }

      /* 입력칸 강조(연하게) */
      .${FLD_CLS}{
        border: 1.5px solid rgba(220,38,38,.45) !important;
        box-shadow: 0 0 0 2px rgba(220,38,38,.08) !important;
        background: rgba(220,38,38,.03) !important;
        border-radius: 10px !important;
      }
      .${FLD_CLS}:focus{
        border-color: rgba(220,38,38,.75) !important;
        box-shadow: 0 0 0 3px rgba(220,38,38,.18) !important;
        background: rgba(255,255,255,1) !important;
      }

      /* select는 focus가 다를 수 있어서 focus-within도 보강 */
      .${FLD_CLS}:focus-within{
        border-color: rgba(220,38,38,.75) !important;
        box-shadow: 0 0 0 3px rgba(220,38,38,.18) !important;
      }
    `;
    document.head.appendChild(st);
  }

  function markWarnLabelsAndFields(){
    ensureStyle();

    // 라벨 텍스트 기준(현재 UI 라벨과 동일)
    const targets = new Set(['박스개수', '원단 절수', '용지 절수']);

    const labs = Array.from(document.querySelectorAll('.lab'));
    for(const lab of labs){
      const t = String(lab.textContent || '').replace(/\s+/g,' ').trim();
      if(!targets.has(t)) continue;

      // 라벨 강조
      lab.classList.add(LAB_CLS);

      // renderInputs 구조: lab 다음 형제가 .field
      const fieldCell = lab.nextElementSibling;
      if(!fieldCell || !fieldCell.classList || !fieldCell.classList.contains('field')) continue;

      // 실제 컨트롤 찾아서 강조(입력/셀렉트/텍스트영역)
      const ctl = fieldCell.querySelector('input, select, textarea');
      if(ctl) ctl.classList.add(FLD_CLS);
    }
  }

  // renderInputs가 다시 그리면 클래스가 사라지므로, renderInputs 후킹으로 재적용
  if(typeof window.renderInputs === 'function' && !window.renderInputs.__warnLabelsHookedV2){
    const _orig = window.renderInputs;
    window.renderInputs = function(...args){
      const r = _orig.apply(this, args);
      try{ markWarnLabelsAndFields(); }catch(_){}
      return r;
    };
    window.renderInputs.__warnLabelsHookedV2 = true;
  }

})();


/* =========================
   운송비참조 업데이트 (운송비참조(26년도).xlsx / A2:M71) - FULL
   - head/rows 주입
   - 지역 셀 빈 행 fill-down 처리
   - shipTruck 옵션에 '5톤(윙)' 보강
   - normalizeTruckName: '3.5톤 광폭' -> '3.5광폭' 매칭 보정
========================= */
(function SHIPPING_REF_26Y_PATCH_FULL_V1(){
  const KEY = '운송비참조';

  // ✅ 엑셀 헤더 그대로 사용
  const head = ['지역','하차지','다마스','라보','1톤','1.4톤','2.5톤','3.5톤','3.5광폭','5톤','5톤플','5톤(윙)','11톤'];

  // ✅ A2:M71 전체(지역 빈칸은 fill-down으로 처리)
  const rawRows = [
    // 서울
    ['서울','강서구/양천',4.5,5,6,7,9,10,11,14,15,17,18],
    ['','영등포/금천/구로/마포',5,6,6.5,7,10,11,13,14,16,18,19],
    ['','관악구/용산/동작/서대문',5,6,7,8,11,12,13,15,17,18,19],
    ['','동대문구/중구/종로',5.5,6,7,8.5,11,12,14,16,18,19,20],
    ['','강남구/서초',5.5,6,7,8.5,11,12,14,16,18,19,20],
    ['','수서/송파/성동/강동/광진',5.5,6,7,8.5,11,12,14,16,18,19,20],
    ['','강북/노원/도봉/면목',5.5,6,7,8.5,11,12,14,16,17,18,19],
    ['','중랑/신내/망우',5.5,6,7,8.5,11,12,14,16,18,19,20],

    // 인천
    ['인천','당하동/서부공단',3,3.5,4.5,5.5,7,8,9,10,12,13,14],
    ['','계산/박촌',4,4.5,5,6,8,9,10,11,12,13,16],
    ['','가좌/석남/도화/십정',4,4.5,5.5,6.5,8,9,10,11,13,14,16],
    ['','동인천/월미도/터미널',4,4.5,5.5,6.5,8,9,10,11,13,15,16],
    ['','남동공단/연안부두/송도',4,4.5,5.5,6.5,8,9,10,11,13,14,17],
    ['','강화',3,4,5,6,7,8,9,10,12,13,15],
    ['','인천공항/영종도',5,5.5,7,8,11,12,13,14,16,17,18],

    // 경기도
    ['경기도','김포 관내/학운리',2.5,3,3.5,4.5,5,6,7,8,9,11,13],
    ['','풍무/운양/장기',3,3.5,4,4.5,6,7,8,9,10,11,13],
    ['','고촌',3.5,4,4.5,5.5,7,8,9,10,11,12,14],
    ['','부천/송내',4,4.5,5.5,6.5,8,9,10,11,13,15,16],
    ['','광명/군포/시흥/안산/안양',4.5,5,6,7,10,11,13,14,15,17,19],
    ['','일산/고양',4,4.5,5,6,8,9,10,11,12,13,15],
    ['','파주/문산/광탄/탄현',4.5,5,6,7,8,9,10,11,13,15,17],
    ['','임진각/적성/법원리',5,6,7,8,9,10,12,13,15,16,17],
    ['','비봉/수원/성남/하남/판교',6,7,8,9,12,13,15,17,19,21,22],
    ['','화성/동탄/오산',6,7,8,9,12,13,15,17,19,21,22],
    ['','광주/마석/오포/곤지암',6,7,8,9,13,14,15,17,19,21,22],
    ['','용인/양지',7,8,9,10,13,14,16,18,20,21,23],
    ['','의정부/퇴계원/구리',5.5,6,7,9,11,12,14,17,19,21,23],
    ['','양주/남양주/별내/진접/연천',6,7,8,9,11,12,14,16,17,18,22],
    ['','동두천',6,7,8,9,12,13,15,17,19,20,22],
    ['','포천/일동',6.5,7.5,9,10,14,15,17,18,19,21,23],
    ['','이천/백암',7,8,10,11,15,16,17,19,21,22,23],
    ['','여주',8,9,11,12,15,16,18,19,21,22,24],
    ['','가평/양평/강촌',8,9,11,12,15,16,18,19,21,22,23],
    ['','평택/송탄/안중',7,8,9,10,14,15,17,19,21,23,24],
    ['','안성',7,8,10,11,14,15,17,19,21,23,24],

    // 강원도
    ['강원도','철원/춘천',11,12,13,14,17,18,19,20,22,23,26],
    ['','횡성/홍천',10,11,15,16,19,21,22,23,25,26,28],
    ['','문막/원주',11,12,13,14,17,18,19,20,22,23,30],
    ['','인제/평창/화천',14,16,19,20,25,26,29,30,32,34,36],
    ['','강릉/속초/양양',16,18,22,23,28,29,33,35,37,39,42],
    ['','영월/정선/태백',16,18,22,23,29,30,33,35,37,39,42],
    ['','동해/삼척',17,19,22,23,28,29,33,35,37,39,42],

    // 충청
    ['충청','당진/아산/천안',9,10,12,13,16,17,18,19,21,22,24],
    ['','음성/예산/진천',10,11,12,13,17,18,19,20,22,24,25],
    ['','세종/조치원/증평/청주/충주',10,11,13,14,18,19,20,22,24,26,28],
    ['','대전/홍성/청양/서산',11,12,15,16,19,20,22,24,26,27,30],
    ['','괴산/보은/제천/태안',11,12,14,16,19,20,22,24,26,27,29],
    ['','공주/금산/논산/부여',12,13,15,17,19,21,23,28,29,30,31],
    ['','단양/대천/보령/안면도/영동',13,14,16,17,19,20,22,28,29,30,31],

    // 전라도
    ['전라도','군제/김제/익산/완주/전주',13,14,17,18,23,25,27,28,30,32,37],
    ['','부안/임실/정읍/진안',14,15,19,21,25,26,28,35,37,38,38],
    ['','덕유/무주/장수',14,15,19,21,25,26,28,35,37,38,40],
    ['','고창/남원/순창',14,15,21,22,25,26,36,35,37,38,41],
    ['','광주/곡성/영광/장성/함평',17,19,23,25,28,29,32,37,39,41,46],
    ['','무안/나주/화순',18,20,26,28,32,33,35,37,39,41,46],
    ['','광양/담양/순천',18,20,26,27,32,34,35,37,39,41,47],
    ['','목포/보성/여수/영암',20,22,25,27,34,35,37,40,42,44,51],
    ['','고흥/강진/완도/장흥/진도/해남',21,23,27,29,34,35,38,41,44,45,51],

    // 경상도
    ['경상도','대구',15,16,19,21,28,29,33,36,38,39,43],
    ['','김천/구미/문경/왜관',15,16,19,21,28,29,35,34,36,38,40],
    ['','상주/안동',17,18,20,21,26,27,30,35,37,39,40],
    ['','고령/경산/청도/청송',17,18,20,22,30,31,33,36,38,40,44],
    ['','경주/백양/영천/함양',19,20,21,25,30,31,33,37,39,41,46],
    ['','영덕/울진/포항',21,23,25,26,32,34,36,39,41,43,48],
    ['','거창/산청/창녕/하동/합천',20,21,22,25,33,34,35,40,42,44,47],
    ['','밀양/양산/언양/울산/울주',20,22,24,26,33,34,36,40,42,44,51],
    ['','마산/진주/진해/창원',21,23,25,27,33,34,36,40,42,44,51],
    ['','김해/부산/사천',22,23,25,27,33,34,36,40,42,44,53],
    ['','거재/통영',21,23,26,29,35,37,38,41,43,45,54],
  ];

  function fillDownRegion(rows){
    let last = '';
    return rows.map(r=>{
      const out = Array.isArray(r) ? r.slice() : [];
      const region = String(out[0] ?? '').trim();
      if(region) last = region;
      else out[0] = last;
      return out;
    }).filter(r => String(r[0]||'').trim() && String(r[1]||'').trim());
  }

  // (1) REF_SAMPLE 덮어쓰기
  window.REF_SAMPLE = window.REF_SAMPLE || {};
  window.REF_SAMPLE[KEY] = { head, rows: fillDownRegion(rawRows) };

  // (2) REF_SHEETS 목록 보장
  window.REF_SHEETS = window.REF_SHEETS || [];
  if(!window.REF_SHEETS.some(s => s && s.key === KEY)){
    window.REF_SHEETS.push({ key: KEY, title: KEY });
  }

  // (3) shipTruck 옵션에 5톤(윙) 보강 (FIELD_DEFS가 존재하면)
  try{
    if(typeof FIELD_DEFS !== 'undefined' && Array.isArray(FIELD_DEFS)){
      const def = FIELD_DEFS.find(d => d && d.key === 'shipTruck');
      if(def && Array.isArray(def.options)){
        if(!def.options.includes('5톤(윙)')){
          const idx = def.options.indexOf('5톤플');
          if(idx >= 0) def.options.splice(idx + 1, 0, '5톤(윙)');
          else def.options.push('5톤(윙)');
        }
      }
    }
  }catch(_){}

  // (4) normalizeTruckName 매칭 보정
  //     - 엑셀 헤더: '3.5광폭'
  //     - 기존 UI 옵션: '3.5톤 광폭'일 수 있으므로 -> '3.5광폭'로 변환해 head.indexOf가 성공하도록
  try{
    // 기존 함수가 있으면 보강 형태로 교체
    const _old = (typeof normalizeTruckName === 'function') ? normalizeTruckName : null;

    normalizeTruckName = function(truck){
      let t = String(truck || '').trim();

      // 기존 규칙 먼저 적용(있으면)
      if(_old){
        try{ t = String(_old(t) || '').trim(); }catch(_){}
      }

      // ✅ 핵심 매핑
      if(t === '3.5톤 광폭') return '3.5광폭';
      if(t === '3.5광폭') return '3.5광폭';

      if(t === '5톤윙') return '5톤(윙)';
      if(t === '5톤(윙)') return '5톤(윙)';

      return t;
    };
  }catch(_){}

  // (5) UI 반영
  try{ if(typeof refreshShipDatalists === 'function') refreshShipDatalists(); }catch(_){}
  try{ if(typeof renderInputs === 'function') renderInputs(); }catch(_){}
  try{ if(typeof recalcLite === 'function') recalcLite(); }catch(_){}
})();


/* PWA install button FINAL (SAFE: waits for DOM and null-guards) */
(function PWA_INSTALL_BUTTON_FINAL(){
  if(window.__PWA_INSTALL_BUTTON_FINAL_SAFE__) return;
  window.__PWA_INSTALL_BUTTON_FINAL_SAFE__ = true;

  function init(){
    function hostEl(){
      return document.querySelector('.actions') || document.body || null;
    }

    function ensureBtn(){
      const host = hostEl();
      if(!host) return null;

      let btn = document.getElementById('btnInstallPwa');
      if(btn) return btn;

      btn = document.createElement('button');
      btn.id = 'btnInstallPwa';
      btn.type = 'button';
      btn.className = 'btn';
      btn.textContent = '설치';
      btn.style.marginLeft = '6px';
      host.appendChild(btn);

      btn.addEventListener('click', async () => {
        const dp = window.__pwaDeferredPrompt;
        if(!dp){
          alert('아직 설치할 수 없는 상태입니다. (설치 이벤트 미발생)');
          return;
        }
        dp.prompt();
        await dp.userChoice;
        window.__pwaDeferredPrompt = null;
        setEnabled(false);
      });

      return btn;
    }

    function setEnabled(on){
      const btn = ensureBtn();
      if(!btn) return;
      btn.disabled = !on;
      btn.style.opacity = on ? '1' : '0.45';
      btn.title = on ? '클릭해서 설치' : '설치 불가/대기중';
    }

    // 항상 버튼은 보이게(단, host가 생긴 뒤)
    ensureBtn();
    setEnabled(!!window.__pwaDeferredPrompt);

    window.addEventListener('pwa:installable', ()=> setEnabled(true));

    window.addEventListener('beforeinstallprompt', (e)=>{
      e.preventDefault();
      window.__pwaDeferredPrompt = e;
      setEnabled(true);
    });

    window.addEventListener('appinstalled', ()=>{
      window.__pwaDeferredPrompt = null;
      const btn = document.getElementById('btnInstallPwa');
      if(btn) btn.style.display = 'none';
    });
  }

  // ✅ DOM 준비 후 init 실행
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  }else{
    init();
  }
})();

