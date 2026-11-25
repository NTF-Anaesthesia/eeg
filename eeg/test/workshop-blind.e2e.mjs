// Blinded mode (workshop, 25 Nov 2026): the index is masked on every monitor, DSA/SEF95/EEG stay, Reveal shows it, ?blind=1 deep link.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-blind.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1280,height:860}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const BASE=`http://localhost:${process.env.PORT||8080}/eeg/`;
const ready=()=>page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10);
const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
// text drawn on a canvas: record fillText calls for one redraw
const canvasText=async fn=>page.evaluate(async src=>{const seen=[],orig=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(t,...a){seen.push(String(t));return orig.call(this,t,...a);};
 try{(0,eval)(src)();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}finally{CanvasRenderingContext2D.prototype.fillText=orig;}return seen;},fn.toString());
try{
 await page.goto(BASE+'?blind=1');await ready();
 assert.equal(await page.evaluate(()=>blind.on&&masked()),true,'?blind=1 masks on load');
 assert.equal(await page.getAttribute('#blindBtn','aria-pressed'),'true');assert.ok(await page.locator('#revealBtn').isVisible(),'Reveal shows while blinded');
 // a GA patient so the index is a real number underneath
 await page.evaluate(()=>{depth=.57;$('depth').value=57;applyTarget();snapAll();step(40*FS);stepR(40*FS);dirty=true;});await frame();
 const hidden=await page.evaluate(()=>COLS.at(-1).bis);assert.ok(hidden>20&&hidden<80,'the model still computes BIS underneath');
 // BIS Advance (the default): DOM number masked, DSA and EEG drawn
 await page.selectOption('#monitorChoice','advance');await frame();await frame();
 assert.equal((await page.textContent('#aBisL')).trim(),'••','BIS Advance number masked');
 // Medtronic BIS: big number masked, the header's BIS too, SEF still a number
 await page.selectOption('#monitorChoice','vista');await frame();await frame();
 assert.equal((await page.textContent('#v2Bis')).trim(),'••','Medtronic number masked');
 const mt=await canvasText(()=>{MT.main='dsaBis';dirty=true;});
 assert.ok(mt.some(t=>/^BIS ••$/.test(t)),'Medtronic DSA header BIS masked');assert.ok(mt.some(t=>/^SEF \d+$/.test(t)),'SEF stays visible on Medtronic');
 assert.ok(!mt.some(t=>/^BIS \d+$/.test(t)),'no BIS number on the Medtronic canvas');
 const mtTrend=await canvasText(()=>{MT.main='bis';dirty=true;});assert.ok(mtTrend.length>0,'trend view draws');await page.evaluate(()=>{MT.main='dsaAmpl';dirty=true;});
 // SedLine: PSi masked in every format, SEF numbers remain
 await page.selectOption('#monitorChoice','sedline');await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>sedFmt('psi',SED.N)),'••','SedLine PSi masked');
 const sd=await canvasText(()=>{sedInval();});assert.ok(sd.includes('••'),'PSi drawn masked');
 assert.ok(await page.evaluate(()=>SED.D.ser.psi.every(v=>v==null)),'no PSi trend line while blinded');
 // IntelliVue: BIS numeric masked and no BIS High/Low alarm
 await page.selectOption('#monitorChoice','philips');await page.waitForTimeout(400);
 const pv=await canvasText(()=>{PV.dirty=true;dirty=true;});assert.ok(pv.includes('••'),'IntelliVue BIS masked');
 assert.ok(!(await page.evaluate(()=>pvAlarms().some(a=>/BIS (High|Low)/.test(a.text)))),'IntelliVue index alarms off while blinded');
 // Teaching layout: number, zone and the page's own BIS hints
 await page.selectOption('#monitorChoice','classic');await frame();await frame();
 assert.equal((await page.textContent('#vBis')).trim(),'••');assert.equal((await page.textContent('#vZone')).trim(),'Blinded');
 assert.match(await page.textContent('#tgtBis'),/hidden/,'forecast BIS hidden');assert.equal(await page.textContent('#rName'),'Blinded','state name hidden');
 // DSA keeps drawing (the newest column is still added) and the raw EEG buffer fills
 assert.ok(await page.evaluate(()=>COLS.at(-1).db.length===60&&SIG.length>FS*4),'DSA columns and EEG keep coming');
 // Reveal shows the real number; Mask hides it again
 await page.click('#revealBtn');await frame();await frame();
 assert.match((await page.textContent('#vBis')).trim(),/^\d+$/,'Reveal shows the number');assert.equal(await page.getAttribute('#revealBtn','aria-pressed'),'true');
 await page.click('#revealBtn');await frame();await frame();assert.equal((await page.textContent('#vBis')).trim(),'••','masked again');
 // toggle off: no mask, Reveal hidden, address loses ?blind
 await page.click('#blindBtn');await frame();await frame();
 assert.match((await page.textContent('#vBis')).trim(),/^\d+$/);assert.ok(await page.locator('#revealBtn').isHidden());
 assert.ok(!page.url().includes('blind='),'address drops ?blind when off');
 await page.click('#blindBtn');assert.ok(page.url().includes('blind=1'),'address carries ?blind=1 when on');
 // phone: the keys fit the toolbar without sideways scroll
 await page.setViewportSize({width:390,height:844});await page.goto(BASE+'?blind=1');await ready();
 assert.ok(await page.locator('#revealBtn').isVisible());const rb=await page.locator('#revealBtn').boundingBox();assert.ok(rb.x+rb.width<=390&&rb.width>=44&&rb.height>=44,'Reveal fits a phone and is a full touch target');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS blinded mode: masked on BIS Advance, Medtronic, SedLine, IntelliVue and Teaching; DSA/SEF/EEG kept; Reveal; ?blind=1');
}finally{await browser.close();}
