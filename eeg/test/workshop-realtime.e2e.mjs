// The raw EEG sweeps at real time at any sim speed (25 Nov 2026): at 5x the DSA, BIS and clock run 5x, but every skin's EEG strip
// (classic, Medtronic, BIS Advance with both hemispheres, SedLine, IntelliVue) advances about as many samples (so pixels) per
// second as at 1x; at 1x the strip is the engine's own signal, unchanged.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-realtime.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1280,height:860}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const BASE=`http://localhost:${process.env.PORT||8080}/eeg/`;
// per real second over ~1.5 s: the display stream (left, right), the skin's own sweep counter, and the sim's samples
const rate=(skin,spd)=>page.evaluate(async([skin,spd])=>{applySkin(skin);setSpeed(spd);await new Promise(r=>setTimeout(r,400));
 const own=()=>skin==='sedline'?(SED.eg?SED.eg.n*FS/SED_FS:0):skin==='philips'?(PV.wv?PV.wv.t*FS:0):dProduced;
 const a={d:dProduced,r:R.dProduced,o:own(),p:produced,t:performance.now()};await new Promise(r=>setTimeout(r,1500));
 const s=(performance.now()-a.t)/1000;return {d:(dProduced-a.d)/s,r:(R.dProduced-a.r)/s,o:(own()-a.o)/s,p:(produced-a.p)/s};},[skin,spd]);
try{
 await page.goto(BASE+'?workshop=1&case=tci&quiz=1');await page.waitForFunction(()=>typeof story!=='undefined'&&story&&COLS.length>10);
 assert.equal(await page.evaluate(()=>speed),5,'cases play at 5x');
 for(const skin of ['advance','vista','sedline','philips','classic']){
  const one=await rate(skin,1),five=await rate(skin,5);
  assert.ok(five.p>3*one.p,`${skin}: the sim runs faster at 5x (${one.p.toFixed(0)} -> ${five.p.toFixed(0)} samples/s)`);
  for(const k of ['d','r','o']){const q=five[k]/one[k];assert.ok(q>0.7&&q<1.4,`${skin}: strip ${k} at 5x ${five[k].toFixed(0)}/s vs 1x ${one[k].toFixed(0)}/s`);}
  assert.ok(Math.abs(five.d-128)<128*0.35,`${skin}: about 128 samples per real second at 5x (${five.d.toFixed(0)})`);
 }
 // 1x: the strip is the sim's own signal; 5x: its own real-time samples, still a live EEG (not flat, not clipped)
 const same=await page.evaluate(async()=>{setSpeed(1);await new Promise(r=>setTimeout(r,2500));const n=200;
  return DSIG.slice(-n).every((v,i)=>v===SIG[SIG.length-n+i]);});assert.ok(same,'at 1x the strip is SIG itself');
 const live=await page.evaluate(async()=>{setSpeed(5);await new Promise(r=>setTimeout(r,1200));const x=DSIG.slice(-FS);
  const m=x.reduce((a,v)=>a+v,0)/x.length,sd=Math.sqrt(x.reduce((a,v)=>a+(v-m)**2,0)/x.length);return sd;});
 assert.ok(live>2&&live<200,'5x strip is a live EEG, sd '+live.toFixed(1)+' uV');
 assert.deepEqual(errors,[]);console.log('workshop real-time EEG: ok');
}finally{await browser.close();}
