// TCI pump (workshop, 25 Nov 2026): propofol Ce target drives the engine's propofol level; sevoflurane, ketamine and remifentanil
// go into the mix; Emerge zeroes the targets; the timeline restores the pump; manual mode still works.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-pump.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1280,height:860}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const BASE=`http://localhost:${process.env.PORT||8080}/eeg/`;
const ready=()=>page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10);
const frame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const run=secs=>page.evaluate(s=>{tlRun(s);dirty=true;},secs);
const st=()=>page.evaluate(()=>({on:PUMP.on,ce:pumpCe(),cp:pumpCp(),r:PUMP.r,mg:PUMP.mg,mix:Object.assign({},mix),deL:eng.de.propofol,deR:R.eng.de.propofol,bis:COLS.at(-1).bis,drug,mode}));
try{
 await page.goto(BASE);await ready();
 // pick the pump from the anaesthetic list
 await page.selectOption('#agentChoice','tci');await frame();
 assert.ok(await page.locator('#pumpCtl').isVisible(),'pump panel shows');assert.ok(await page.locator('#presetSeg').isHidden(),'combination choices give way to the pump');
 let s=await st();assert.equal(s.on,true);assert.equal(s.drug,'mix');assert.equal(s.mode,'mix');assert.equal(s.ce,0);
 assert.equal(await page.inputValue('#agentChoice'),'tci','the select keeps showing the pump');
 // Eleveld, Ce target 4: max-rate induction, plasma overshoot, then Ce at target
 await page.locator('#pTgt').fill('4');await frame();
 await run(60);s=await st();
 assert.ok(s.cp>s.ce,'plasma leads the effect site during induction');assert.ok(s.ce>0.5&&s.ce<4,'Ce rising after 1 min: '+s.ce);
 assert.ok(Math.abs(s.deL-s.ce)<1e-9&&Math.abs(s.deR-s.ce)<1e-9,'pump Ce drives both engines\' propofol effect site');
 assert.ok(Math.abs(s.mix.propofol-s.ce)<1e-9,'and the mix target');
 await run(300);s=await st();assert.ok(Math.abs(s.ce-4)<0.05,'Ce reaches the target: '+s.ce);assert.ok(s.r>0&&s.r<40,'maintenance rate well below the 133 mg/min maximum: '+s.r);
 assert.ok(s.bis>25&&s.bis<60,'BIS falls into the anaesthetic range at Ce 4: '+s.bis);
 assert.match(await page.textContent('#pRead'),/Ce 4\.0 µg\/ml/,'readout shows Ce');
 const bisProp=s.bis;
 // ketamine on top: faster activity, BIS higher at the same propofol Ce
 await page.locator('#pMore summary').click();await page.locator('#pKet').fill('0.6');await frame();await run(240);s=await st();
 assert.equal(s.mix.ketamine,0.6);assert.ok(s.bis>bisProp+5,`ketamine raises BIS at unchanged propofol (${bisProp} -> ${s.bis})`);
 await page.locator('#pKet').fill('0');
 // sevoflurane Et -> age-adjusted MAC in the mix
 await page.locator('#pSevo').fill('1.8');await frame();s=await st();assert.ok(Math.abs(s.mix.sevo-1)<1e-6,'1.8% at age 40 is 1 MAC');
 assert.match(await page.textContent('#pMac'),/1\.00 MAC/);
 assert.ok(await page.locator('#pAge').isDisabled(),'patient locked once drug is given');
 await page.locator('#pSevo').fill('0');await page.locator('#pRemi').fill('4');await frame();s=await st();assert.equal(s.mix.remi,4);
 // timeline: go back 3 min and the pump comes back as it was
 const tNow=await page.evaluate(()=>simT),ce2=await page.evaluate(()=>{const h=PUMP.hist.filter(x=>x.t<=simT-180).at(-1);return h.ce;});
 await page.evaluate(t=>tlJump(t),tNow-180);await page.waitForFunction(()=>!TL.busy);s=await st();
 assert.equal(s.on,true,'pump still on after a jump back');assert.ok(Math.abs(s.ce-ce2)<0.2,`Ce restored (${ce2} vs ${s.ce})`);
 assert.ok(await page.evaluate(()=>TL.events.length<12),'drug marks only on pump changes, not every step');
 // Emerge: targets to zero, Ce falls by the model
 await page.click('#wakeBtn');await frame();s=await st();assert.equal(await page.evaluate(()=>PUMP.target),0);assert.equal(s.mix.remi,0);
 const ceA=s.ce;await run(300);s=await st();assert.ok(s.ce<ceA*0.85,`Ce falls after the pump stops (${ceA} -> ${s.ce})`);assert.equal(s.r,0);
 // Induce in pump mode sets a propofol target
 await page.click('#induceBtn');assert.equal(await page.evaluate(()=>PUMP.target),3.5);
 // Reset unlocks the patient; Schnider on a Cp target
 await page.click('#pReset');assert.ok(await page.locator('#pAge').isEnabled());await page.selectOption('#pModel','schnider');
 await page.click('#pModeSeg button[data-m=Cp]');await page.locator('#pTgt').fill('3');await run(120);s=await st();
 assert.ok(Math.abs(s.cp-3)<0.05,'Cp mode holds plasma at the target: '+s.cp);
 // manual mode untouched: back to propofol, the depth slider drives the engine again
 await page.selectOption('#agentChoice','propofol');await frame();s=await st();
 assert.equal(s.on,false,'choosing an agent turns the pump off');assert.ok(await page.locator('#pumpCtl').isHidden());
 await page.locator('#depth').fill('57');await run(120);
 assert.equal(await page.evaluate(()=>drug+':'+depth),'propofol:0.57','manual depth works');
 // combination presets turn the pump off too
 await page.selectOption('#agentChoice','tci');await page.selectOption('#agentChoice','mix');assert.equal(await page.evaluate(()=>PUMP.on),false);
 // phone: panel fits
 await page.setViewportSize({width:390,height:844});await page.selectOption('#agentChoice','tci');await frame();
 const bb=await page.locator('#pumpCtl').boundingBox();assert.ok(bb.x>=0&&bb.x+bb.width<=391,'pump panel fits a phone');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS TCI pump: Eleveld Ce target drives the effect site; ketamine, sevoflurane (MAC), remifentanil; Emerge; timeline restore; Schnider Cp; manual mode kept');
}finally{await browser.close();}
