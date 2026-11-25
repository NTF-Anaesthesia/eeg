// Workshop quiz (25 Nov 2026): in a blinded case the simulation pauses at checkpoints and asks about the phase, the likely
// agent and whether an arousal response is present; the answer shows a teaching note and the hidden BIS, and the case ends with
// a score. Also the workshop header strip (?workshop=1): text name banners only, no logos. Loaded last (after cases.js and
// workshop.js: uses startCase, setBlind and wsParams).
// Deep link: ?case=<id>&quiz=1 (the quiz turns blinded mode on). Teaching notes stay general: the DSA patterns are clues,
// not tests, and the simulator's patterns are a teaching approximation (docs/engine-and-wording.md).
const QZ_OPTS={
 phase:['Awake or lightly sedated','General anaesthesia','Too deep: burst suppression','Lightening or emerging'],
 agent:['Propofol','Sevoflurane','Propofol with ketamine','Propofol with dexmedetomidine'],
 arousal:['No','Yes']};
const QZ_ASK={phase:'Depth or phase?',agent:'Most likely agent?',arousal:'Arousal response to stimulation?'};
const QN={ // shared teaching notes
 prop:'Two bands: strong alpha (8–12 Hz) and slow-delta, dark above about 15 Hz, SEF95 near 15 Hz: the usual propofol pattern at a general anaesthetic level. Propofol and sevoflurane look alike; sevoflurane adds theta (around 5 Hz) from about 1 MAC, filling the gap between slow and alpha. Treat that as a clue, not a test.',
 sevo:'Alpha and slow-delta with theta (around 5 Hz) filling the gap between them, a sevoflurane feature from about 1 MAC; the bands look broader and merge more than with propofol. Telling the agents apart from the DSA alone is uncertain.',
 arousal:'After the incision the alpha band dipped, then faster activity (around 18 Hz) appeared and SEF95 rose at an unchanged hypnotic level. That sequence is consistent with an arousal response to noxious stimulation, but it is not specific: check the clinical signs, drug delivery and signal quality before treating. An opioid blunts the response.',
 emerge:'The anaesthetic has stopped: alpha weakens and slows, slow-delta fades, faster activity returns and SEF95 climbs over minutes as the effect wears off. The change is gradual and follows the drug, unlike the quicker change after the incision. The index lags the EEG.',
 dex:'Slow activity and spindle-like bursts grew and the alpha band became weaker and slower at a steady propofol target, with less fast activity: consistent with dexmedetomidine added to propofol. The index may fall a little; the pattern is a teaching approximation and real patients vary.',
 ket:'BIS and SEF95 rose although the propofol target did not change and nothing was stopped: ketamine adds fast beta-gamma activity and weakens alpha. A high index here need not mean light anaesthesia or emergence. Compare with emergence: there the slow-delta fades too; here it stays.'};
// checkpoints: at (sim s after the case start), the correct answer(s) by question, and the note
const QUIZ={
 tci:[{at:345,a:{phase:1,agent:0,arousal:0},note:QN.prop},{at:690,a:{phase:1,agent:0,arousal:1},note:QN.arousal},{at:1500,a:{phase:3,agent:0,arousal:0},note:QN.emerge}],
 sevo:[{at:345,a:{phase:1,agent:1,arousal:0},note:QN.sevo},{at:640,a:{phase:1,agent:1,arousal:1},note:QN.arousal},{at:1290,a:{phase:3,agent:1,arousal:0},note:QN.emerge+' Volatile washout is quick in this case.'}],
 propdex:[{at:345,a:{phase:1,agent:0,arousal:0},note:QN.prop},{at:1000,a:{phase:1,agent:3,arousal:0},note:QN.dex},{at:1650,a:{phase:3,agent:[0,3],arousal:0},note:QN.emerge+' Dexmedetomidine leaves slowly, so the slow activity can linger.'}],
 propket:[{at:345,a:{phase:1,agent:0,arousal:0},note:QN.prop},{at:700,a:{phase:1,agent:2,arousal:0},note:QN.ket},{at:1650,a:{phase:3,agent:[0,2],arousal:0},note:QN.emerge+' The ketamine was stopped earlier, so the agent now is mainly propofol.'}]};
