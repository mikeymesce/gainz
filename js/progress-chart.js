// ═══════════════════════════════════════════
// PROGRESS CHART — SVG chart, no libs
// ═══════════════════════════════════════════

let progChartMode = "1rm"; // "1rm" | "vol"

export function setProgChartMode(mode){
  progChartMode = mode;
  render();
}


export function buildProgChart(sessions, exName){
  if(!sessions || sessions.length < 2) return '';
  const W=320, H=160, padL=46, padR=12, padT=14, padB=32;
  const IW=W-padL-padR, IH=H-padT-padB;

  const pts = sessions.map(w => {
    const e = w.exercises.find(e => e.name === exName);
    if(!e) return null;
    const rm = Math.max(0, ...e.sets.filter(s => !s.bw && parseFloat(s.weight) > 0).map(s => est1RM(s.weight, s.reps)));
    const v = vol(e.sets);
    return { date: w.date, ts: w.timestamp, rm, v };
  }).filter(Boolean);

  if(pts.length < 2) return '';
  const vals = pts.map(p => progChartMode === "1rm" ? p.rm : p.v).filter(v => v > 0);
  if(!vals.length) return '';

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const step = Math.ceil(range/3/5)*5 || 5;
  const yBase = Math.floor(minV/step)*step;
  const yTops = [yBase, yBase+step, yBase+step*2, yBase+step*3].filter(y => y <= maxV+step);

  function px(i){ return padL + (i/(pts.length-1))*IW; }
  function py(v){ return padT + IH - ((v-yBase)/(yTops[yTops.length-1]-yBase||1))*IH; }

  const lineCoords = pts.map((p, i) => {
    const v = progChartMode === "1rm" ? p.rm : p.v;
    return v > 0 ? `${px(i).toFixed(1)},${py(v).toFixed(1)}` : null;
  }).filter(Boolean).join(' ');

  const firstX=px(0).toFixed(1), lastX=px(pts.length-1).toFixed(1), baseY=(padT+IH).toFixed(1);
  const areaPath = `M${firstX},${baseY} ` + pts.map((p, i) => {
    const v = progChartMode === "1rm" ? p.rm : p.v;
    return v > 0 ? `L${px(i).toFixed(1)},${py(v).toFixed(1)}` : '';
  }).filter(Boolean).join(' ') + ` L${lastX},${baseY} Z`;

  const grids = yTops.map(y => {
    const yy = py(y).toFixed(1);
    const lbl = progChartMode === "1rm" ? y+"lb" : y >= 1000 ? (y/1000).toFixed(1)+"k" : y+"lb";
    return `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="#1e1e24" stroke-width="1"/>
    <text x="${(padL-4).toFixed(0)}" y="${(parseFloat(yy)+3.5).toFixed(1)}" text-anchor="end" font-size="8" fill="#3a3630">${lbl}</text>`;
  }).join('');

  const xIdxs = [0, Math.floor((pts.length-1)/2), pts.length-1].filter((v,i,a) => a.indexOf(v)===i);
  const xLabels = xIdxs.map(i => {
    const d = pts[i].date; const parts = d.split('-');
    const lbl = parts.length === 3 ? parts[1]+'/'+parts[2].slice(0,2) : d.slice(5);
    return `<text x="${px(i).toFixed(1)}" y="${(H-4).toFixed(0)}" text-anchor="middle" font-size="8" fill="#3a3630">${lbl}</text>`;
  }).join('');

  const dots = pts.map((p, i) => {
    const v = progChartMode === "1rm" ? p.rm : p.v;
    if(!v) return '';
    const isLast = i === pts.length-1;
    return `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="${isLast?4:2.5}" fill="${isLast?'var(--accent)':'rgba(232,213,160,0.4)'}" stroke="${isLast?'#1a1510':'none'}" stroke-width="${isLast?1.5:0}"/>`;
  }).join('');

  const lastPt = pts[pts.length-1];
  const lastV = progChartMode === "1rm" ? lastPt.rm : lastPt.v;
  const lastLbl = progChartMode === "1rm" ? lastV+"lb" : lastV >= 1000 ? (lastV/1000).toFixed(1)+"k lb" : lastV+"lb";
  const lx = px(pts.length-1), ly = py(lastV);
  const lblAnchor = lx > W*0.7 ? "end" : "start";
  const lblOff = lx > W*0.7 ? -8 : 8;

  const mode1 = progChartMode === "1rm";
  const toggleHtml = `<div style="display:flex;gap:6px;justify-content:center;margin-bottom:10px;">
    <button onclick="setProgChartMode('1rm')" style="padding:5px 14px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;border:1px solid ${mode1?'var(--accent)':'var(--border2)'};background:${mode1?'var(--accentFaint)':'var(--bg3)'};color:${mode1?'var(--accent)':'var(--muted)'};">EST. 1RM</button>
    <button onclick="setProgChartMode('vol')" style="padding:5px 14px;border-radius:20px;font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:1px;cursor:pointer;border:1px solid ${!mode1?'var(--accent)':'var(--border2)'};background:${!mode1?'var(--accentFaint)':'var(--bg3)'};color:${!mode1?'var(--accent)':'var(--muted)'};">VOLUME</button>
  </div>`;

  const svgHtml = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible;" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(232,213,160,0.15)"/>
        <stop offset="100%" stop-color="rgba(232,213,160,0)"/>
      </linearGradient>
    </defs>
    ${grids}
    ${xLabels}
    <path d="${areaPath}" fill="url(#chartGrad)"/>
    <polyline points="${lineCoords}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${(lx+lblOff).toFixed(1)}" y="${(ly-7).toFixed(1)}" text-anchor="${lblAnchor}" font-size="9" fill="var(--accent)" font-weight="bold">${lastLbl}</text>
  </svg>`;

  return toggleHtml + `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:12px 8px 4px;">${svgHtml}</div>`;
}
