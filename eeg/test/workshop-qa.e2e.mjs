// Workshop quiz hardening (25 Nov 2026, after an independent QA pass of /workshop/). Every control under test is used with a real
// click or tap (locator.click / tap), not by calling the page's functions, so a key that looks locked but still works is caught;
// page functions only fast-forward the case to a checkpoint (tlRun) and read the state.
// Checks: in a quiz case no step caption or step count (a checkpoint's answer lists them), Reveal and the Blind key locked while a
// checkpoint asks, Induce / Emerge locked in a quiz case, play / pause, speed keys, timeline and case menu locked at a checkpoint,
// timeline locked in a quiz case and a jump that passes a checkpoint skips it, the card never over the monitor with Check answers
// in view (820x1180, 1180x820, 1024x1366, 1920x1080), teaching captions outside the quiz while masked and Reveal redrawing it,
// no case or quiz in the address once a quiz case runs; and the smaller fixes: captions cleared on rewind, pump Reset and the
// blank case (with ?case= dropped), the chosen speed kept, dex load stoppable, ketamine bolus 0.1-2 mg/kg with a message and the
// total shown, case letters shuffled per quiz session, focus on the card heading, no step-1 caption on a quiz link, Alpha
// dropout off while awake.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-qa.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const URL0=`http://localhost:${process.env.PORT||8080}/eeg/workshop/`;
const errors=[];
async function open(q,w=1280,h=860,touch=false){const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:touch});const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(`${w}x${h} ${q}: ${e.message}`));
 await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&ADV.built&&typeof qz!=='undefined');return page;}
const runTo=(p,t)=>p.evaluate(t=>{if(story)tlRun(Math.max(0,story.t0+t-simT));dirty=true;},t);
const st=p=>p.evaluate(()=>({t:story?Math.round(simT-story.t0):null,case:story?.case??null,qcase:qz.case,paused,speed,masked:masked(),blind:blind.on,cap:$('storyCap').textContent,
 open:qz.open,quiz:workspace.dataset.quiz,url:location.search}));
