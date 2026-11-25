// Workshop page (/workshop/, 25 Nov 2026): no device branding, the index masked by default with Reveal, unilateral and bilateral,
// a case with the quiz, the pump's ketamine line, the projector (1920×1080 full screen) and a phone width.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-page.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const URL0=`http://localhost:${process.env.PORT||8080}/eeg/workshop/`;
const BRAND=/Medtronic|Masimo|SedLine|Philips|IntelliVue|Covidien|Vista|BIS Advance|™/i;
const errors=[];
async function open(q,w,h){const page=await browser.newPage({viewport:{width:w,height:h}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&typeof wsTick==='function');return page;}
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const runTo=(p,t)=>p.evaluate(t=>{if(story)tlRun(Math.max(0,story.t0+t-simT));dirty=true;},t);
// is any lit pixel drawn in a canvas region (fractions of its box)?
const inked=(p,id,y0,y1)=>p.evaluate(([id,y0,y1])=>{const cv=document.getElementById(id),c=cv.getContext('2d'),h=cv.height,w=cv.width;
 const d=c.getImageData(Math.round(w*.2),Math.round(h*y0),Math.round(w*.7),Math.max(1,Math.round(h*(y1-y0)))).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>200)n++;return n;},[id,y0,y1]);
try{
 // 1. desktop: branding, masking, reveal
 let page=await open('',1280,860);await frame(page);
 const html=await page.evaluate(()=>document.documentElement.outerHTML),text=await page.evaluate(()=>document.body.innerText);
 assert.doesNotMatch(html,BRAND,'no device brand in the DOM: '+(html.match(new RegExp('[^<>]{0,60}('+BRAND.source+')[^<>]{0,30}','i'))||[''])[0]);assert.doesNotMatch(text,/\bBIS\b|\bPSi\b/,'the visible text says index, not BIS');
 assert.equal(await page.locator('img').count(),0,'no images or logos');
 assert.match(text,/NTFGH/);assert.match(text,/NUHS/);assert.match(text,/processed EEG/i);
 for(const id of ['#wsMon','#caseChoice','#quizBtn','#pumpCtl','#pKetGive','#pDexGive','#pTgt'])assert.ok(await page.locator(id).isVisible(),id+' visible');
 for(const id of ['#advS','#mtS','#monitorChoice','#agentChoice'])assert.ok(await page.locator(id).isHidden(),id+' not shown');
 const mask=await page.evaluate(()=>MASK);assert.equal(await page.textContent('#wsIdx'),mask,'index masked by default');
 await page.click('#wsReveal');await frame(page);const shown=await page.textContent('#wsIdx');assert.match(shown,/^\d+$/,'Reveal shows the number: '+shown);
 await page.click('#wsReveal');await frame(page);assert.equal(await page.textContent('#wsIdx'),mask,'and masks it again');
 // 2. bilateral: right engine, two DSA panels, two traces
 await page.click('.wsm-seg [data-bi="1"]');await page.evaluate(()=>tlRun(8));await frame(page);
 assert.equal(await page.evaluate(()=>wsMon.dataset.bi),'1');assert.ok(await page.locator('#wsIdxR').isVisible(),'left and right index');
 assert.equal(await page.locator('#wsRow .two').count(),4,'SEF95, SQI, EMG and SR for both sides');
 assert.ok(await page.evaluate(()=>R.COLS.length>10&&R.DSIG.length>100),'right hemisphere engine running');
 assert.ok(await inked(page,'wsEeg',.08,.4)>20&&await inked(page,'wsEeg',.55,.85)>20,'bilateral: left and right traces drawn');assert.match(page.url(),/bi=1/,'bilateral kept in the link');
 // 3. ketamine bolus on the pump raises ketamine Ce (and reaches the engine)
 const k0=await page.evaluate(()=>kdxCe(PUMP.k));await page.locator('#pKetBol').fill('0.5');await page.click('#pKetGive');await page.evaluate(()=>tlRun(90));
 const k1=await page.evaluate(()=>({ce:kdxCe(PUMP.k),mix:mix.ketamine,txt:$('pKetCe').textContent}));
 assert.ok(k1.ce>k0+0.3,`ketamine bolus raises Ce (${k0} -> ${k1.ce})`);assert.ok(k1.mix>0.1,'ketamine reaches the engine');assert.match(k1.txt,/Ce \d\.\d\d µg\/ml/);
 await page.close();
 // 4. a case with the quiz: masked, drug details hidden, a checkpoint, the reveal shows the pump
 page=await open('?case=propket&quiz=1',1280,860);
 assert.equal(await page.evaluate(()=>qz.case),'propket');assert.equal(await page.textContent('#wsIdx'),mask);
 assert.ok(await page.locator('#pumpCtl').isHidden(),'quiz hides the drug details');
 await runTo(page,350);await page.waitForSelector('#quizCard:not([hidden]) #quizTitle');assert.match(await page.textContent('#quizTitle'),/Checkpoint 1 of 3/);
 for(const [q,v] of Object.entries({phase:1,agent:0,arousal:0}))await page.check(`#quizForm input[name=q_${q}][value="${v}"]`);await page.click('#quizCheck');
 assert.doesNotMatch(await page.locator('#quizCard').innerText(),/\bBIS\b/,'the answer card says index');
 assert.ok(await page.locator('#pumpCtl').isVisible(),'the reveal shows the pump');await page.click('#quizNext');
 await runTo(page,560);assert.ok(await page.evaluate(()=>kdxCe(PUMP.k)>0.3),'the case gives ketamine on the pump line');
 assert.ok(await page.evaluate(()=>PUMP.target>0&&pumpCe()>2),'propofol TCI still running alongside');
 await page.close();
 // 5. projector: 1920×1080 full screen keeps the monitor large and the case, quiz and pump reachable
 page=await open('?case=propdex&bi=1',1920,1080);await page.click('#fullScreen');await page.waitForTimeout(300);
 assert.ok(await page.evaluate(()=>workspace.classList.contains('presenting')));
 const g=await page.evaluate(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();return {mon:r('#wsMon'),dsa:r('#wsDsa'),eeg:r('#wsEeg')};});
 assert.ok(g.mon.width>1300&&g.mon.height>800,'monitor fills the projector: '+JSON.stringify(g.mon));assert.ok(g.dsa.height>250&&g.eeg.height>150,'DSA and EEG large');
 for(const id of ['#caseChoice','#quizBtn','#pumpCtl','#pause'])assert.ok(await page.locator(id).isVisible(),id+' usable in full screen');
 await page.locator('#pDexGive').scrollIntoViewIfNeeded();assert.ok(await page.locator('#pDexGive').isVisible(),'dex line reachable in full screen');
 await page.close();
 // 6. phone: no sideways scroll, everything stacked
 page=await open('?bi=1',390,844);await frame(page);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow at 390 px');
 for(const id of ['#wsMon','#caseChoice','#quizBtn','#pumpCtl'])assert.ok(await page.locator(id).isVisible(),id+' visible on a phone');
 assert.ok(await page.evaluate(()=>$('wsEeg').clientWidth>300),'trace spans the phone');
 await page.close();
 // main page untouched by the workshop page: the device monitor still the default
 page=await browser.newPage({viewport:{width:1280,height:860}});await page.goto(URL0.replace('workshop/',''));await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null);
 assert.equal(await page.evaluate(()=>mon.skin),'advance','main page keeps its own monitor');assert.ok(await page.locator('#wsMon').count()===0);
 assert.deepEqual(errors,[],'no page errors');
 console.log('PASS workshop page: unbranded, masked index with Reveal, bilateral, case + quiz, ketamine line, projector and phone');
}finally{await browser.close();}
