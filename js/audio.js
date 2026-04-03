// ═══════════════════════════════════════════
// AUDIO — Sound effects
// ═══════════════════════════════════════════
export function playBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();

    // Compressor to make it loud and punchy without clipping
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-6;
    comp.knee.value=3;
    comp.ratio.value=4;
    comp.attack.value=0.001;
    comp.release.value=0.1;
    comp.connect(ctx.destination);

    // Boxing bell: inharmonic partials for that real metal "clang"
    // Higher fundamental (1175 Hz) = bright, sharp bell vs. the old dull 880 Hz
    function ding(t){
      [
        // [freq Hz, peak gain, decay sec]
        [1175,  0.90, 2.2 ],  // fundamental — the main "note"
        [2349,  0.40, 1.6 ],  // 2nd harmonic
        [3663,  0.30, 1.1 ],  // inharmonic 3rd — key metallic texture
        [4698,  0.18, 0.7 ],  // 4th harmonic
        [7031,  0.12, 0.35],  // upper shimmer
        [11760, 0.50, 0.03],  // attack clank — instant pop, very fast decay
        [15680, 0.35, 0.02],  // ultra-high transient for the "clang" punch
      ].forEach(([freq,peak,decay])=>{
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.connect(g); g.connect(comp);
        o.type='sine';
        o.frequency.value=freq;
        g.gain.setValueAtTime(0.001,t);
        g.gain.exponentialRampToValueAtTime(peak,t+0.002); // sharp attack
        g.gain.exponentialRampToValueAtTime(0.001,t+decay);
        o.start(t); o.stop(t+decay+0.05);
      });
    }

    ding(ctx.currentTime);         // first ding
    ding(ctx.currentTime+0.20);    // second ding — 200ms later, boxing bell rhythm
  }catch(e){}
}
