// Workshop case files (25 Nov 2026): scripted, synthetic cases run on the story mechanism (app.js runStory) with the TCI pump
// (pump.js) as the drug source. Each step: at (sim s from the case start), pump (pumpSet fields), stim (stimulus kind), act
// (a function: relaxant, reversal), cap (caption, the teaching line), ev (a neutral event line shown instead while blinded:
// no drug names or units, so the caption gives neither the answer nor the agent away).
// Loaded after pump.js. Deep link: ?case=<id> (with ?blind=1 for blinded reading; quiz checkpoints live in quiz.js).
// Patterns follow the engine's rules (app.js): surgical stimulus = 100 s; 'alpha' dips the alpha band, 'beta' adds 18-Hz activity
// (García 2021, Hight 2019); remifentanil blunts it; ketamine adds fast activity and can raise BIS without lightening.
// Synthetic teaching cases only: not real patients, doses or timings to copy.
// relaxant: the page's 'on' mode holds a full block through surgery (no facial EMG); reversal returns to 'off'
const relax=()=>setNmb('on'),reverse=()=>setNmb('off');
const CASES={
 tci:{label:'Propofol TCI: induction to emergence',pt:{sex:'M',age:45,height:172,weight:72},model:'eleveld',steps:[
  {at:0,pump:{target:0},cap:'Awake baseline before induction. Note the raw EEG, the DSA and SEF95.',ev:'Awake baseline.'},
  {at:40,pump:{target:4},cap:'Induction: propofol TCI, Eleveld effect-site target 4 µg/ml. The pump runs fast, then the effect site catches up; slow-delta and alpha power build.',ev:'Induction.'},
  {at:110,act:relax,cap:'Relaxant given after loss of consciousness.',ev:'Relaxant given.'},
  {at:360,pump:{target:3.5},cap:'Maintenance at 3.5 µg/ml: the alpha and slow-delta bands are steady, SEF95 is low.',ev:'Maintenance.'},
  {at:600,stim:'alpha',cap:'Skin incision. Watch the alpha band: it weakens while the hypnotic target is unchanged (alpha dropout).',ev:'Skin incision.'},
  {at:650,stim:'beta',cap:'The stimulation continues: faster activity grows and SEF95 rises. Consistent with nociceptive arousal; check the clinical signs too.',ev:'Surgery continues.'},
  {at:700,pump:{target:4,remi:3},cap:'Treated: remifentanil 3 ng/ml and propofol back to 4 µg/ml. The response is blunted and the alpha band returns.',ev:'Treatment given.'},
  {at:960,pump:{target:3.5},cap:'Steady maintenance again.',ev:'Maintenance continues.'},
  {at:1080,pump:{target:0,remi:0},act:reverse,cap:'Emergence: pump stopped, relaxant reversed. The alpha band fades and slows, faster activity returns and SEF95 climbs as the effect site falls.',ev:'Anaesthetic stopped; relaxant reversed.'},
  {at:1800,end:true,cap:'Case complete. Drag the timeline back to compare induction, incision and emergence.',ev:'Case complete.'}]},
 sevo:{label:'Sevoflurane: induction to emergence',pt:{sex:'F',age:45,height:162,weight:60},model:'eleveld',steps:[
  {at:0,pump:{target:0},cap:'Awake baseline before induction.',ev:'Awake baseline.'},
  {at:40,pump:{sevoEt:2.4},cap:'Induction with sevoflurane (end-tidal 2.4%, about 1.4 MAC at 45 years). Alpha and slow-delta power build; sevoflurane also adds theta around 5 Hz.',ev:'Induction.'},
  {at:120,act:relax,cap:'Relaxant given after loss of consciousness.',ev:'Relaxant given.'},
  {at:300,pump:{sevoEt:1.8},cap:'Maintenance at end-tidal 1.8% (about 1 MAC): broad alpha and slow-delta with theta between them.',ev:'Maintenance.'},
  {at:560,stim:'alpha',cap:'Skin incision. The alpha band weakens at an unchanged end-tidal concentration.',ev:'Skin incision.'},
  {at:610,stim:'beta',cap:'Stimulation continues: faster activity grows and SEF95 rises.',ev:'Surgery continues.'},
  {at:660,pump:{sevoEt:2.2,remi:3},cap:'Treated: remifentanil 3 ng/ml and end-tidal sevoflurane up to 2.2%.',ev:'Treatment given.'},
  {at:900,pump:{sevoEt:1.8},cap:'Steady maintenance again.',ev:'Maintenance continues.'},
  {at:1020,pump:{sevoEt:0,remi:0},act:reverse,cap:'Emergence: vaporiser off, relaxant reversed. Theta and alpha fade, faster activity returns and SEF95 climbs.',ev:'Anaesthetic stopped; relaxant reversed.'},
  {at:1800,end:true,cap:'Case complete. Drag the timeline back to compare the phases.',ev:'Case complete.'}]},
 propket:{label:'Propofol + ketamine: a high BIS that is not emergence',pt:{sex:'M',age:50,height:175,weight:80},model:'eleveld',steps:[
  {at:0,pump:{target:0},cap:'Awake baseline before induction.',ev:'Awake baseline.'},
  {at:40,pump:{target:4},cap:'Induction: propofol TCI, effect-site target 4 µg/ml.',ev:'Induction.'},
  {at:110,act:relax,cap:'Relaxant given after loss of consciousness.',ev:'Relaxant given.'},
  {at:360,pump:{target:3.5},cap:'Maintenance at 3.5 µg/ml: alpha and slow-delta bands, BIS in the usual range.',ev:'Maintenance.'},
  {at:480,pump:{ketBolus:0.5,ketInf:0.5},cap:'Ketamine added: 0.5 mg/kg bolus, then 0.5 mg/kg/h (Domino model Ce on the pump). Fast beta-gamma activity appears, alpha weakens, SEF95 and BIS rise, at the same propofol target.',ev:'Analgesic adjunct given.'},
  {at:780,pump:{ketInf:0},cap:'Ketamine infusion stopped: its effect wears off over several minutes and the propofol pattern returns.',ev:'No further adjunct.'},
  {at:1200,pump:{target:0},act:reverse,cap:'Emergence: pump stopped, relaxant reversed.',ev:'Anaesthetic stopped; relaxant reversed.'},
  {at:1800,end:true,cap:'Case complete. Compare the ketamine period with emergence: both raise BIS and SEF95, but the DSA differs.',ev:'Case complete.'}]},
 propdex:{label:'Propofol + dexmedetomidine',pt:{sex:'F',age:60,height:160,weight:65},model:'eleveld',steps:[
  {at:0,pump:{target:0},cap:'Awake baseline before induction.',ev:'Awake baseline.'},
  {at:40,pump:{target:3.5},cap:'Induction: propofol TCI, effect-site target 3.5 µg/ml (an older patient).',ev:'Induction.'},
  {at:110,act:relax,cap:'Relaxant given after loss of consciousness.',ev:'Relaxant given.'},
  {at:360,cap:'Maintenance at 3.5 µg/ml: alpha and slow-delta bands.',ev:'Maintenance.'},
  {at:420,pump:{dexLoad:1,dexInf:0.5},cap:'Dexmedetomidine added: 1 µg/kg over 10 min, then 0.5 µg/kg/h (Hannivoort model Ce on the pump). Its effect builds slowly: more slow activity and spindle-like bursts, a weaker, slower alpha band, faster activity falls.',ev:'Sedative adjunct given.'},
  {at:1080,pump:{target:2.5},cap:'Propofol target lowered to 2.5 µg/ml with the dexmedetomidine running. Assess the whole picture (DSA, raw EEG, suppression, clinical signs), not one number.',ev:'Maintenance adjusted.'},
  {at:1200,pump:{target:0,dexInf:0},act:reverse,cap:'Emergence: both stopped, relaxant reversed. Dexmedetomidine leaves slowly, so slow activity can linger.',ev:'Anaesthetic stopped; relaxant reversed.'},
  {at:1800,end:true,cap:'Case complete. Drag the timeline back to compare propofol alone with propofol and dexmedetomidine.',ev:'Case complete.'}]}
};
// start a case: awake pre-roll so the screens open full, a fresh timeline, the pump set for this patient, then the steps
function startCase(id){const c=CASES[id];if(!c||TL.busy)return false;stopStory();learningFocus=null;
 nmReset();setNmb('off');mods.elderly=mods.emg=mods.diathermy=mods.blink=mods.warmer=false;for(const [k,el] of SMODS)$(el).checked=false;$('mElder').checked=false;
 eng.stT=R.eng.stT=0;pumpStart();PUMP.model=c.model;PUMP.pt=Object.assign({},c.pt);pumpModes();pumpUI();snapAll();
 step(300*FS);stepR(300*FS);simT+=300;ADV.pre=null;ADV.cut=null;ADV.review=null;ADV.win=5;ADV.t0=simT-300;ADV.hc=null;
 TL.snaps=[];TL.events=[];TL.key='';TL.t0=simT;TL.max=simT;tim.sup=tim.low=R.tim.sup=R.tim.low=0;PUMP.hist=[];
 story={t0:simT,i:-1,case:id,steps:c.steps};runStory();tlSnap();tlAfter();setSpeed(5);if(paused)$('pause').click();
 caseSel.value=id;syncDemoControls();caseUrl(id);return true;}
function caseUrl(id){try{const u=new URL(location.href);if(id)u.searchParams.set('case',id);else u.searchParams.delete('case');history.replaceState(null,'',u);}catch(e){}}
// the menu: a strip above the monitor (the workshop banners join it later)
const wsStrip=document.createElement('div');wsStrip.className='ws-strip';wsStrip.id='wsStrip';
wsStrip.innerHTML=`<label class="ws-case"><span>Case</span><select id="caseChoice"><option value="">Choose a workshop case…</option>${Object.entries(CASES).map(([k,c])=>`<option value="${k}">${c.label}</option>`).join('')}</select></label>`;
workspace.querySelector('.monhead').after(wsStrip);
const caseSel=$('caseChoice');
caseSel.addEventListener('change',e=>{if(e.target.value)startCase(e.target.value);else{stopStory();caseUrl(null);}});
// the menu follows the story: blank once the case ends or is stopped
setInterval(()=>{const id=story?.case||'';if(caseSel.value!==id&&document.activeElement!==caseSel)caseSel.value=id;},500);
{const id=new URLSearchParams(location.search).get('case');if(id&&CASES[id])startCase(id);}
