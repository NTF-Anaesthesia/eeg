// Workshop tools (25 Nov 2026): blinded mode. Loaded after demo.js; uses app.js's `blind`, `masked()` and the toolbar demo.js built.
// Blinded mode masks the numeric index (BIS, PSi) on every monitor and keeps the DSA, SEF95 and the raw EEG, so a learner titrates
// from the picture alone. The Blind key (or ?blind=1) turns it on; Reveal shows the number until it is pressed again.
ICON.eyeOff='<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c5 0 8.5 4.2 9.6 6.4a1.3 1.3 0 0 1 0 1.2 15.6 15.6 0 0 1-2.9 3.8M6.6 6.6A15.4 15.4 0 0 0 2.4 11.4a1.3 1.3 0 0 0 0 1.2C3.5 14.8 7 19 12 19a9.9 9.9 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
ICON.eye='<path d="M2.4 11.4C3.5 9.2 7 5 12 5s8.5 4.2 9.6 6.4a1.3 1.3 0 0 1 0 1.2C20.5 14.8 17 19 12 19s-8.5-4.2-9.6-6.4a1.3 1.3 0 0 1 0-1.2Z"/><circle cx="12" cy="12" r="3"/>';
const wsParams=new URLSearchParams(location.search);
const blindBtn=iconButton('blindBtn','Blinded mode: mask the BIS or PSi number','eyeOff');blindBtn.setAttribute('aria-pressed','false');
const revealBtn=iconButton('revealBtn','Reveal the masked number','eye');revealBtn.setAttribute('aria-pressed','false');revealBtn.hidden=true;
revealBtn.innerHTML=icon('eye')+'<span>Reveal</span>';revealBtn.classList.add('reveal-button');
settingsButton.before(blindBtn,revealBtn);
// redraw every screen so the mask (or the number) shows at once, not at the next column
function blindRefresh(){dirty=true;
 try{if(typeof advInval==='function')advInval();ADV.chartKey=null;ADV.alarmDirty=true;}catch(e){}
 try{if(typeof sedInval==='function')sedInval();SED.outSince=null;}catch(e){}
 try{PV.dirty=true;}catch(e){}
 if(zoneBand.pts)zoneBand(zoneBand.pts);$('tgtPop').hidden=true;
 try{readouts();describe();fcUI();}catch(e){}
 try{storyCapRefresh();}catch(e){}} // the case caption too (QA pass, 25 Nov 2026: Reveal left the old one)
function blindUI(){blindBtn.setAttribute('aria-pressed',String(blind.on));revealBtn.hidden=!blind.on;revealBtn.setAttribute('aria-pressed',String(blind.reveal));
 const rl=blind.reveal?'Mask the number again':'Reveal the masked number';revealBtn.setAttribute('aria-label',rl);revealBtn.title=rl;
 revealBtn.querySelector('span').textContent=blind.reveal?'Mask':'Reveal';
 workspace.dataset.blind=blind.on?(blind.reveal?'revealed':'masked'):'off';
 // keep the address shareable: ?blind=1 while blinded
 try{const u=new URL(location.href);if(blind.on)u.searchParams.set('blind','1');else u.searchParams.delete('blind');history.replaceState(null,'',u);}catch(e){}}
function setBlind(on){blind.on=!!on;blind.reveal=false;blindUI();blindRefresh();}
function setReveal(on){if(!blind.on)return;blind.reveal=!!on;blindUI();blindRefresh();}
blindBtn.addEventListener('click',()=>setBlind(!blind.on));
revealBtn.addEventListener('click',()=>setReveal(!blind.reveal));
if(wsParams.get('blind')==='1')setBlind(true);
