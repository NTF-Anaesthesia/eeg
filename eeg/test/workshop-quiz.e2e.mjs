// Workshop quiz and banners (25 Nov 2026): ?case=<id>&quiz=1 runs the case blinded, pauses at checkpoints with three questions,
// marks them with a teaching note and the hidden BIS, and scores the case; ?workshop=1 shows the text name banners.
// Run with a static server in the repo root: PORT=8080 node eeg/test/workshop-quiz.e2e.mjs
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1280,height:860}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const BASE=`http://localhost:${process.env.PORT||8080}/eeg/`;
const ready=()=>page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&typeof qz!=='undefined');
const runTo=t=>page.evaluate(t=>{if(story)tlRun(Math.max(0,story.t0+t-simT));},t);
const card=()=>page.waitForSelector('#quizCard:not([hidden]) #quizTitle');
const answer=async a=>{for(const [q,v] of Object.entries(a))await page.check(`#quizForm input[name=q_${q}][value="${v}"]`);await page.click('#quizCheck');};
try{
 await page.goto(BASE+'?workshop=1&case=tci&quiz=1');await ready();
 // banners: text only, both names, no images
 const ban=await page.locator('#wsBanner');assert.ok(await ban.isVisible(),'workshop strip shows with ?workshop=1');
 assert.match(await ban.textContent(),/NTFGH.*NUHS.*Blinded BIS DSA & SEF95 interpretation/s);assert.equal(await ban.locator('img,svg').count(),0,'no logo images');
 // quiz state: blinded, drug details hidden, neutral captions
 let s=await page.evaluate(()=>({blind:masked(),q:workspace.dataset.quiz,case:qz.case,pressed:$('quizBtn').getAttribute('aria-pressed')}));
 assert.deepEqual(s,{blind:true,q:'on',case:'tci',pressed:'true'});
 assert.ok(await page.locator('#pumpCtl').isHidden()&&await page.locator('#agentChoice').isHidden(),'pump and agent hidden');assert.ok(await page.locator('#quizHidden').isVisible());
 await runTo(60);assert.equal(await page.textContent('#storyCap'),'','no step caption in a quiz case (it named the phase)');
 // checkpoint 1 (maintenance): pauses, all correct
 await runTo(350);await card();assert.equal(await page.evaluate(()=>paused),true,'the case pauses at a checkpoint');
 assert.match(await page.textContent('#quizTitle'),/Checkpoint 1 of 3/);assert.equal(await page.locator('#quizForm fieldset').count(),3,'phase, agent, arousal');
 await answer({phase:1,agent:0,arousal:0});
 assert.match(await page.textContent('#quizTitle'),/3 of 3/);
 const hb=await page.evaluate(()=>({shown:$('quizBis').textContent,bis:Math.round(COLS.at(-1).bis)}));assert.equal(hb.shown,String(hb.bis),'answer shows the hidden BIS');
 // one 15-s reading at Ce 4 (mean 42.7, sd 2.45 over 30 runs): 38 failed about 1 run in 10; 30 is about 4.4 sd (test/margins.probe.mjs)
 assert.ok(+hb.shown>=30&&+hb.shown<=60,'maintenance BIS in range: '+hb.shown);assert.match(await page.textContent('.quiz-note'),/propofol pattern/);
 assert.equal(await page.evaluate(()=>masked()),true,'still masked on the monitor');
 await page.click('#quizNext');assert.equal(await page.evaluate(()=>paused),false,'Continue resumes the case');assert.ok(await page.locator('#quizCard').isHidden());
 // checkpoint 2 (incision arousal): one wrong
 await runTo(695);await card();await answer({phase:1,agent:1,arousal:1});
 assert.match(await page.textContent('#quizTitle'),/2 of 3/);assert.equal(await page.locator('.quiz-res li.no').count(),1);assert.match(await page.textContent('.quiz-note'),/arousal response/);
 const hb2=+(await page.textContent('#quizBis'));assert.ok(hb2>hb.bis+8,`hidden BIS higher during arousal (${hb.bis} -> ${hb2})`);
 await page.click('#quizNext');
 // checkpoint 3 (emergence) then the score at the end
 await runTo(1505);await card();await answer({phase:3,agent:0,arousal:0});await page.click('#quizNext');
 await runTo(1810);await page.waitForSelector('#quizScore');assert.equal((await page.textContent('#quizScore')).trim(),'You scored 8 of 9.');
 // play again restarts the case with a fresh score
 await page.click('#quizAgain');s=await page.evaluate(()=>({case:story?.case,score:qz.score,max:qz.max,blind:masked()}));assert.deepEqual(s,{case:'tci',score:0,max:0,blind:true});
 // the ketamine case: a high hidden BIS that is not emergence
 await page.selectOption('#caseChoice','propket');await runTo(350);await card();await answer({phase:1,agent:0,arousal:0});await page.click('#quizNext');
 await runTo(705);await card();await answer({phase:1,agent:2,arousal:0});assert.match(await page.textContent('#quizTitle'),/3 of 3/);
 assert.match(await page.textContent('.quiz-note'),/need not mean light anaesthesia or emergence/);await page.click('#quizNext');
 // quiz off: card gone, address drops quiz, drug details back
 await page.click('#quizBtn');assert.ok(!page.url().includes('quiz='));assert.ok(await page.locator('#pumpCtl').isVisible(),'pump panel back');
 // phone: the card fits and its buttons are full touch targets
 await page.setViewportSize({width:390,height:844});await page.goto(BASE+'?case=sevo&quiz=1');await ready();await runTo(350);await card();
 const bb=await page.locator('#quizCard').boundingBox();assert.ok(bb.x>=0&&bb.x+bb.width<=390&&bb.y+bb.height<=844,'card fits a phone');
 const cb=await page.locator('#quizCheck').boundingBox();assert.ok(cb.height>=44);
 assert.ok(await page.locator('#wsBanner').count()===0,'no banners without ?workshop=1');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
 assert.deepEqual(errors,[]);
 console.log('PASS workshop quiz: blinded case pauses at checkpoints, marks answers with notes and the hidden BIS, scores; NTFGH/NUHS text banners');
}finally{await browser.close();}
