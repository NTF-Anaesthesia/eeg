// Workshop page (/workshop/, 25 Nov 2026): the BIS Advance screen only (no other monitors), BIS masked by default with Reveal,
// the Advance's unilateral and bilateral sensor views, the NTFGH / NUHS header, a case with the quiz (neutral case names until the
// reveal), the pump's ketamine line, the projector (1920×1080 full screen, no page scroll), a phone width, and the home-screen
// app (manifest, a service worker for /workshop/ only that keeps the page working offline).
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-page.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const URL0=`http://localhost:${process.env.PORT||8080}/eeg/workshop/`;
const OTHER=/SedLine|Masimo|Philips|IntelliVue|Vista/i;
const errors=[];
async function open(q,w,h){const page=await browser.newPage({viewport:{width:w,height:h}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&ADV.built);return page;}
const frame=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const runTo=(p,t)=>p.evaluate(t=>{if(story)tlRun(Math.max(0,story.t0+t-simT));dirty=true;},t);
const caseNames=p=>p.evaluate(()=>[...caseChoice.options].filter(o=>o.value).map(o=>o.textContent));
try{
 // 1. desktop: BIS Advance only, header, masking, reveal
 let page=await open('',1280,860);await frame(page);
 assert.equal(await page.evaluate(()=>mon.skin),'advance');assert.ok(await page.locator('#advS').isVisible(),'BIS Advance screen shown');
 for(const id of ['#sedWrap','#pvWrap','#monitorChoice'])assert.ok(await page.locator(id).isHidden(),id+' not shown');
 assert.equal(await page.locator('#vistaWrap').count(),0,'no Medtronic-style screen');
 const other=await page.evaluate(re=>{const m=document.documentElement.outerHTML.match(new RegExp('[^<>]{0,50}('+re+')[^<>]{0,30}','i'));return m&&m[0];},OTHER.source);
 assert.equal(other,null,'no other monitor brand in the page: '+other);
 const ban=await page.locator('#wsBanner');assert.match(await ban.innerText(),/NTFGH[\s\S]*NUHS[\s\S]*EEG workshop/);
 assert.ok(await page.locator('#wsBanner .ws-logo img').isVisible(),'NTF Anaesthesia logo in the header');
 const big=await page.evaluate(()=>({org:parseFloat(getComputedStyle(document.querySelector('.ws-org')).fontSize),body:parseFloat(getComputedStyle(document.body).fontSize),
  logo:document.querySelector('.ws-logo img').getBoundingClientRect().height,stripe:document.querySelectorAll('.ws-stripe i').length}));
 assert.ok(big.org>=40&&big.body>=18&&big.logo>=70,'large header and base font: '+JSON.stringify(big));assert.equal(big.stripe,4,'four-quarter brand stripe');
 for(const id of ['#caseChoice','#quizBtn','#pumpCtl','#pKetGive','#pDexGive','#pTgt','#channelChoice','#blindBtn'])assert.ok(await page.locator(id).isVisible(),id+' visible');
 const mask=await page.evaluate(()=>MASK);assert.equal(await page.evaluate(()=>masked()),true,'BIS masked by default');
 assert.equal(await page.textContent('#aBisL'),mask,'BIS shows as the mask on the Advance');
 await page.click('#revealBtn');await frame(page);assert.match(await page.textContent('#aBisL'),/^\d+$/,'Reveal shows the number');
 await page.click('#revealBtn');await frame(page);assert.equal(await page.textContent('#aBisL'),mask,'and masks it again');
 // 2. bilateral: the Advance's own 4-channel view, both sides from the second engine
 await page.click('#channelChoice [data-ch="4"]');await page.evaluate(()=>tlRun(8));await frame(page);
 assert.equal(await page.evaluate(()=>ADV.ch),4);assert.ok(await page.locator('#aBisR').isVisible(),'right BIS on the bilateral view');
 assert.equal(await page.textContent('#aBisR'),mask,'right side masked too');assert.ok(await page.evaluate(()=>R.COLS.length>10),'right hemisphere engine running');
 assert.match(page.url(),/bi=1/,'bilateral kept in the link');
 // 3. ketamine bolus on the pump raises ketamine Ce
 const k0=await page.evaluate(()=>kdxCe(PUMP.k));await page.locator('#pKetBol').fill('0.5');await page.click('#pKetGive');await page.evaluate(()=>tlRun(90));
 const k1=await page.evaluate(()=>({ce:kdxCe(PUMP.k),mix:mix.ketamine}));assert.ok(k1.ce>k0+0.3,`ketamine bolus raises Ce (${k0} -> ${k1.ce})`);assert.ok(k1.mix>0.1);
 assert.equal((await caseNames(page))[2],'Propofol + ketamine: a high BIS that is not emergence','real case names outside the quiz');
 await page.close();
 // 4. a case with the quiz: neutral case names and event lines, drug details hidden, the reveal shows names and pump
 page=await open('?case=propket&quiz=1',1280,860);
 assert.equal(await page.evaluate(()=>qz.case),'propket');assert.ok(await page.locator('#pumpCtl').isHidden(),'quiz hides the drug details');
 assert.deepEqual(await caseNames(page),['Case A','Case B','Case C','Case D'],'neutral case names in the quiz');
 await runTo(page,350);await page.waitForSelector('#quizCard:not([hidden]) #quizTitle');await page.click('#quizCheck');await page.click('#quizNext');
 await runTo(page,500);assert.match(await page.textContent('#storyCap'),/· Drug given\.$/,'neutral event line');
 await runTo(page,705);await page.waitForSelector('#quizCard:not([hidden]) #quizTitle');assert.match(await page.textContent('#quizTitle'),/Checkpoint 2 of 3/);
 for(const [q,v] of Object.entries({phase:1,agent:2,arousal:0}))await page.check(`#quizForm input[name=q_${q}][value="${v}"]`);await page.click('#quizCheck');
 assert.ok(await page.locator('#pumpCtl').isVisible(),'the reveal shows the pump');assert.match((await caseNames(page))[2],/^Propofol \+ ketamine/,'and the real case names');
 assert.ok(await page.evaluate(()=>kdxCe(PUMP.k)>0.3&&pumpCe()>2),'ketamine line and propofol TCI both running');
 await page.click('#quizNext');assert.equal((await caseNames(page))[2],'Case C','neutral again while the case continues');
 await runTo(page,1810);await page.waitForSelector('#quizScore');assert.match((await caseNames(page))[2],/^Propofol \+ ketamine/,'real names at the end');
 await page.close();
 // 5. projector: 1920×1080 full screen fits the header, case bar, monitor and dock without page scroll
 page=await open('?case=propdex&bi=1',1920,1080);await page.click('#fullScreen');await page.waitForTimeout(400);
 assert.ok(await page.evaluate(()=>workspace.classList.contains('presenting')));
 const g=await page.evaluate(()=>{const r=e=>document.querySelector(e).getBoundingClientRect();return {adv:r('#advS'),ban:r('#wsBanner'),dock:r('#monitor .panel'),
  sh:document.querySelector('#monitor').scrollHeight,ch:document.querySelector('#monitor').clientHeight};});
 assert.ok(g.adv.width>1100&&g.adv.bottom<=1080,'BIS Advance large and on screen: '+JSON.stringify(g.adv));assert.ok(g.ban.height>60,'header strip kept in full screen');
 assert.ok(g.dock.left>=g.adv.right-1,'dock beside the monitor');assert.ok(g.sh<=g.ch+1,'no page scroll in full screen');
 for(const id of ['#caseChoice','#quizBtn','#pumpCtl','#pause','#wsBanner'])assert.ok(await page.locator(id).isVisible(),id+' usable in full screen');
 await page.locator('#pDexGive').scrollIntoViewIfNeeded();assert.ok(await page.locator('#pDexGive').isVisible(),'dex line reachable in full screen');
 await page.close();
 // 6. phone: no sideways scroll, header, case, quiz and pump reachable
 page=await open('?bi=1',390,844);await frame(page);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow at 390 px');
 for(const id of ['#advS','#wsBanner','#caseChoice','#quizBtn','#pumpCtl'])assert.ok(await page.locator(id).isVisible(),id+' visible on a phone');
 await page.close();
 // the main page keeps its own look: skin picker, no workshop header
 page=await browser.newPage({viewport:{width:1280,height:860}});await page.goto(URL0.replace('workshop/',''));await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null);
 assert.equal(await page.evaluate(()=>mon.skin),'advance');assert.ok(await page.locator('#monitorChoice').isVisible(),'main page keeps the skin picker');
 assert.equal(await page.locator('#wsBanner').count(),0);
 await page.close();
 // 7. home-screen app: the manifest has its own id and scope; the service worker controls /workshop/ only and keeps the page
 //    working offline (venue Wi-Fi drops), including a case link
 const ctx=await browser.newContext({viewport:{width:1180,height:820}});page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(URL0);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null);
 const man=await page.evaluate(async()=>(await fetch(document.querySelector('link[rel=manifest]').href)).json());
 assert.deepEqual([man.id,man.start_url,man.scope,man.display,man.name],['/workshop/','./','./','standalone','EEG Workshop'],'workshop manifest');
 const sw=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return r.scope;});
 assert.ok(sw.endsWith('/eeg/workshop/'),'service worker scope is the workshop folder: '+sw);
 await page.waitForFunction(async()=>{const c=await caches.open('workshop-1');return (await c.keys()).length>=30;},null,{timeout:20000});
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const main=await ctx.newPage();await main.goto(URL0.replace('workshop/',''));await main.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null);
 assert.equal(await main.evaluate(()=>!!navigator.serviceWorker.controller),false,'the main page is not controlled by the workshop service worker');
 await main.close();
 await ctx.setOffline(true);
 for(const q of ['','?case=tci&blind=1']){await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&ADV.built&&COLS.length>10);
  assert.ok(await page.locator('#advS').isVisible(),'offline: the workshop page runs '+q);}
 assert.equal(await page.evaluate(()=>story?.case),'tci','offline: the case link still opens its case');
 await ctx.close();
 assert.deepEqual(errors,[],'no page errors');
 console.log('PASS workshop page: BIS Advance only, masked BIS with Reveal, bilateral, header, case + quiz with neutral names, ketamine line, projector and phone; manifest, service worker (workshop only, offline)');
}finally{await browser.close();}
