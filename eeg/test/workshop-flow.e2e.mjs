// Workshop flow (owner, 25 Nov 2026): Induce goes deep for laryngoscopy (Ce 6, BIS into the 20s) and drops to 3.5 after 150 s, the "Opioid on
// board" box (on by default, off in the cases), the trend and DSA start empty (page open and case start), Emerge auto-pauses once
// the index is back to about 90, and above 1x the whole raw trace is redrawn when the state moves. Controls are used with real
// clicks; page functions only fast-forward (tlRun) and read the state.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-flow.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const URL0=`http://localhost:${process.env.PORT||8080}/eeg/workshop/`;
const errors=[];
async function open(q=''){const ctx=await browser.newContext({viewport:{width:1280,height:860}});const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(`${q}: ${e.message}`));
 await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&ADV.built&&typeof PUMP!=='undefined');return page;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 // ---- 1. page open: empty trend, opioid box on ----
 let page=await open();
 let s=await page.evaluate(()=>({n:advHist('L').length,t0:ADV.t0,simT,box:$('pOpioid').getAttribute('aria-pressed')==='true',op:PUMP.opioid,mix:mix.opioid}));
 assert.ok(s.n<=5,'trend and DSA start empty on page open: '+s.n+' columns');assert.ok(s.simT-s.t0<6,'trend starts now');
 assert.equal(s.box,true,'Opioid on board ticked by default');assert.equal(s.mix,1,'the pump puts the opioid into the mix');
 // ---- 2. Induce: Ce 6 for laryngoscopy, BIS into the 20s, then 3.5 after 150 s and BIS in the 40s ----
 await page.locator('#induceBtn').click();
 assert.equal(await page.evaluate(()=>PUMP.target),6,'Induce targets Ce 6');assert.match(await page.textContent('#storyCap'),/laryngoscopy/);
 s=await page.evaluate(()=>{paused=true;let lo=99,ce=0,tg=0;for(let i=0;i<220;i++){tlRun(1);if(i>60)lo=Math.min(lo,bisS);if(i===140){ce=pumpCe();tg=PUMP.target;}}return {lo,ce,tg};});
 assert.ok(s.lo>=12&&s.lo<30,'deep for laryngoscopy: lowest BIS '+s.lo.toFixed(1));assert.ok(s.ce>5.5,'Ce near 6 at 140 s: '+s.ce.toFixed(2));assert.equal(s.tg,6);
 s=await page.evaluate(()=>({tg:PUMP.target,cap:$('storyCap').textContent}));
 assert.equal(s.tg,3.5,'target down to 3.5 after 150 s');assert.match(s.cap,/^Maintenance: target down to 3.5/);
 // ---- 3. the opioid box by a real tap: the mix follows, depth a little less without it ----
 const dH=()=>page.evaluate(()=>mixTarget(Object.assign({},MIX0,mix)).dH);
 const d1=await dH();await page.locator('#pOpioid').click();
 s=await page.evaluate(()=>({op:PUMP.opioid,mix:mix.opioid}));assert.equal(s.op,false);assert.equal(s.mix,0,'unticked: no opioid in the mix');
 const d0=await dH();assert.ok(d1-d0>0.02&&d1-d0<0.04,'the opioid adds a little depth: '+(d1-d0).toFixed(3));
 await page.locator('#pOpioid').click();assert.equal(await page.evaluate(()=>mix.opioid),1);
 // ---- 4. above 1x the raw trace is redrawn as the state moves; not at 1x ----
 s=await page.evaluate(()=>{let m=0;for(let i=0;i<100;i++){tlRun(1);if(i>=80)m+=bisS/20;}return m;});assert.ok(s>36&&s<56,'settles in the 40s at Ce 3.5: '+s.toFixed(1));
 await page.evaluate(()=>{tlRun(140);window._rf=0;const f=dispRefill;window.dispRefill=function(){window._rf++;return f();};paused=false;});
 await page.locator('#speedSeg [data-speed="1"]').click();await page.locator('#wakeBtn').click();await wait(1500);
 assert.equal(await page.evaluate(()=>_rf),0,'no redraw at 1x');
 // ---- 5. Emerge at 60x: redraws during the wake-up, then an auto-pause once the index is back to about 90 ----
 await page.locator('#speedSeg [data-speed="60"]').click();
 await page.waitForFunction(()=>paused,null,{timeout:30000});
 s=await page.evaluate(()=>({bis:bisS,rf:_rf,cap:$('storyCap').textContent,ce:pumpCe()}));
 assert.ok(s.bis>=90,'paused once awake: BIS '+s.bis.toFixed(1));assert.match(s.cap,/^Paused: the patient is awake/);
 assert.ok(s.rf>=2,'the raw trace was redrawn as the patient woke: '+s.rf);
 // a new target cancels the auto-pause: Induce, then Emerge-free running does not pause
 await page.locator('#induceBtn').click();await wait(1500);assert.equal(await page.evaluate(()=>paused),false,'Induce resumes and does not auto-pause');
 await page.context().close();
 // ---- 6. a case: trend empty at its 0 min, opioid box off, deep induction then 4 ----
 page=await open('?case=tci');
 s=await page.evaluate(()=>({t0:ADV.t0,st:story.t0,n:advHist('L').length,op:PUMP.opioid,box:$('pOpioid').getAttribute('aria-pressed')==='true'}));
 assert.ok(Math.abs(s.t0-s.st)<1,'the trend starts at the case start');assert.ok(s.n<=5,'trend and DSA empty at 0 min: '+s.n);
 assert.equal(s.op,false,'the cases run without the background opioid');assert.equal(s.box,false);
 await page.evaluate(()=>{paused=true;tlRun(Math.max(0,story.t0+150-simT));});
 assert.equal(await page.evaluate(()=>PUMP.target),6,'case induction Ce 6');
 await page.evaluate(()=>tlRun(Math.max(0,story.t0+180-simT)));
 assert.equal(await page.evaluate(()=>PUMP.target),4,'down to 4 after intubation');
 assert.ok((await page.evaluate(()=>advHist('L').length))>150,'the trend fills from the case start');
 await page.context().close();
 assert.deepEqual(errors,[]);
 console.log('PASS workshop flow: Induce Ce 6 (BIS in the 20s) then 3.5, opioid box, empty trend at the start, Emerge auto-pause at about 90, raw trace redrawn above 1x');
}finally{await browser.close();}
