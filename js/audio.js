// ═══════════════════════════════════════════
// AUDIO — Sound effects
// ═══════════════════════════════════════════
export function playBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [[0,440,0.8],[1.0,523,0.8]].forEach(([start,freq,dur])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type="sine"; o.frequency.value=freq;
      g.gain.setValueAtTime(0,ctx.currentTime+start);
      g.gain.linearRampToValueAtTime(0.15,ctx.currentTime+start+0.12);
      g.gain.setValueAtTime(0.15,ctx.currentTime+start+dur-0.2);
      g.gain.linearRampToValueAtTime(0,ctx.currentTime+start+dur);
      o.start(ctx.currentTime+start); o.stop(ctx.currentTime+start+dur+0.05);
    });
  }catch(e){}
}
