// ═══════════════════════════════════════════
// UTILS — Pure helper functions (no state dependency)
// ═══════════════════════════════════════════
import { FEATURES } from './config.js';

// ── Formatting ──
export function today(){ return new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); }
export function todayStr(){ return new Date().toDateString(); }
export function fmt(s){ s=Math.max(0,s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }
export function fmtMs(ms){ const s=Math.floor(ms/1000),m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; }
export function vol(sets){ return sets.reduce((a,s)=>{
  let v=(s.bw||s.warmup?0:(parseFloat(s.weight)||0))*(parseInt(s.reps)||0);
  if(s.drops) v+=s.drops.reduce((da,d)=>da+(parseFloat(d.weight)||0)*(parseInt(d.reps)||0),0);
  return a+v;
},0); }
export function est1RM(w,r){ const wn=parseFloat(w)||0,rn=parseInt(r)||1; return rn===1?Math.round(wn):Math.round(wn*(1+rn/30)); }
export function sid(n){ return (n||"").replace(/[^a-zA-Z0-9]/g,"-"); }
export function esc(v){ return JSON.stringify(v).replace(/"/g,'&quot;'); }
export function sanitize(str){ return String(str||"").replace(/[<>"'`\\]/g,"").trim().slice(0,100); }

// ── Toast ──
export function showToast(msg, duration=3000){
  const el=document.createElement("div");
  el.className="gainz-toast";
  el.textContent=msg;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.style.opacity="1");
  setTimeout(()=>{el.style.opacity="0";setTimeout(()=>el.remove(),200);},duration);
}

// ── Haptic ──
export function haptic(type="light"){
  if(!FEATURES.hapticFeedback||!navigator.vibrate) return;
  const patterns={light:[10],medium:[20],heavy:[30,10,30],success:[10,50,10],pr:[30,20,30,20,60]};
  navigator.vibrate(patterns[type]||[10]);
}

// ── Confetti ──
export function confetti(){
  if(!FEATURES.confettiOnPR) return;
  const colors=["#e8d5a0","#c8b070","#ffffff","#52c87a"];
  for(let i=0;i<30;i++){
    const el=document.createElement("div");
    el.style.cssText=`position:fixed;top:20%;left:${Math.random()*100}%;width:8px;height:8px;background:${colors[i%4]};border-radius:50%;pointer-events:none;z-index:9999;animation:confettiFall 1.2s ease-out forwards;animation-delay:${Math.random()*0.3}s`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1800);
  }
}
