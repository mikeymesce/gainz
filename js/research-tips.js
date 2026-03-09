// ═══════════════════════════════════════════
// RESEARCH TIPS — Tip panels + Research Library
// ═══════════════════════════════════════════
import { RESEARCH_TIPS, TIP_CATEGORIES } from './data.js';

// ── Tip panel state (per-exercise) ──
let dismissedTips = new Set();
let shownTips = new Set();
let activeTipCat = {};

export function getTips(exName){
  return RESEARCH_TIPS[exName] || null;
}

export function hasTipShown(exName){
  return shownTips.has(exName);
}

export function openTip(exName){
  shownTips.add(exName);
  dismissedTips.delete(exName);
  render();
}

export function dismissTip(exName){
  shownTips.delete(exName);
  dismissedTips.add(exName);
  haptic("light");
  render();
}

export function setTipCat(exName, cat){
  activeTipCat[exName] = cat;
  render();
}

export function cycleTipCat(exName, dir){
  const cur = activeTipCat[exName] || TIP_CATEGORIES[0].key;
  const idx = TIP_CATEGORIES.findIndex(c => c.key === cur);
  const next = TIP_CATEGORIES[(idx + dir + TIP_CATEGORIES.length) % TIP_CATEGORIES.length];
  activeTipCat[exName] = next.key;
  haptic("light");
  render();
}

export function buildTipPanel(exName){
  const tips = getTips(exName);
  if(!tips) return "";
  if(!shownTips.has(exName)) return "";
  const cat = activeTipCat[exName] || TIP_CATEGORIES[0].key;
  const catIdx = TIP_CATEGORIES.findIndex(c => c.key === cat);
  const catData = tips[cat];
  const dots = TIP_CATEGORIES.map((_, i) =>
    `<div class="tip-dot${i===catIdx?' on':''}"></div>`
  ).join('');
  let cite = '';
  if(catData){
    const raw = catData.source || '';
    const authorPart = raw.split(/[,;]/)[0].trim();
    const shortAuthor = authorPart.length > 28 ? authorPart.slice(0, 28) + '…' : authorPart;
    cite = `${shortAuthor} · ${catData.year}`;
  }
  return `<div class="tip-panel">
    <div class="tip-panel-head">
      <span class="tip-cite" style="opacity:0.5;">📚 research</span>
      <button class="tip-dismiss" onclick="dismissTip(${esc(exName)})">✕</button>
    </div>
    <div class="tip-text">${catData ? catData.tip : '—'}</div>
    <div class="tip-footer">
      <div class="tip-dots">${dots}</div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${cite ? `<span class="tip-cite">${cite}</span>` : ''}
        <div class="tip-nav-row">
          <button class="tip-nav" onclick="cycleTipCat(${esc(exName)},-1)">‹</button>
          <button class="tip-nav" onclick="cycleTipCat(${esc(exName)},1)">›</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Research Library ──
let libOpenEx = null;
let libActiveCat = {};

export function openLibrary(){
  const el = document.getElementById("res-library");
  const list = document.getElementById("res-library-list");
  const exercises = Object.keys(RESEARCH_TIPS).sort();
  list.innerHTML = exercises.map(ex => {
    const isOpen = libOpenEx === ex;
    const firstTip = RESEARCH_TIPS[ex][TIP_CATEGORIES[0].key];
    const tabs = TIP_CATEGORIES.map(c => {
      const active = (libActiveCat[ex] || TIP_CATEGORIES[0].key) === c.key;
      return `<button style="font-size:9px;padding:5px 10px;border-radius:8px;border:1px solid ${active?c.color:'#1e1e24'};background:${active?c.color+'22':'transparent'};color:${active?c.color:'var(--muted)'};font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:1px;transition:all .15s;margin:2px;" onclick="libSetCat(${esc(ex)},${esc(c.key)});event.stopPropagation();">${c.label}</button>`;
    }).join("");
    const cat = libActiveCat[ex] || TIP_CATEGORIES[0].key;
    const tipData = RESEARCH_TIPS[ex][cat];
    return `<div class="lib-ex-card${isOpen?" open":""}" onclick="libToggle(${esc(ex)})">
      <div class="lib-ex-name">${ex}<span class="pick-badge">📚</span></div>
      ${!isOpen ? `<div class="lib-ex-preview">${firstTip ? firstTip.tip.slice(0, 60) + "…" : ""}</div>` : ""}
      <div class="lib-detail">
        <div class="lib-tab-row">${tabs}</div>
        ${tipData ? `<div class="lib-tip-body">${tipData.tip}</div><div class="lib-tip-src">${tipData.source} (${tipData.year})</div>` : ""}
      </div>
    </div>`;
  }).join("");
  el.classList.add("open");
}

export function closeLibrary(){
  document.getElementById("res-library").classList.remove("open");
}

export function libToggle(ex){
  libOpenEx = libOpenEx === ex ? null : ex;
  openLibrary();
}

export function libSetCat(ex, cat){
  libActiveCat[ex] = cat;
  openLibrary();
}
