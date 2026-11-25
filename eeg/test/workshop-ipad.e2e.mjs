// Workshop page on iPads (25 Nov 2026: the participants use iPads), in WebKit with touch: iPad 10th gen 820×1180 and 1180×820,
// iPad Pro 1024×1366 and 1366×1024, and a phone in landscape (844×390). Checks behaviour by tapping, not just presence:
// no sideways scroll; landscape = monitor with the controls in a side column, portrait = stacked with no blank band; every
// visible control at least 44 px; taps work (Quiz, Ce/Cp, sensor channels, Reveal, Give ketamine, the Advance's own menu
// key, Alpha dropout, the full-screen key's focus mode); the pump target slider follows a drag; no teaching text or pump note;
// the home-screen manifest is linked with its own id and scope; the monitor grows in focus mode; a quiz checkpoint card sits
// beside or under the monitor with Check answers in view, answered by taps.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-ipad.e2e.mjs (needs Playwright's WebKit)
import assert from 'node:assert/strict';
const {webkit}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await webkit.launch();
const URL0=`http://localhost:${process.env.PORT||8080}/eeg/workshop/`;
const UA='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const errors=[];
async function open(w,h,q=''){const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2,userAgent:UA});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(`${w}×${h}: ${e.message}`));
 await page.goto(URL0+q);await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&ADV.built);return page;}