const qz={on:false,case:null,done:new Set(),i:-1,score:0,max:0,log:[],open:false,ended:false,seed:0,letters:{}};
// ----- the strip: Quiz key and the optional workshop banners -----
const quizBtn=document.createElement('button');quizBtn.type='button';quizBtn.id='quizBtn';quizBtn.className='ws-quiz';quizBtn.textContent='Quiz';
quizBtn.setAttribute('aria-pressed','false');quizBtn.title='Quiz: blinded case with questions at checkpoints';wsStrip.append(quizBtn);
if(WS_PAGE||wsParams.get('workshop')==='1'){const b=document.createElement('div');b.className='ws-banner';b.id='wsBanner';
 b.innerHTML='<span class="ws-org"><abbr title="Ng Teng Fong General Hospital">NTFGH</abbr></span><span class="ws-org"><abbr title="National University Health System">NUHS</abbr></span>'+
  `<span class="ws-title"><b>EEG workshop</b> Blinded BIS DSA &amp; SEF95 interpretation · case simulator</span>`;
 wsStrip.prepend(b);workspace.dataset.workshop='on';}
// ----- the card -----
const qCard=document.createElement('section');qCard.id='quizCard';qCard.className='quiz-card';qCard.hidden=true;
qCard.setAttribute('role','dialog');qCard.setAttribute('aria-modal','false');qCard.setAttribute('aria-labelledby','quizTitle');workspace.append(qCard);
const qHide=document.createElement('p');qHide.className='quiz-hidden';qHide.id='quizHidden';qHide.textContent='Drug details are hidden during the quiz.';$('pumpCtl').after(qHide);
const qEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// in the quiz the case menu shows neutral names (Case A, B...) so it gives no drug away; the real names come back after Check
// answers (until Continue) and when the case ends
// the letters are shuffled each time the quiz is turned on (QA pass, 25 Nov 2026: fixed letters gave the mapping away after one
// reveal); while neutral the menu lists the cases in letter order
function qzShuffle(seed){qz.seed=seed;let a=seed>>>0||1;const rnd=()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 const ids=Object.keys(CASES);for(let i=ids.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 qz.letters={};ids.forEach((id,i)=>qz.letters[id]=String.fromCharCode(65+i));}
qzShuffle(1+Math.floor(Math.random()*9999));
const qzLetter=id=>`Case ${qz.letters[id]||'?'}`;
function qzNames(){const neutral=qz.on&&(qz.case?workspace.dataset.quiz==='on':!qz.ended),order=Object.keys(CASES);
 const opts=[...caseSel.options].filter(o=>CASES[o.value]);
 for(const o of opts){const t=neutral?qzLetter(o.value):CASES[o.value].label;if(o.textContent!==t)o.textContent=t;}
 const key=o=>neutral?qz.letters[o.value]:order.indexOf(o.value),sorted=opts.slice().sort((a,b)=>key(a)<key(b)?-1:1);
 if(sorted.some((o,i)=>o!==opts[i])){const v=caseSel.value;for(const o of sorted)caseSel.append(o);caseSel.value=v;}}
function qzUI(){quizBtn.setAttribute('aria-pressed',String(qz.on));workspace.dataset.quiz=qz.on&&qz.case?'on':'off';qzNames();
 // the address bar shows no case or quiz once a quiz case runs (QA pass: the case id gave the answer away on the presenter's screen);
 // deep links still work on load
 try{const u=new URL(location.href);if(qz.on&&qz.case){u.searchParams.delete('quiz');u.searchParams.delete('case');}else if(qz.on)u.searchParams.set('quiz','1');else u.searchParams.delete('quiz');
  history.replaceState(null,'',u);}catch(e){}
 qzLocks();}
function qzReset(id){qz.case=id;qz.ended=false;qz.done=new Set();qz.i=-1;qz.score=0;qz.max=0;qz.log=[];qzClose();}
function qzClose(){qz.open=false;qCard.hidden=true;qCard.innerHTML='';if(workspace.dataset.quiz==='reveal')workspace.dataset.quiz='on';qzNames();qzLocks();}
const qzOk=(c,v)=>Array.isArray(c)?c.includes(v):c===v;
function qzAsk(i){const cp=QUIZ[qz.case][i];qz.i=i;qz.open=true;if(!paused)$('pause').click();qzLocks();
 const n=QUIZ[qz.case].length;
 qCard.innerHTML=`<h2 id="quizTitle" tabindex="-1">Checkpoint ${i+1} of ${n}</h2><p class="quiz-lead">Read the DSA, SEF95 and raw EEG. The index is hidden.</p><form id="quizForm">`+
  Object.keys(cp.a).map(q=>`<fieldset><legend>${QZ_ASK[q]}</legend>${QZ_OPTS[q].map((o,j)=>`<label><input type="radio" name="q_${q}" value="${j}"> ${qEsc(o).replace('dexmedetomidine','dexmede\u00ADtomidine')}</label>`).join('')}</fieldset>`).join('')+
  `<div class="quiz-actions"><button type="submit" id="quizCheck">Check answers</button></div></form>`;
 const f=$('quizForm');f.addEventListener('submit',e=>{e.preventDefault();qzMark(cp,f);});
 qzShow();$('quizTitle').focus({preventScroll:true});} // the heading, not the first answer (it looked chosen)
function qzMark(cp,f){const res=[];let got=0;
 for(const [q,c] of Object.entries(cp.a)){const el=f.querySelector(`input[name=q_${q}]:checked`),v=el?+el.value:null,ok=v!=null&&qzOk(c,v);if(ok)got++;
  res.push({q,ok,your:v==null?'No answer':QZ_OPTS[q][v],right:(Array.isArray(c)?c:[c]).map(j=>QZ_OPTS[q][j]).join(' or ')});}
 workspace.dataset.quiz='reveal';qzNames(); // the answer shows the drug details (pump panel) and case names until the case continues
 qz.score+=got;qz.max+=res.length;qz.log.push({i:qz.i,got,of:res.length});
 const col=COLS[COLS.length-1]||{},bis=col.bis==null?'--':Math.round(col.bis),sef=col.sef==null?'--':Math.round(col.sef);
 qCard.innerHTML=`<h2 id="quizTitle">Checkpoint ${qz.i+1}: ${got} of ${res.length}</h2><ul class="quiz-res">`+
  res.map(r=>`<li class="${r.ok?'ok':'no'}"><b>${QZ_ASK[r.q]}</b> ${r.ok?'Correct':'Not quite'}: ${qEsc(r.right)}${r.ok?'':` <span>(you: ${qEsc(r.your)})</span>`}</li>`).join('')+
  `</ul><p class="quiz-bis">Hidden BIS <b id="quizBis">${bis}</b> · SEF95 ${sef} Hz</p><p class="quiz-case" id="quizCase">${qzLetter(qz.case)} is ${qEsc(CASES[qz.case].label)}</p>`+
  qzEvents(qz.i)+`<p class="quiz-note">${qEsc(cp.note)}</p>`+
  `<div class="quiz-actions"><button type="button" id="quizNext">Continue the case</button></div>`;
 qzLocks();qzShow();$('quizNext').onclick=()=>{qzClose();if(paused)$('pause').click();};$('quizNext').focus({preventScroll:true});}
// the case's step captions are hidden during the quiz (they named the phase: "Relaxant given", "Surgery continues"); the answer
// lists the ones since the last checkpoint
function qzEvents(i){const cps=QUIZ[qz.case]||[],from=i>0?cps[i-1].at:-1,to=cps[i].at,steps=(story&&story.case===qz.case&&story.steps)||CASES[qz.case].steps;
 const caps=steps.filter(s=>s.at>from&&s.at<=to&&s.cap).map(s=>`<li>${qEsc(s.cap)}</li>`);
 return caps.length?`<div class="quiz-events"><b>What happened</b><ul id="quizEvents">${caps.join('')}</ul></div>`:'';}
// show the card (the workshop page places it in the control column or under the monitor, ws-page.js) with its button in view
// (questions: the page scrolls just enough to show Check answers; an answer or the summary opens at its top and may scroll)
function qzShow(){qCard.hidden=false;qCard.scrollTop=0;const col=qCard.closest('.panel');if(col)col.scrollTop=0;if(innerWidth<=560)stage.scrollIntoView({block:'start'});
 requestAnimationFrame(()=>{const b=qCard.querySelector('#quizForm .quiz-actions');if(b&&b.getBoundingClientRect().bottom>innerHeight)b.scrollIntoView({block:'nearest'});});}
function qzSummary(){const n=QUIZ[qz.case]?.length||0,label=CASES[qz.case]?.label||'';qz.open=true;
 const line=qz.max?`You scored ${qz.score} of ${qz.max}.`:'No checkpoints answered.';
 qCard.innerHTML=`<h2 id="quizTitle">Case complete</h2><p class="quiz-lead">${qz.letters[qz.case]?qEsc(qzLetter(qz.case))+': ':''}${qEsc(label)}</p><p class="quiz-score" id="quizScore">${line}</p>`+
  (qz.log.length<n?`<p class="quiz-note">${n-qz.log.length} checkpoint(s) were skipped (the timeline jumped past them).</p>`:'')+
  `<p class="quiz-note">The patterns are a teaching approximation from population data; real patients vary. Tap Reveal to see the index again.</p>`+
  `<div class="quiz-actions"><button type="button" id="quizAgain">Play again</button><button type="button" id="quizDone">Close</button></div>`;
 const id=qz.case;qz.case=null;qz.ended=true;qzUI();qzShow();
 $('quizAgain').onclick=()=>{qzClose();startCase(id);};$('quizDone').onclick=()=>qzClose();$('quizDone').focus({preventScroll:true});}
// start a case with the quiz: blinded, drug details hidden, checkpoints armed
const startCasePlain=startCase;
startCase=function(id){const ok=startCasePlain(id);if(ok&&qz.on){qzReset(id);setBlind(true);qzUI();$('storyCap').textContent='';}else if(ok){qzReset(null);qzUI();storyCapRefresh();}return ok;};
function setQuiz(on){if(on&&!qz.on)qzShuffle(1+Math.floor(Math.random()*9999));qz.on=!!on;qzUI();if(qz.on){if(story?.case)startCase(story.case);}else{qzReset(null);qzUI();storyCapRefresh();}}
// the case's step captions are hidden in a quiz case (QA pass, 25 Nov 2026: "Relaxant given", "Surgery continues" and the step
// count gave answers away); app.js runStory asks this
function capHidden(){return qz.on&&!!qz.case;}
quizBtn.addEventListener('click',()=>setQuiz(!qz.on));
// checkpoints: pause when the case reaches one. A checkpoint is never asked against later EEG (QA pass, 25 Nov 2026: a timeline
// jump asked an old question): the timeline is locked in a quiz case, a jump that passes one marks it skipped (TL.onJump), and
// one passed more than 20 sim s ago is skipped too
// checked every frame, so at 60x a checkpoint fires within about a sim second of its time
const qzTick=()=>{if(!qz.case||qz.open||TL.busy)return;
 if(!story||story.case!==qz.case){qzSummary();return;}
 const t=simT-story.t0,cps=QUIZ[qz.case]||[];let last=-1;
 cps.forEach((c,i)=>{if(c.at<=t&&!qz.done.has(i)){qz.done.add(i);if(t-c.at<=20)last=i;}});
 if(last>=0)qzAsk(last);};
(function qzLoop(){requestAnimationFrame(qzLoop);qzTick();})();
qCard.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();}});
TL.onJump=()=>{if(!qz.case||!story||story.case!==qz.case)return;const t=simT-story.t0;(QUIZ[qz.case]||[]).forEach((c,i)=>{if(c.at<=t)qz.done.add(i);});};
// a quiz deep link: the case started (cases.js) before the quiz was armed, so clear its first caption
if(wsParams.get('quiz')==='1'){qz.on=true;qzUI();if(story?.case){qzReset(story.case);setBlind(true);qzUI();$('storyCap').textContent='';}}
// ----- locks (QA pass, 25 Nov 2026) -----
// questions on screen: no Reveal or Blind key (they showed the hidden BIS); a checkpoint card open: the case waits for Continue
// (no play, speed, timeline or case change); a quiz case running: no Induce or Emerge (they ended the scripted case) and no
// timeline jumps
function qzAsking(){return qz.open&&!!qz.case&&workspace.dataset.quiz!=='reveal';}
function qzAtCp(){return qz.open&&!!qz.case;}
function qzRunning(){return qz.on&&!!qz.case;}
function qzLock(el,off,why){if(!el)return;if(!('t0' in el.dataset))el.dataset.t0=el.title||'';if(el.disabled!==off){el.disabled=off;el.title=off?why:el.dataset.t0;}}
function qzLocks(){const ask=qzAsking(),cp=qzAtCp(),run=qzRunning();
 qzLock(revealBtn,ask,'Answer the checkpoint first');qzLock(blindBtn,ask,'Answer the checkpoint first');
 const wait='Continue the case from the quiz card';
 qzLock($('pause'),cp,wait);document.querySelectorAll('#speedSeg button').forEach(b=>qzLock(b,cp,wait));qzLock($('playSpeed'),cp,wait);
 qzLock(caseSel,cp,wait);qzLock(quizBtn,cp,wait);
 qzLock($('induceBtn'),run,'The quiz case is scripted');qzLock($('wakeBtn'),run,'The quiz case is scripted');qzLock($('storyBtn'),run,'The quiz case is scripted');
 const tl=run||cp;TL.lock=tl;qzLock($('timeScrub'),tl||TL.busy,'The timeline is locked during the quiz');document.querySelectorAll('#tBtns button').forEach(b=>qzLock(b,tl,'The timeline is locked during the quiz'));
 $('tLine')?.classList.toggle('locked',tl);}
{const sb=setBlind,sr=setReveal;setBlind=function(on){if(qzAsking())return;return sb(on);};setReveal=function(on){if(qzAsking())return;return sr(on);};}
setInterval(qzLocks,250);qzLocks();