const box=(p,s)=>p.locator(s).first().evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height};});
const overlap=(a,b)=>!(a.x>=b.r-1||a.r<=b.x+1||a.y>=b.b-1||a.b<=b.y+1);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cpOpen=p=>p.waitForSelector('#quizCard:not([hidden]) #quizCheck');
// a real click on a control that should be locked: the browser drops clicks on a disabled control, so force past Playwright's
// own enabled check and let the page decide
const lockedClick=async(p,s)=>{const l=p.locator(s).first();assert.ok(await l.isDisabled(),`${s} is disabled`);await l.click({force:true,timeout:3000}).catch(()=>{});};
try{
 // ---- 1. a quiz deep link: no caption, no case in the address, Induce / Emerge and the timeline locked ----
 let page=await open('?case=tci&quiz=1');let s=await st(page);
 assert.equal(s.qcase,'tci');assert.equal(s.cap,'','no step-1 caption on a quiz link');
 assert.ok(!/case=|quiz=/.test(s.url),'no case or quiz in the address once the quiz case runs: '+s.url);
 await lockedClick(page,'#induceBtn');await lockedClick(page,'#wakeBtn');await wait(300);
 s=await st(page);assert.equal(s.case,'tci','Induce / Emerge cannot end the quiz case');assert.equal(s.open,false,'no summary card');
 await lockedClick(page,'#timeScrub');
 const t0=s.t;await page.locator('#timeScrub').click({position:{x:200,y:5},force:true,timeout:3000}).catch(()=>{});await wait(300);
 assert.ok(Math.abs((await st(page)).t-t0)<10,'a tap on the timeline does not jump in a quiz case');
 // ---- 2. the checkpoint: captions hidden, keys locked, card beside the monitor ----
 await runTo(page,350);await cpOpen(page);s=await st(page);
 assert.equal(s.paused,true);assert.equal(s.cap,'','no caption at a checkpoint');
 assert.ok(!/\b\d+\/(8|10) ·/.test(await page.locator('body').innerText()),'no step count anywhere on the page');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'quizTitle','focus on the card heading, not the first answer');
 await lockedClick(page,'#revealBtn');await lockedClick(page,'#blindBtn');
 s=await st(page);assert.ok(s.masked&&s.blind,'Reveal and the Blind key cannot show the hidden BIS while the checkpoint asks');
 const sel=page.locator('#caseChoice');assert.ok(await sel.isDisabled(),'case menu locked at a checkpoint');
 await lockedClick(page,'#quizBtn');assert.equal(await page.evaluate(()=>qz.on),true,'Quiz key locked at a checkpoint');
 for(const id of ['#pause','#speedSeg button[data-speed="60"]','#timeScrub'])assert.ok(await page.locator(id).isDisabled(),id+' locked at a checkpoint');
 const tA=await page.evaluate(()=>simT);await wait(700);assert.equal(await page.evaluate(()=>simT),tA,'the case waits under the question');
 const adv=await box(page,'#advWrap'),card=await box(page,'#quizCard'),chk=await box(page,'#quizCheck');
 assert.ok(!overlap(adv,card),'card not over the monitor');assert.ok(chk.b<=860&&chk.y>=0,'Check answers in view');
 // answer with real clicks on the labels; the answer shows the captions since the start and the case letter
 await page.locator('#quizForm input[name=q_phase][value="1"]').click();await page.locator('#quizForm input[name=q_agent][value="0"]').click();
 await page.locator('#quizForm input[name=q_arousal][value="0"]').click();await page.locator('#quizCheck').click();
 assert.match(await page.textContent('#quizTitle'),/Checkpoint 1: 3 of 3/);
 const ev=await page.textContent('#quizEvents');assert.match(ev,/Awake baseline/);assert.match(ev,/Relaxant given/);
 assert.match(await page.textContent('#quizCase'),/^Case [A-D] is Propofol TCI/);
 assert.ok(await page.locator('#revealBtn').isEnabled(),'Reveal usable again once answered');assert.ok(await page.locator('#pumpCtl').isVisible(),'the answer shows the pump');
 assert.ok(await page.locator('#pause').isDisabled(),'still waiting for Continue');
 await page.locator('#quizNext').click();s=await st(page);assert.equal(s.paused,false,'Continue resumes');assert.equal(s.cap,'','still no caption');
 assert.ok(await page.locator('#pause').isEnabled()&&await page.locator('#induceBtn').isDisabled()&&await page.locator('#timeScrub').isDisabled(),'pause back; Induce and timeline stay locked');
 // a jump that passes a checkpoint (only possible outside the lock) marks it skipped: it is never asked against later EEG
 await page.evaluate(()=>{tlRun(story.t0+900-simT);TL.onJump(simT);});await wait(400);
 assert.equal(await page.evaluate(()=>qz.open),false,'the passed checkpoint is not asked');assert.ok(await page.evaluate(()=>qz.done.has(1)),'and counted as skipped');
 await page.context().close();
 // ---- 3. M6 layout: the card never over the monitor, Check answers in view without scrolling inside the card ----
 for(const [w,h,touch] of [[820,1180,true],[1180,820,true],[1024,1366,true],[1920,1080,false]]){
  page=await open('?case=sevo&quiz=1',w,h,touch);await runTo(page,350);await cpOpen(page);await wait(250);
  const a=await box(page,'#advWrap'),c=await box(page,'#quizCard'),b=await box(page,'#quizCheck');
  const inner=await page.evaluate(()=>{const c=$('quizCard'),col=c.closest('.panel');return {c:c.scrollHeight-c.clientHeight,col:col?col.scrollHeight-col.clientHeight:0,sx:document.documentElement.scrollWidth-innerWidth};});
  assert.ok(!overlap(a,c),`${w}x${h}: card not over the monitor ${JSON.stringify({a,c})}`);
  assert.ok(b.b<=h+1&&b.y>=0,`${w}x${h}: Check answers in view ${JSON.stringify(b)}`);
  assert.ok(inner.c<=1&&inner.col<=1,`${w}x${h}: no scrolling inside the card ${JSON.stringify(inner)}`);assert.ok(inner.sx<=0,`${w}x${h}: no sideways scroll`);
  assert.ok(a.y>=-1&&a.b<=h+1,`${w}x${h}: the whole monitor in view while the card is open ${JSON.stringify(a)}`);
  if(w>h)assert.ok(c.x>=a.r-1,`${w}x${h}: card beside the monitor`);else assert.ok(c.y>=a.b-1,`${w}x${h}: card under the monitor`);
  await page.context().close();}
 // ---- 4. outside the quiz: teaching captions while masked, Reveal redraws, timeline works, captions cleared ----
 page=await open('?case=tci');await runTo(page,60);s=await st(page);
 assert.ok(s.masked,'masked by default');assert.match(s.cap,/^Induction: propofol TCI/,'teaching caption while masked, no step count');
 await page.evaluate(()=>{$('storyCap').textContent='old';});await page.locator('#revealBtn').click();
 assert.match((await st(page)).cap,/^Induction: propofol TCI/,'Reveal redraws the current caption');await page.locator('#revealBtn').click();
 assert.ok(await page.locator('#timeScrub').isEnabled()&&await page.locator('#induceBtn').isEnabled(),'timeline and Induce usable outside the quiz');
 await runTo(page,660);assert.match((await st(page)).cap,/^The stimulation continues/);
 await page.locator('#timeScrub').click({position:{x:4,y:5}});await page.waitForFunction(()=>!TL.busy);s=await st(page);
 assert.ok(s.t<300&&s.case==='tci','jumped back inside the case');assert.equal(s.cap,'','rewind clears the stale caption');
 await page.locator('#pReset').click();s=await st(page);assert.equal(s.case,null);assert.equal(s.cap,'','pump Reset clears the caption');assert.ok(!s.url.includes('case='),'and drops ?case=');
 await page.selectOption('#caseChoice','propket');await runTo(page,500);assert.match((await st(page)).cap,/^Ketamine added/);
 await page.selectOption('#caseChoice','');s=await st(page);assert.equal(s.cap,'','the blank case clears the caption');assert.ok(!s.url.includes('case='),'and drops ?case=');
 // speed: a case starts at 5x unless a speed was picked; the pick survives a case change and the case end
 await page.selectOption('#caseChoice','tci');assert.equal((await st(page)).speed,5,'5x when no speed was picked');
 await page.locator('#speedSeg button[data-speed="10"]').click();await page.selectOption('#caseChoice','sevo');assert.equal((await st(page)).speed,10,'the chosen speed kept on a case change');
 await runTo(page,1810);s=await st(page);assert.equal(s.case,null,'case ended');assert.equal(s.speed,10,'and the speed was not forced to 1x');
 await page.context().close();
 // ---- 5. pump: dex load can be stopped, infusion 0 stops it; ketamine bolus range and total ----
 page=await open('');
 await page.locator('#pDexLoad').fill('1');await page.locator('#pDexGive').click();await page.evaluate(()=>tlRun(5));
 assert.ok(await page.evaluate(()=>PUMP.x.left>0),'dex load running');assert.equal((await page.textContent('#pDexGive')).trim(),'Stop load');
 await page.locator('#pDexGive').click();assert.equal(await page.evaluate(()=>PUMP.x.left),0,'Stop load stops it');
 await page.evaluate(()=>pumpRead());assert.equal((await page.textContent('#pDexGive')).trim(),'Load over 10 min');
 await page.locator('#pDexGive').click();await page.locator('#pDexInf').fill('0.5');await page.locator('#pDexInf').fill('0');
 assert.equal(await page.evaluate(()=>PUMP.x.left),0,'dex infusion 0 stops a running load');
 await page.locator('#pKetBol').fill('50');await page.locator('#pKetGive').click();
 assert.equal(await page.evaluate(()=>PUMP.k.tot),0,'50 mg/kg is not given');assert.equal(await page.inputValue('#pKetBol'),'2','clamped to 2 mg/kg');
 assert.match(await page.textContent('#pKetMsg'),/0\.1 to 2 mg\/kg/,'with a message');
 await page.locator('#pKetBol').fill('-5');await page.locator('#pKetGive').click();assert.equal(await page.inputValue('#pKetBol'),'0.1','-5 clamped to 0.1');
 await page.locator('#pKetBol').fill('1');await page.locator('#pKetGive').click();await page.locator('#pKetGive').click();await page.evaluate(()=>{tlRun(40);pumpRead();});
 assert.equal(await page.textContent('#pKetMsg'),'','message cleared by a good dose');
 assert.match(await page.textContent('#pKetCe'),/· 140 mg given/,'the total given shows (2 x 1 mg/kg x 70 kg)');
 await page.context().close();
 // ---- 6. Alpha dropout off while awake, on once anaesthetised ----
 page=await open('');assert.ok(await page.locator('#wsAlpha').isDisabled(),'Alpha dropout off in an awake patient');
 await page.locator('#induceBtn').click();await page.evaluate(()=>tlRun(240));await wait(500);
 assert.ok(await page.locator('#wsAlpha').isEnabled(),'Alpha dropout on once anaesthetised');
 // ---- 7. case letters shuffled each time the quiz is turned on ----
 const letters=new Set();
 for(let i=0;i<8;i++){await page.locator('#quizBtn').click();letters.add(await page.evaluate(()=>[...caseChoice.options].find(o=>o.value==='tci').textContent));await page.locator('#quizBtn').click();}
 assert.ok(letters.size>1,'case letters change between quiz sessions: '+[...letters]);
 await page.context().close();
 assert.deepEqual(errors,[]);
 console.log('PASS workshop QA fixes: quiz captions hidden, Reveal / Blind / Induce / Emerge / play / speed / timeline / case locks by real clicks, card layout at 4 sizes, teaching captions while masked, address, captions cleared, speed kept, dex and ketamine, Alpha dropout, letter shuffle');
}finally{await browser.close();}
