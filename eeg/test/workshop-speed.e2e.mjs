// Workshop speed keys (owner, 25 Nov 2026: "It should increase the speed of everything, except of course the EEG itself ... six
// buttons"). Clicks the real 1x 3x 5x 10x 30x 60x keys (no setSpeed calls) and checks:
// 1. the six keys fit the dock at iPad and phone sizes, 44 px each, one pressed (5x when a case starts);
// 2. the wall time to BIS under 60 after Induce, and after a pump target of 6 µg/ml, falls as 1/speed at 1x, 10x and 60x, and
//    the sim time to it is the same at every speed;
// 3. the DSA adds columns at speed x real time while the raw EEG trace is fed at 128 samples a second at any speed;
// 4. 60x holds under a 4x CPU throttle (an iPad-class CPU): the sim clock runs at 60x within 10%.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-speed.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const URL0=`http://localhost:${process.env.PORT||8080}/eeg/workshop/`;
const errors=[];
async function open(q='',w=1280,h=860,touch=false){const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:touch});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10);return page;}
const pressed=p=>p.evaluate(()=>[...document.querySelectorAll('#speedSeg button')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>+b.dataset.speed));
// click a speed key, start the induction with the page's own controls, then time (every frame) until BIS has stayed under 60
// for 10 sim seconds; returns {wall, sim} at the first crossing of that run
async function induce(page,how,s,limit){
 await page.click(`#speedSeg [data-speed="${s}"]`);
 assert.deepEqual(await pressed(page),[s],`${s}x key pressed`);
 // the clock starts in the same tick as the trigger (the Induce click, or the slider's input event)
 // (a real click on the target slider at 3/4 of its 0-8 track, about 6 µg/ml)
 const go=how==='pump'?async()=>{const sl=page.locator('#pTgt');await sl.scrollIntoViewIfNeeded();const b=await sl.boundingBox(),th=8;
   await page.mouse.click(b.x+th+0.75*(b.width-2*th),b.y+b.height/2);}:()=>page.click('#induceBtn');
 const arm=page.evaluate(([limit,how])=>new Promise(res=>{let t0=null,s0=0,a=null;
  window.__go=()=>{if(t0==null){t0=performance.now();s0=simT;}};
  if(how!=='pump')$('induceBtn').addEventListener('click',window.__go,{capture:true,once:true});
  else $('pTgt').addEventListener('input',window.__go,{capture:true,once:true});
  (function f(){if(t0!=null){const w=(performance.now()-t0)/1000,st=simT-s0;
    if(w>limit)return res(null);
    if(bisS!=null&&bisS<60){if(!a)a={wall:w,sim:st};if(st-a.sim>=10)return res(a);}else a=null;}
   requestAnimationFrame(f);})();}),[limit,how]);
 await page.waitForFunction(()=>typeof window.__go==='function');await go();
 if(how==='pump'){const tg=await page.evaluate(()=>PUMP.target);assert.ok(tg>=5.7&&tg<=6.3,`slider click sets about 6 µg/ml (${tg})`);}
 return arm;}
// the DSA's columns and the raw EEG's samples per wall second, over 3 s at the current speed
const rates=page=>page.evaluate(async()=>{const t0=performance.now(),c0=produced,d0=dProduced,s0=simT;await new Promise(r=>setTimeout(r,3000));
 const w=(performance.now()-t0)/1000;return {cols:(produced-c0)/HOP/w,raw:(dProduced-d0)/w,sim:(simT-s0)/w};});