const box=(p,s)=>p.locator(s).first().evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom};});
// tap a control after scrolling it into view (a real finger tap: touchstart/touchend, then the click)
const tap=async(p,s)=>{const l=p.locator(s).first();await l.scrollIntoViewIfNeeded();await l.tap();};
try{
 for(const [w,h] of [[820,1180],[1180,820],[1024,1366],[1366,1024],[844,390]]){
  const land=w>h,page=await open(w,h,'?case=propket'),tag=`${w}×${h}`;
  // 1. no sideways scroll
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tag}: no sideways scroll`);
  // 2. layout: landscape side by side with the monitor filling its row; portrait stacked, the screen box the monitor's height
  const adv=await box(page,'#advWrap'),scr=await box(page,'#monitor .screens'),pan=await box(page,'#monitor .panel');
  if(land){assert.ok(pan.x>=adv.r-1&&Math.abs(pan.y-scr.y)<4,`${tag}: controls beside the monitor: ${JSON.stringify({adv,pan})}`);
   assert.ok(pan.h<=scr.h+2,`${tag}: the side column is no taller than the monitor row`);
   assert.ok(adv.h>=scr.h-12||adv.w>=scr.w-12,`${tag}: the monitor fills its row: ${JSON.stringify({adv,scr})}`);
   assert.ok(adv.w>=0.55*w,`${tag}: the monitor takes most of the width (${Math.round(adv.w)} px)`);}
  else{assert.ok(pan.y>=scr.b-1,`${tag}: controls under the monitor`);
   assert.ok(scr.h-adv.h<16,`${tag}: no blank band around the monitor: screens ${Math.round(scr.h)}, monitor ${Math.round(adv.h)}`);
   assert.ok(adv.w>=w-60,`${tag}: the monitor is full width`);}
  // 3. touch targets: every visible control outside the device screen is at least 44 px high (and 44 wide unless a text field)
  const small=await page.evaluate(()=>[...document.querySelectorAll('#monitor :is(button,select,input,summary), .ws-quiz')].filter(e=>{
   if(e.closest('.advwrap,#wsStubs,.quiz-card')||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden')return false;const r=e.getBoundingClientRect();
   if(!r.width||!r.height)return false;return r.height<44||(r.width<44&&e.type!=='number'&&e.type!=='radio');}).map(e=>`${e.id||e.className||e.tagName} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`));
  assert.deepEqual(small,[],`${tag}: controls under 44 px`);
  // inputs 16 px or more, so iOS does not zoom into them
  const tiny=await page.evaluate(()=>[...document.querySelectorAll('#monitor :is(select,input[type=number])')].filter(e=>e.getClientRects().length&&!e.closest('.advwrap,#wsStubs')&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.id));
  assert.deepEqual(tiny,[],`${tag}: input text under 16 px`);
  // 4. only the simulator: no teaching panels, no pump note, a one-line footer
  for(const s of ['#observationNotes','#learningButton','.pump-note','#teachingOptions','.reading','#storyBtn'])
   assert.ok(await page.locator(s).first().isHidden(),`${tag}: ${s} not shown`);
  assert.ok((await page.locator('.ws-foot').innerText()).length<140,`${tag}: short footer`);
  assert.match(await page.locator('.ws-foot').innerText(),/Not for clinical use/);
  // 5. taps
  await tap(page,'#channelChoice [data-ch="4"]');assert.equal(await page.evaluate(()=>ADV.ch),4,`${tag}: tap Bilateral`);
  await tap(page,'#channelChoice [data-ch="2"]');assert.equal(await page.evaluate(()=>ADV.ch),2,`${tag}: tap Unilateral`);
  await tap(page,'#revealBtn');assert.equal(await page.evaluate(()=>masked()),false,`${tag}: tap Reveal shows the index`);
  await tap(page,'#revealBtn');assert.equal(await page.evaluate(()=>masked()),true,`${tag}: tap Mask hides it again`);
  await tap(page,'#aMenu');assert.equal(await page.evaluate(()=>ADV.menu),true,`${tag}: the Advance's menu key opens its menu`);
  await page.evaluate(()=>advCloseMenu());
  await tap(page,'#pModeSeg [data-m="Cp"]');assert.equal(await page.evaluate(()=>PUMP.mode),'Cp',`${tag}: tap Cp`);
  await tap(page,'#pModeSeg [data-m="Ce"]');assert.equal(await page.evaluate(()=>PUMP.mode),'Ce',`${tag}: tap Ce`);
  // speed keys: a tap sets the sim speed and presses that key only
  await tap(page,'#speedSeg [data-speed="10"]');assert.equal(await page.evaluate(()=>speed),10,`${tag}: tap 10x`);
  assert.equal(await page.locator('#speedSeg [aria-pressed=true]').count(),1);
  await tap(page,'#speedSeg [data-speed="5"]');
  // Alpha dropout: runs the stimulus as an alpha dip; the key shows it running
  // (off while awake: move the case into maintenance first)
  await page.evaluate(()=>{tlRun(Math.max(0,story.t0+420-simT));dirty=true;});await page.waitForFunction(()=>!$('wsAlpha').disabled);
  await tap(page,'#wsAlpha');assert.ok(await page.evaluate(()=>eng.stT>0&&eng.stK==='alpha'),`${tag}: tap Alpha dropout`);
  assert.equal(await page.locator('#wsAlpha').getAttribute('aria-pressed'),'true');
  // Give ketamine: its Ce rises
  await tap(page,'#pKetGive');await page.evaluate(()=>tlRun(60));
  assert.ok(await page.evaluate(()=>kdxCe(PUMP.k)>0.2),`${tag}: tap Give ketamine raises its Ce`);
  // 6. the propofol target slider follows a drag (pointer drag along the track)
  const sl=page.locator('#pTgt');await sl.scrollIntoViewIfNeeded();const sb=await box(page,'#pTgt');assert.ok(sb.h>=44,`${tag}: slider 44 px high`);
  await page.mouse.move(sb.x+6,sb.y+sb.h/2);await page.mouse.down();await page.mouse.move(sb.x+sb.w*0.5,sb.y+sb.h/2,{steps:6});await page.mouse.up();
  const tg=await page.evaluate(()=>PUMP.target);assert.ok(tg>2&&tg<6,`${tag}: dragging the target slider sets the target (${tg})`);
  // 7. Quiz: tap turns it on; Alpha dropout is off during the quiz case
  await tap(page,'#quizBtn');assert.equal(await page.locator('#quizBtn').getAttribute('aria-pressed'),'true',`${tag}: tap Quiz`);
  await page.waitForTimeout(400);assert.ok(await page.locator('#wsAlpha').isDisabled(),`${tag}: Alpha dropout disabled in the quiz`);
  await tap(page,'#quizBtn');await page.waitForTimeout(400);
  // 8. full screen: the focus mode fills the screen whether or not the browser grants real full screen
  await tap(page,'#fullScreen');await page.waitForTimeout(300);
  const fs=await box(page,'#monitor');assert.ok(await page.evaluate(()=>workspace.classList.contains('presenting')),`${tag}: focus mode on`);
  assert.ok(Math.abs(fs.w-w)<2&&Math.abs(fs.h-h)<2&&Math.abs(fs.x)<1&&Math.abs(fs.y)<1,`${tag}: focus mode fills the viewport: ${JSON.stringify(fs)}`);
  if(land){const a=await box(page,'#advWrap');assert.ok(a.b<=h+1,`${tag}: the monitor fits on screen in focus mode`);
   if(w>=1024)assert.ok(a.h>adv.h+15,`${tag}: the monitor is bigger in focus mode (${Math.round(adv.h)} -> ${Math.round(a.h)} px)`);}
  await tap(page,'#fullScreen');await page.waitForTimeout(300);
  assert.ok(!(await page.evaluate(()=>workspace.classList.contains('presenting'))),`${tag}: focus mode off`);
  await page.context().close();
  // 10. a quiz checkpoint (QA pass, 25 Nov 2026): the card beside (landscape) or under (portrait) the monitor, never over it,
  // Check answers in view without scrolling inside the card, Reveal locked; answered by taps
  if(h>=820){const q=await open(w,h,'?case=sevo&quiz=1');await q.evaluate(()=>{tlRun(story.t0+350-simT);dirty=true;});
   await q.waitForSelector('#quizCard:not([hidden]) #quizCheck');await q.waitForTimeout(300);
   const a=await box(q,'#advWrap'),c=await box(q,'#quizCard'),b=await box(q,'#quizCheck');
   assert.ok(land?c.x>=a.r-1:c.y>=a.b-1,`${tag}: quiz card ${land?'beside':'under'} the monitor ${JSON.stringify({a,c})}`);
   assert.ok(b.y>=0&&b.b<=h+1,`${tag}: Check answers in view ${JSON.stringify(b)}`);
   assert.ok(await q.evaluate(()=>{const c=$('quizCard');return c.scrollHeight-c.clientHeight<=1;}),`${tag}: no scrolling inside the card`);
   assert.ok(await q.locator('#revealBtn').isDisabled(),`${tag}: Reveal locked at the checkpoint`);
   for(const n of ['phase','agent','arousal'])await tap(q,`#quizForm input[name=q_${n}][value="0"]`);
   await tap(q,'#quizCheck');assert.match(await q.textContent('#quizTitle'),/Checkpoint 1: \d of 3/,`${tag}: tap Check answers`);
   await tap(q,'#quizNext');assert.equal(await q.evaluate(()=>paused),false,`${tag}: tap Continue`);
   await q.context().close();}
  console.log(`ok ${tag}`);
 }
 // 9. home-screen app: manifest with its own id and scope, iOS meta, the install prompt cancelled
 const page=await open(1180,820);
 const man=await page.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');const m=await (await fetch(l.href)).json();return {m,base:new URL(l.href).href};});
 assert.equal(man.m.id,'/workshop/');assert.equal(man.m.start_url,'./');assert.equal(man.m.scope,'./');assert.equal(man.m.display,'standalone');
 assert.equal(man.m.short_name,'EEG Workshop');assert.ok(man.m.icons.some(i=>i.sizes==='512x512'),'512 px icon');
 for(const i of man.m.icons)assert.equal((await page.request.get(new URL(i.src,man.base).href)).status(),200,'icon '+i.src);
 assert.equal(await page.getAttribute('meta[name=apple-mobile-web-app-title]','content'),'EEG Workshop');
 assert.equal(await page.getAttribute('meta[name=apple-mobile-web-app-capable]','content'),'yes');
 assert.equal((await page.request.get(new URL(await page.getAttribute('link[rel=apple-touch-icon]','href'),page.url()).href)).status(),200,'apple-touch-icon');
 assert.match(await page.content(),/beforeinstallprompt', e => e\.preventDefault\(\)/);
 await page.context().close();
 assert.deepEqual(errors,[],'no page errors');
 console.log('PASS workshop iPad (WebKit, touch): 820×1180, 1180×820, 1024×1366, 1366×1024, 844×390; side column in landscape, stacked in portrait, 44 px targets, taps, slider drag, focus mode, manifest');
}finally{await browser.close();}
