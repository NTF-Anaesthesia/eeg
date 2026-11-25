// Workshop case files (25 Nov 2026): ?case=<id> deep link and the Case menu; each case runs its phases on the TCI pump and the
// engine shows the expected direction of change (maintenance in range, incision arousal, ketamine raising BIS, emergence).
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-cases.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1280,height:860}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const BASE=`http://localhost:${process.env.PORT||8080}/eeg/`;
const ready=()=>page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10);
// run to t seconds after the case start; mean BIS, SEF95 and alpha (8-13 Hz) power over the last 10 s
const at=t=>page.evaluate(t=>{tlRun(Math.max(0,story?story.t0+t-simT:0));const c=HIST.slice(-10),m=k=>c.reduce((a,x)=>a+x[k],0)/c.length;
 const alpha=c.reduce((a,x)=>{let s=0;for(let k=16;k<26;k++)s+=x.db[k];return a+s/10;},0)/c.length;return {bis:m('bis'),sef:m('sef'),alpha,i:story?.i,pump:Object.assign({},mix)};},t);
try{
 // deep link: the propofol TCI case starts at once on the pump
 await page.goto(BASE+'?case=tci');await ready();
 let s=await page.evaluate(()=>({id:story?.case,on:PUMP.on,sel:$('caseChoice').value,speed,cap:$('storyCap').textContent}));
 assert.equal(s.id,'tci');assert.equal(s.on,true,'the case drives the pump');assert.equal(s.sel,'tci','menu shows the case');assert.match(s.cap,/^1\/10 · Awake/);
 const m=await at(340);assert.ok(m.bis>38&&m.bis<60,'maintenance BIS in range: '+m.bis);assert.ok(Math.abs(m.pump.propofol-4)<0.3,'Ce near the 4 µg/ml target');
 assert.ok(await page.evaluate(()=>mods.nmb),'relaxant on during surgery');
 const pre=await at(595),dip=await at(645),ar=await at(695);
 assert.ok(dip.alpha<pre.alpha-1,`incision: alpha dips (${pre.alpha.toFixed(1)} -> ${dip.alpha.toFixed(1)} dB)`);
 assert.ok(ar.sef>pre.sef+3&&ar.bis>pre.bis+10,`arousal: SEF95 and BIS rise (SEF ${pre.sef.toFixed(1)} -> ${ar.sef.toFixed(1)}, BIS ${pre.bis.toFixed(0)} -> ${ar.bis.toFixed(0)})`);
 assert.equal(ar.pump.remi,0,'no opioid before treatment');
 const tr=await at(900);assert.ok(tr.bis<pre.bis+8&&tr.pump.remi>0,'treated: remifentanil on, index back down: '+tr.bis);
 const em=await at(1790);assert.ok(em.bis>75&&em.sef>pre.sef+5,'emergence: BIS and SEF95 climb: '+em.bis);assert.equal(await page.evaluate(()=>mods.nmb),false,'relaxant reversed');
 await at(1810);assert.equal(await page.evaluate(()=>story),null,'case ends');
 // sevoflurane case from the menu: the vaporiser, not propofol
 await page.selectOption('#caseChoice','sevo');s=await at(340);
 assert.equal(s.pump.propofol,0);assert.ok(Math.abs(s.pump.sevo-1.8/(1.8*10**(-0.00269*5)))<1e-6,'end-tidal 1.8% as age-adjusted MAC');assert.ok(s.bis>35&&s.bis<60,'sevo maintenance BIS in range: '+s.bis);
 const sp=await at(595),sa=await at(645);assert.ok(sa.sef>sp.sef+3,'sevo incision arousal: SEF95 rises');
 assert.ok((await at(1790)).bis>80,'sevo emergence');
 // propofol + ketamine: BIS and SEF95 rise at an unchanged propofol target
 await page.goto(BASE+'?case=propket');await ready();
 const k0=await at(470),k1=await at(700);
 assert.ok(Math.abs(k0.pump.propofol-k1.pump.propofol)<0.3&&k1.pump.propofol<=k0.pump.propofol,'propofol Ce unchanged or lower');assert.ok(k1.pump.ketamine>0);
 assert.ok(k1.bis>k0.bis+10&&k1.sef>k0.sef+6,`ketamine: BIS ${k0.bis.toFixed(0)} -> ${k1.bis.toFixed(0)}, SEF95 ${k0.sef.toFixed(1)} -> ${k1.sef.toFixed(1)}`);
 assert.ok(k1.alpha<k0.alpha-1,'ketamine: alpha weakens');
 // propofol + dexmedetomidine: the dex line's Ce builds over the load; slow activity up, alpha weaker, faster activity down
 await page.goto(BASE+'?case=propdex');await ready();
  // slow-delta 0.5-4 Hz over the last 30 s (a 1-2 Hz band over 10 s varied by about 1 dB run to run, more than the dex rise)
  const ex=t=>page.evaluate(t=>{tlRun(Math.max(0,story.t0+t-simT));const c=HIST.slice(-30),b=(lo,hi)=>c.reduce((a,x)=>{let s=0;for(let k=lo;k<hi;k++)s+=x.db[k];return a+s/(hi-lo);},0)/c.length;
  return {slow:b(1,8),alpha:b(16,26),beta:b(30,50),dex:kdxCe(PUMP.x),prop:pumpCe(),panel:!$('pumpCtl').hidden};},t);
 const d0=await ex(410),d1=await ex(1000);
 assert.ok(d0.dex===0&&d1.dex>0.6,'dex Ce on the pump: '+d1.dex.toFixed(2));assert.ok(Math.abs(d1.prop-3.5)<0.1,'propofol TCI live alongside');assert.ok(d1.panel,'pump panel shown in the case');
 assert.ok(d1.slow>d0.slow&&d1.alpha<d0.alpha,`dex: slow ${d0.slow.toFixed(1)} -> ${d1.slow.toFixed(1)} dB, alpha ${d0.alpha.toFixed(1)} -> ${d1.alpha.toFixed(1)} dB`);
 // blinded: the caption is the neutral event line (no interpretation, no drug name for the adjunct)
 await page.goto(BASE+'?case=propket&blind=1');await ready();await at(500);
 assert.match(await page.textContent('#storyCap'),/^5\/8 · Drug given\.$/,'neutral event line while blinded');
 assert.ok(page.url().includes('case=propket')&&page.url().includes('blind=1'),'both params kept in the address');
 // the timeline still works inside a case
 const t=await page.evaluate(()=>simT);await page.evaluate(t=>tlJump(t-200),t);await page.waitForFunction(()=>!TL.busy);
 assert.equal(await page.evaluate(()=>story?.case),'propket','case survives a jump back');
 // choosing no case stops it
 await page.selectOption('#caseChoice','');assert.equal(await page.evaluate(()=>story),null);assert.ok(!page.url().includes('case='));
 // phone: the strip fits
 await page.setViewportSize({width:320,height:640});await page.goto(BASE+'?case=tci');await ready();
 const bb=await page.locator('#caseChoice').boundingBox();assert.ok(bb.x>=0&&bb.x+bb.width<=321&&bb.height>=40,'case menu fits a 320 px phone');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS workshop cases: ?case= and menu; propofol TCI, sevoflurane and propofol + ketamine phases; blinded event lines; timeline');
}finally{await browser.close();}