try{
 // 1. the keys: six, labelled, 44 px, inside the dock, one pressed; a case starts at 5x
 for(const [w,h] of [[1180,820],[820,1180],[844,390],[390,844],[1920,1080]]){const page=await open('?case=propket',w,h,w<1500),tag=`${w}×${h}`;
  const k=await page.evaluate(()=>{const seg=$('speedSeg'),pan=seg.closest('.panel').getBoundingClientRect(),r=seg.getBoundingClientRect();
   return {labels:[...seg.querySelectorAll('button')].map(b=>b.textContent),sizes:[...seg.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect();return [q.width,q.height];}),
    inside:r.left>=pan.left-1&&r.right<=pan.right+1,fits:seg.scrollWidth<=seg.clientWidth+1,slider:!!$('speedControl').getClientRects().length};});
  assert.deepEqual(k.labels,['1×','3×','5×','10×','30×','60×'],`${tag}: six speed keys`);
  assert.ok(k.sizes.every(([a,b])=>a>=44&&b>=44),`${tag}: keys at least 44 px: ${JSON.stringify(k.sizes)}`);
  assert.ok(k.inside&&k.fits,`${tag}: the key row fits the dock`);assert.equal(k.slider,false,`${tag}: no speed slider`);
  assert.deepEqual(await pressed(page),[5],`${tag}: a case starts at 5x`);
  await page.click('#speedSeg [data-speed="30"]');assert.equal(await page.evaluate(()=>speed),30,`${tag}: 30x key sets the speed`);
  await page.close();}
 // 2. wall time to BIS under 60, Induce and pump target 6, at 1x, 10x and 60x
// (the two 1x runs go side by side to save two minutes; the faster ones one at a time)
 const T={induce:{},pump:{}},run=async(how,s)=>{const page=await open();T[how][s]=await induce(page,how,s,s===1?240:60);await page.close();
  assert.ok(T[how][s],`${how} at ${s}x reaches BIS 60`);};
 await Promise.all([run('induce',1),run('pump',1)]);
 for(const how of ['induce','pump'])for(const s of [10,60])await run(how,s);
 for(const how of ['induce','pump']){
  const [a,b,c]=[1,10,60].map(s=>T[how][s]);
  for(const [r,s] of [[b,10],[c,60]]){
   // the same course in sim time (runs differ by about ±10% from the random EEG near the BIS 60 line)
   assert.ok(Math.abs(r.sim-a.sim)<=Math.max(8,0.25*a.sim),`${how}: sim time to BIS 60 is about the same at ${s}x: ${a.sim.toFixed(1)} vs ${r.sim.toFixed(1)} s`);
   // and it plays at 1/speed of wall time: against this run's own sim time, and against the 1x wall time
   assert.ok(Math.abs(r.wall-r.sim/s)<=0.12*r.sim/s+0.25,`${how}: ${s}x plays ${r.sim.toFixed(1)} sim s in ${r.wall.toFixed(2)} wall s`);
   const want=a.wall/s;assert.ok(r.wall<=want*1.4+0.25&&r.wall>=want*0.6,`${how}: wall time at ${s}x is about 1/${s} of 1x: ${r.wall.toFixed(2)} s (1x ${a.wall.toFixed(1)} s, ideal ${want.toFixed(2)} s)`);}}
 // 3. DSA columns per wall second scale with the speed; the raw EEG feed does not
 const page=await open();const R={};
 for(const s of [1,10,60]){await page.click(`#speedSeg [data-speed="${s}"]`);R[s]=await rates(page);}
 for(const s of [1,10,60]){assert.ok(Math.abs(R[s].cols/s-1)<0.12,`DSA columns at ${s}x: ${R[s].cols.toFixed(1)}/s`);
  assert.ok(Math.abs(R[s].raw-128)<10,`raw EEG at ${s}x stays at 128 samples/s: ${R[s].raw.toFixed(1)}`);}
 // 4. 60x on an iPad-class CPU (4x throttle): the sim clock still runs at 60x within 10%
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.click('#speedSeg [data-speed="60"]');await page.waitForTimeout(500);const th=await rates(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 assert.ok(Math.abs(th.sim/60-1)<0.1,`60x holds under a 4x CPU throttle: ${th.sim.toFixed(1)}x`);
 await page.close();
 assert.deepEqual(errors,[],'no page errors');
 const f=how=>[1,10,60].map(s=>`${T[how][s].wall.toFixed(s===1?1:2)} s`).join(' / ');
 console.log(`PASS workshop speed keys: wall time to BIS 60 at 1x / 10x / 60x: Induce ${f('induce')}, pump target 6 ${f('pump')}; DSA ${R[1].cols.toFixed(1)} / ${R[10].cols.toFixed(1)} / ${R[60].cols.toFixed(1)} columns/s, raw EEG ${R[60].raw.toFixed(0)} samples/s at 60x; 60x at 4x CPU throttle runs at ${th.sim.toFixed(1)}x`);
}finally{await browser.close();}
