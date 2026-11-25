// Playback speed scales the induction (owner, 25 Nov 2026: "9x doesn't speed up the induction at all"). Every lag is in sim
// seconds, so the wall time from Induce, or from a new pump target, to BIS under 60 falls with the speed: at 9x it is under a
// quarter of the 1x time, on the main page (Induce, engine lag) and on /workshop/ (the TCI pump). Also: a manual pump change
// clears an old Induce or Emerge caption.
// Run with a static server in the repo root: PORT=8080 node eeg/test/speed.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const BASE=`http://localhost:${process.env.PORT||8080}/eeg/`;
const errors=[];
async function open(path){const page=await browser.newPage({viewport:{width:1280,height:860}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+path);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10);return page;}
const setTgt=(page,v)=>page.evaluate(v=>{const el=$('pTgt');el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},v);
// start an induction at speed s, then wait (wall clock) until BIS has stayed under 60 for 10 sim seconds;
// returns [wall s, sim s] at the first crossing of that run
const induce=(page,how,s,limit)=>page.evaluate(async([how,s,limit])=>{setSpeed(s);
 if(how==='pump'){if(!PUMP.on)pumpStart();$('pTgt').value=6;$('pTgt').dispatchEvent(new Event('input'));}
 else{if(typeof PUMP!=='undefined'&&PUMP.on)pumpOff();$('induceBtn').click();}
 const t0=performance.now(),s0=simT;let a=null;
 while(performance.now()-t0<limit*1000){await new Promise(r=>setTimeout(r,50));const w=(performance.now()-t0)/1000,st=simT-s0;
  if(bisS!=null&&bisS<60){if(!a)a=[w,st];if(st-a[1]>=10)return a;}else a=null;}
 return null;},[how,s,limit]);
// the same induction run instantly (tlRun, 1-s sim steps) with the speed set: sim seconds to BIS under 60
const simTo60=(page,how,s)=>page.evaluate(([how,s])=>{setSpeed(s);paused=true;
 if(how==='pump'){if(!PUMP.on)pumpStart();pumpSet({target:6});}else{if(typeof PUMP!=='undefined'&&PUMP.on)pumpOff();$('induceBtn').click();paused=true;}
 for(let t=1;t<=400;t++){tlRun(1);if(bisS<60){let ok=true;for(let k=0;k<10;k++){tlRun(1);if(bisS>=60)ok=false;}if(ok)return t;}}return null;},[how,s]);
try{
 // 1. the speed is only a clock: the same induction takes the same sim time at 1x and 9x (engine lag and pump)
 for(const [path,how] of [['','induce'],['workshop/','pump']]){const at={};
  for(const s of [1,9]){const page=await open(path);at[s]=await simTo60(page,how,s);await page.close();}
  assert.ok(at[1]&&at[9],`${how}: BIS reaches 60 (${JSON.stringify(at)})`);
  assert.ok(Math.abs(at[9]-at[1])<=Math.max(8,0.25*at[1]),`${how}: sim time to BIS 60 does not depend on speed: ${JSON.stringify(at)}`);}
 // 2. wall clock, main page Induce: 9x under a quarter of 1x
 let page=await open('');const w1=await induce(page,'induce',1,90);await page.close();
 page=await open('');const w9=await induce(page,'induce',9,30);await page.close();
 assert.ok(w1&&w9,`Induce reaches BIS 60 at 1x and 9x: ${JSON.stringify({w1,w9})}`);
 assert.ok(w9[0]<w1[0]/4,`Induce at 9x is under a quarter of the 1x wall time: ${w9[0].toFixed(1)} s vs ${w1[0].toFixed(1)} s`);
 // 3. wall clock, /workshop/ pump target 6 µg/ml at 9x: under a quarter of the 1x sim time (= the 1x wall time)
 page=await open('workshop/');const p9=await induce(page,'pump',9,40);
 const pg1=await open('workshop/');const p1=await simTo60(pg1,'pump',1);await pg1.close();
 assert.ok(p9&&p1,`pump induction reaches BIS 60: ${JSON.stringify({p9,p1})}`);
 assert.ok(p9[0]<p1/4,`pump induction at 9x is under a quarter of the 1x time: ${p9[0].toFixed(1)} s vs ${p1} s`);
 // 4. the caption: Emerge, then a new pump target, leaves no "Emergence" caption; Induce writes its own
 await page.click('#wakeBtn');assert.match(await page.locator('#storyCap').textContent(),/^Emergence/);
 await setTgt(page,6.3);assert.equal(await page.locator('#storyCap').textContent(),'','a new target clears the Emerge caption');
 await page.click('#induceBtn');assert.match(await page.locator('#storyCap').textContent(),/^Induction/);
 await setTgt(page,2);assert.equal(await page.locator('#storyCap').textContent(),'','a new target clears the Induce caption');
 assert.deepEqual(errors,[],'no page errors');
 console.log(`PASS speed: Induce ${w1[0].toFixed(1)} s at 1x, ${w9[0].toFixed(1)} s at 9x; pump to BIS 60 ${p1} s at 1x (sim), ${p9[0].toFixed(1)} s at 9x; captions`);
}finally{await browser.close();}
