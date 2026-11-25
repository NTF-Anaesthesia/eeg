// The workshop page (workshop/index.html, 25 Nov 2026): the main page's BIS Advance screen, fixed (no skin picker), BIS masked
// by default with Reveal, the case picker, quiz and TCI pump always on, a large NTFGH / NUHS header in the NUHS page style
// (ws-page.css). Loaded last on that page only; uses app.js, demo.js, pump.js, cases.js and quiz.js globals.
// BIS masked unless ?blind=0; the Advance's own Unilateral / Bilateral sensor choice (2 or 4 channels) stays, ?bi=1 opens bilateral
const WS_SPEEDS=[1,3,5,10,30,60];
if(wsParams.get('blind')!=='0'&&!blind.on)setBlind(true);
function wsSetBi(on){const b=document.querySelector(`#channelChoice [data-ch="${on?4:2}"]`);if(b&&ADV.ch!==(on?4:2))b.click();}
if(wsParams.get('bi')==='1')wsSetBi(true);
document.querySelectorAll('#channelChoice button').forEach(b=>b.addEventListener('click',()=>{try{const u=new URL(location.href);
 if(b.dataset.ch==='4')u.searchParams.set('bi','1');else u.searchParams.delete('bi');history.replaceState(null,'',u);}catch(e){}}));
// the case caption sits in the control dock here (the main page's notes column is not used)
panel.querySelector('.story').append($('storyCap'));
// the pump is this page's drug source: on from the start (a case sets its own patient)
if(!PUMP.on)pumpStart();
// the NTF Anaesthesia logo heads the workshop banner (links back to the site)
{const b=$('wsBanner');if(b){const a=document.createElement('a');a.className='ws-logo';a.href='https://anantf.com/';a.setAttribute('aria-label','NTF Anaesthesia home');
 a.innerHTML='<img src="../assets/ana-ntf-logo.svg?v=clean" alt="NTF Anaesthesia" width="229" height="120">';b.prepend(a);
 const s=document.createElement('div');s.className='ws-stripe';s.setAttribute('aria-hidden','true');s.innerHTML='<i></i><i></i><i></i><i></i>';b.before(s);}}
// Alpha dropout (a workshop colleague, 25 Nov 2026: "can have the alpha dropout"): one key beside Induce and Emerge that runs the
// engine's surgical stimulus as an alpha dropout (alpha band dips while the hypnotic target is unchanged, 100 s). Off during a
// quiz case, so it cannot change the EEG under a checkpoint question. Burst suppression needs no key: a deeper target gives it.
{const b=document.createElement('button');b.className='btn';b.id='wsAlpha';b.type='button';b.textContent='Alpha dropout';b.setAttribute('aria-pressed','false');
 $('wakeBtn').after(b);
 b.addEventListener('click',()=>{if(b.disabled)return;stimAll('alpha');if(paused)$('pause').click();wsAlphaUI();});
 // also off in an awake patient (index above 80: no anaesthetic yet, or after emergence), where an alpha dropout means nothing
 function wsAlphaUI(){const quiz=typeof qz!=='undefined'&&qz.on&&(qz.case||qz.open),on=eng.stT>0,awake=!on&&(bisS==null||bisS>80);b.disabled=!!quiz||on||awake||!!TL.busy;
  b.setAttribute('aria-pressed',String(on));b.textContent=on?'Alpha dropout…':'Alpha dropout';
  b.title=quiz?'Not during the quiz':on?'Running (about 100 s)':awake?'The patient is awake: give an anaesthetic first':'Alpha band dips while the drug target stays the same';}
 setInterval(wsAlphaUI,300);wsAlphaUI();}
// Playback speed: six keys instead of the main page's slider popover, which the dock's scrolling clipped in the side column
// (owner, 25 Nov 2026: "It should increase the speed of everything, except of course the EEG itself. I don't need a slider
// that is so precise, it can just be like six buttons"). Speed scales the sim clock: engine, DSA, index, SEF, trends, pump,
// case script, timeline and quiz checkpoints; the raw EEG sweeps at real time (app.js DSIG). Cases start at 5x.
{const seg=document.createElement('div');seg.id='speedSeg';seg.className='ws-speed';seg.setAttribute('role','group');seg.setAttribute('aria-label','Playback speed');
 seg.innerHTML=WS_SPEEDS.map(s=>`<button type="button" data-speed="${s}" aria-pressed="${s===speed}" aria-label="${s} times speed">${s}×</button>`).join('');
 panel.querySelector('.transport').after(seg);
 seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{window.speedPicked=true;setSpeed(+b.dataset.speed);syncPlayback();}));}
// The quiz card opens at the top of the control column, which shows only the card while it is open (QA pass, 25 Nov 2026: the
// floating card covered the BIS / SEF column on iPads): beside the monitor in landscape, straight under it in portrait; the
// controls come back on Continue (ws-page.css)
{const q=$('quizCard');if(q){panel.prepend(q);q.classList.add('ws-qcard');
 const sync=()=>{const open=!q.hidden;if(open!==workspace.hasAttribute('data-qopen')){workspace.toggleAttribute('data-qopen',open);panel.scrollTop=0;}dirty=true;};
 new MutationObserver(sync).observe(q,{attributes:true,attributeFilter:['hidden'],childList:true});sync();}}
// Side-by-side row height from the header actually above the monitor (QA pass, 25 Nov 2026: at 1920x1080 the monitor ran past the
// fold because the CSS guessed the header at 110 px); phone landscape, portrait and full screen keep their CSS
function wsRow(){const st=workspace.querySelector('.screens');if(!st)return;
 if(workspace.classList.contains('presenting')||innerHeight<=540||matchMedia('(orientation:portrait),(max-width:639px)').matches){if(workspace.style.getPropertyValue('--ws-row')){workspace.style.removeProperty('--ws-row');scheduleFit();}return;}
 const v=Math.round(Math.max(300,Math.min(1100,innerHeight-(st.getBoundingClientRect().top+scrollY)-12)))+'px';
 if(workspace.style.getPropertyValue('--ws-row')!==v){workspace.style.setProperty('--ws-row',v);scheduleFit();}}
addEventListener('resize',wsRow);addEventListener('load',wsRow);document.addEventListener('fullscreenchange',()=>setTimeout(wsRow,50));
new MutationObserver(()=>setTimeout(wsRow,0)).observe(workspace,{attributes:true,attributeFilter:['class']});
if(window.ResizeObserver)new ResizeObserver(wsRow).observe($('wsStrip')||workspace);wsRow();
// The page opens with an empty trend and DSA too (a case resets it at its own start)
if(!story?.case){ADV.booted=true;wsTrendStart();}
// Auto-pause after Emerge (owner, 25 Nov 2026): once the index is back to about 95 the sim pauses with a caption. A new target,
// sevoflurane, a case or Induce cancels it. The masked index still counts (the pause gives nothing away the caption does not).
const WS_AWAKE=90; // the sim's awake index sits at 90-93 (the owner asked for about 95, which it never reaches)
let wsWake=false;
$('wakeBtn').addEventListener('click',()=>{wsWake=true;});$('induceBtn').addEventListener('click',()=>{wsWake=false;});
setInterval(()=>{if(!wsWake)return;if(story||PUMP.on&&(PUMP.target>0||PUMP.sevoEt>0)){wsWake=false;return;}
 if(!paused&&bisS!=null&&bisS>=WS_AWAKE){wsWake=false;$('pause').click();$('storyCap').textContent='Paused: the patient is awake (index back to about 90). Press play to carry on.';}},250);
// Home screen app: the workshop page's own service worker (scope ./ = /workshop/ only) keeps the page working if the venue Wi-Fi drops
if('serviceWorker' in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{}));
