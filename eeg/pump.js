// Built-in TCI pump (workshop, 25 Nov 2026): a compact propofol target-controlled infusion whose predicted effect-site
// concentration drives the simulator's propofol level live, with add-on ketamine and dexmedetomidine lines (bolus or loading
// dose plus an infusion, each with its own PK model) and optional sevoflurane (end-tidal %) and remifentanil (ng/ml). Loaded after demo.js, before workshop.js; reads and sets app.js globals.
//
// Credit: the PK models, the exact solver and the controller are a JavaScript port of the TCI emulator in
// NTF-Anaesthesia/anantf-site, apps/tci/src/engine (models.ts, patient.ts, solver.ts, tci.ts), by the same
// authors; constants unchanged. Not bit-for-bit: only the parts the simulator needs (arterial Eleveld, opioid on).
// Sources, as listed in that repo's apps/tci/docs/REFERENCES.md:
//  - Eleveld DJ et al., Br J Anaesth 2018 (propofol PK-PD; arterial set, opioid covariate) and Al-Sallami 2015 (fat-free mass)
//  - Schnider TW et al., Anesthesiology 1998 and 1999 (PK and ke0 0.456/min) with James 1976 lean body mass
//  - Marsh B et al., Br J Anaesth 1991 (weight-scaled), ke0 0.26/min
//  - Shafer SL, Gregg KM, J Pharmacokinet Biopharm 1992 (effect-site targeting: rate so the predicted peak Ce equals the target)
// Sevoflurane MAC by age: Nickalls RWD, Mapleson WW, Br J Anaesth 2003 (MAC40 1.8%, falling 6% a decade).
// Teaching tool only: not for clinical dosing.
//
// How it meets the engine: each step the pump's predicted propofol Ce becomes the propofol level in the drug mix
// (app.js mixTarget, µg/ml) and is written straight into both engines' effect site, so the PK-PD model's own ke0
// replaces the engine's generic lag for propofol. Ketamine and dexmedetomidine Ce go the same way after a mapping onto the
// engine's relative 0-1 scales (KDX_SCALE below). Sevoflurane and remifentanil are set as mix targets and follow the engine's
// effect-site lag and drug rules (including the remifentanil blunting of a surgical stimulus).
//
// Add-on lines (25 Nov 2026, a workshop colleague's request): manual bolus / loading dose and infusion, not TCI.
//  - Ketamine (racemic): Domino EF et al., Clin Pharmacol Ther 1984;36:645-53, 3-compartment parameters as used for ketamine
//    TCI (Absalom AR et al., Br J Anaesth 2007;98:615-23): V1 0.063 L/kg, k10 0.4381, k12 0.5921, k13 0.590, k21 0.247,
//    k31 0.0146 /min. Domino has no ke0; 0.5 /min (t1/2 ke0 about 1.4 min, a quick onset as seen clinically) is our assumption.
//  - Dexmedetomidine: Hannivoort LN et al., Anesthesiology 2015;123:357-67, weight-scaled: V1 1.78, V2 30.3, V3 52.0 L x (W/70);
//    CL 0.686 x (W/70)^0.75, Q2 2.98 x (V2/30.3)^0.75, Q3 0.602 x (V3/52)^0.75 L/min. ke0 0.12 /min (t1/2 ke0 about 6 min,
//    the slow onset of dex sedation) is our assumption.
//  - Bolus over 30 s; dex loading dose over 10 min. Engine level = min(1, Ce / 2): 1.0 at 2 µg/ml ketamine or 2 ng/ml dex.
//    A teaching approximation (NOTES.md), not a concentration-effect model.

// ----- patient and PK models (patient.ts, models.ts) -----
const tciBmi=p=>p.weight/(p.height/100)**2;
const tciLbm=p=>{const r=p.weight/p.height;return p.sex==='M'?1.1*p.weight-128*r*r:1.07*p.weight-148*r*r;}; // James 1976
const tciFfm=p=>{const b=tciBmi(p);return p.sex==='M'?(0.88+0.12/(1+(p.age/13.4)**-12.7))*(9270*p.weight/(6680+216*b)) // Al-Sallami 2015
 :(1.11-0.11/(1+(p.age/7.1)**-1.1))*(9270*p.weight/(8780+244*b));};
const TCI_REF={sex:'M',age:35,height:170,weight:70};
const ELEV={t1:6.28,t2:25.5,t3:273,t4:1.79,t5:1.75,t6:1.11,t8:42.3,t9:9.06,t10:-0.0156,t11:-0.00286,t12:33.6,t13:-0.0138,t14:68.3,t15:2.10,t16:1.30,ke0:0.146};
function tciEleveld(p,opioid){const T=ELEV,R=TCI_REF,w=p.weight,sig=(x,e,l)=>x**l/(x**l+e**l);
 const pma=p.age*52+40,pmaR=R.age*52+40,fAge=x=>Math.exp(x*(p.age-R.age)),fOp=x=>opioid?Math.exp(x*p.age):1;
 const fC=x=>sig(x,T.t12,1),fClM=x=>sig(x,T.t8,T.t9),fQ3=x=>sig(x,T.t14,1);
 const v1=T.t1*fC(w)/fC(R.weight),v2=T.t2*w/R.weight*fAge(T.t10),v3=T.t3*tciFfm(p)/tciFfm(R)*fOp(T.t13);
 const cl1=(p.sex==='M'?T.t4:T.t15)*(w/R.weight)**0.75*(fClM(pma)/fClM(pmaR))*fOp(T.t11);
 const cl2=T.t5*(v2/T.t2)**0.75*(1+T.t16*(1-fQ3(pma))),cl3=T.t6*(v3/T.t3)**0.75*fQ3(pma)/fQ3(pmaR);
 return {v1,v2,v3,cl1,cl2,cl3,ke0:T.ke0*(w/70)**-0.25};}
function tciSchnider(p){const lbm=tciLbm(p);
 return {v1:4.27,v2:18.9-0.391*(p.age-53),v3:238,cl1:1.89+0.0456*(p.weight-77)-0.0681*(lbm-59)+0.0264*(p.height-177),cl2:1.29-0.024*(p.age-53),cl3:0.836,ke0:0.456};}
function tciMarsh(p){const v1=0.228*p.weight;return {v1,v2:v1*0.112/0.055,v3:v1*0.0419/0.0033,cl1:0.119*v1,cl2:0.112*v1,cl3:0.0419*v1,ke0:0.26};}
const TCI_MODELS={eleveld:['Eleveld',p=>tciEleveld(p,true)],schnider:['Schnider',tciSchnider],marsh:['Marsh',tciMarsh]};

// ----- exact 3-compartment + effect-site solver (solver.ts): modes, exact step for a constant rate (mg/min, min) -----
function tciModes(pk){const k10=pk.cl1/pk.v1,k12=pk.cl2/pk.v1,k13=pk.cl3/pk.v1,k21=pk.cl2/pk.v2,k31=pk.cl3/pk.v3;
 const a2=k10+k12+k13+k21+k31,a1=k10*k31+k21*k31+k21*k13+k10*k21+k31*k12,a0=k10*k21*k31;
 const p=a1-a2*a2/3,q=-2*a2**3/27+a2*a1/3-a0,r=Math.sqrt(-(p*p*p)/27),phi=Math.acos(Math.max(-1,Math.min(1,-q/(2*r))))/3,m=2*Math.cbrt(r);
 const L=[0,1,2].map(k=>m*Math.cos(phi+2*Math.PI*k/3)+a2/3).sort((x,y)=>y-x);
 let ke0=pk.ke0;for(const l of L)if(Math.abs(ke0-l)<1e-9*Math.max(1,l))ke0*=1+1e-7;
 const cp=[],ce=[];
 for(let i=0;i<3;i++){const li=L[i];let den=1;for(let j=0;j<3;j++)if(j!==i)den*=L[j]-li;const a=(k21-li)*(k31-li)/den;cp.push(a/pk.v1);ce.push(a/pk.v1*ke0/(ke0-li));}
 ce.push(-(ce[0]+ce[1]+ce[2]));cp.push(0);return {lam:[L[0],L[1],L[2],ke0],cp,ce};}
const tciStep=(m,s,u,dt)=>s.map((x,i)=>{const e=Math.exp(-m.lam[i]*dt);return x*e+u*(1-e)/m.lam[i];});
const tciDot=(c,s)=>c[0]*s[0]+c[1]*s[1]+c[2]*s[2]+c[3]*s[3];
const tciCp=(m,s)=>tciDot(m.cp,s),tciCe=(m,s)=>tciDot(m.ce,s);
function tciMax(f,a,b,n){const g=(Math.sqrt(5)-1)/2;let c=b-g*(b-a),d=a+g*(b-a),fc=f(c),fd=f(d);
 for(let k=0;k<n;k++){if(fc>fd){b=d;d=c;fd=fc;c=b-g*(b-a);fc=f(c);}else{a=c;c=d;fc=fd;d=a+g*(b-a);fd=f(d);}}return (a+b)/2;}

// ----- controller (tci.ts): Shafer-Gregg peak-Ce targeting, Cp hold in maintenance, optional plasma overshoot cap -----
const TCI_HORIZON=12; // min, look-ahead for the Ce peak
function tciPeak(m,s,r,dt){const sA=tciStep(m,s,r,dt),f=t=>t<=dt?tciCe(m,tciStep(m,s,r,t)):tciCe(m,tciStep(m,sA,0,t-dt));
 const n=96,at=i=>dt+TCI_HORIZON*i/n;let best=0,bv=-Infinity;for(let i=0;i<=n;i++){const v=f(at(i));if(v>bv){bv=v;best=i;}}
 if(best===0)return bv;return Math.max(bv,f(tciMax(f,at(best-1),at(Math.min(best+1,n)),40)));}
function tciRate(mode,m,s,target,dt,rMax,cpMax){
 if(target<=0)return {r:0,kind:'off'};
 const ce=tciCe(m,s),ceFalling=tciCe(m,tciStep(m,s,0,dt))<=ce,holdCp=mode==='Ce'&&ceFalling&&Math.abs(ce-target)<=0.01*target;
 const cpFree=tciCp(m,tciStep(m,s,0,dt)),cpUnit=tciCp(m,tciStep(m,[0,0,0,0],1,dt)),toCp=c=>Math.min(rMax,Math.max(0,(c-cpFree)/cpUnit));
 if(mode==='Cp'||holdCp){const r=toCp(target);return {r,kind:r>0||cpFree<=target?'maintenance':'wait'};}
 if(tciPeak(m,s,0,dt)>=target)return {r:0,kind:'wait'};
 const rCap=cpMax!==undefined?toCp(cpMax):rMax;
 if(tciPeak(m,s,rCap,dt)<=target)return {r:rCap,kind:'induction'};
 let lo=0,hi=rCap;for(let k=0;k<40;k++){const mid=(lo+hi)/2;if(tciPeak(m,s,mid,dt)<target)lo=mid;else hi=mid;}
 return {r:(lo+hi)/2,kind:'induction'};}

// ----- the pump -----
// Settings as in the emulator's defaults: 10 mg/ml, 800 ml/h maximum, a new rate every 10 s, plasma overshoot cap 4 x target.
const TCI_SET={conc:10,maxMlH:800,updateSec:10,cpMaxRatio:4};
const SEVO_MAC40=1.8,sevoMacAge=age=>SEVO_MAC40*10**(-0.00269*(age-40)); // Nickalls & Mapleson 2003
// an add-on line: modal state s, infusion inf (per kg per hour), a bolus or loading dose still running (left, at rate per min),
// n doses given, total given
const kdxLine=()=>({s:[0,0,0,0],inf:0,left:0,rate:0,n:0,tot:0,m:null});
const PUMP={on:false,model:'eleveld',mode:'Ce',pt:{sex:'M',age:40,height:170,weight:70},target:0,sevoEt:0,remi:0,
 s:[0,0,0,0],r:0,kind:'off',acc:0,mg:0,hist:[],m:null,k:kdxLine(),x:kdxLine()};
const KET_D={v1:0.063,k10:0.4381,k12:0.5921,k13:0.590,k21:0.247,k31:0.0146,ke0:0.5}; // Domino 1984 (per kg), ke0 assumed
function ketDomino(p){const D=KET_D,v1=D.v1*p.weight,cl2=D.k12*v1,cl3=D.k13*v1;return {v1,v2:cl2/D.k21,v3:cl3/D.k31,cl1:D.k10*v1,cl2,cl3,ke0:D.ke0};}
function dexHannivoort(p){const f=p.weight/70,v2=30.3*f,v3=52.0*f; // Hannivoort 2015, ke0 assumed
 return {v1:1.78*f,v2,v3,cl1:0.686*f**0.75,cl2:2.98*(v2/30.3)**0.75,cl3:0.602*(v3/52)**0.75,ke0:0.12};}
const KDX_SCALE=2; // engine level 1.0 at Ce 2 (µg/ml ketamine, ng/ml dex)
function pumpModes(){PUMP.m=tciModes(TCI_MODELS[PUMP.model][1](PUMP.pt));PUMP.k.m=tciModes(ketDomino(PUMP.pt));PUMP.x.m=tciModes(dexHannivoort(PUMP.pt));}
// advance an add-on line by h sim seconds: infusion plus whatever is left of a bolus (split where the bolus ends)
function kdxStep(L,h){while(h>1e-9){const b=L.left>1e-12?Math.min(h,L.left/L.rate*60):h,r=L.inf*PUMP.pt.weight/60+(L.left>1e-12?L.rate:0);
  L.s=tciStep(L.m,L.s,r,b/60);L.tot+=r*b/60;if(L.left>1e-12)L.left=Math.max(0,L.left-L.rate*b/60);h-=b;}}
const kdxCe=L=>Math.max(0,tciCe(L.m,L.s)),kdxCp=L=>Math.max(0,tciCp(L.m,L.s));
// give a dose (mg or µg per kg) over min minutes
function kdxGive(L,perKg,min){const d=perKg*PUMP.pt.weight;if(!(d>0))return;L.left+=d;L.rate=L.left/min;L.n++;}
pumpModes();
const pumpCe=()=>Math.max(0,tciCe(PUMP.m,PUMP.s)),pumpCp=()=>Math.max(0,tciCp(PUMP.m,PUMP.s));
const pumpSevoMac=()=>PUMP.sevoEt/sevoMacAge(PUMP.pt.age);
// put the pump's levels into the drug mix; propofol Ce also straight into both effect sites (the model's ke0 is the lag)
function pumpApply(){if(!PUMP.on)return;const ce=pumpCe();
 mix.propofol=Math.min(MIXMAX.propofol,ce);mix.sevo=Math.min(MIXMAX.sevo,pumpSevoMac());mix.remi=PUMP.remi;
 mix.ketamine=Math.min(1,kdxCe(PUMP.k)/KDX_SCALE);mix.dex=Math.min(1,kdxCe(PUMP.x)/KDX_SCALE);
 for(const e of [eng,R.eng])if(e.de&&typeof e.de==='object'){e.de.propofol=mix.propofol;e.de.ketamine=mix.ketamine;e.de.dex=mix.dex;}}
// advance the pump by dt sim seconds: a new rate every update interval, exact PK in between
function pumpStep(dt){if(!PUMP.on)return;let left=dt;
 while(left>1e-9){if(PUMP.acc<=1e-9){const tg=PUMP.target,rMax=TCI_SET.maxMlH*TCI_SET.conc/60;
   const d=tciRate(PUMP.mode,PUMP.m,PUMP.s,tg,TCI_SET.updateSec/60,rMax,PUMP.mode==='Ce'?TCI_SET.cpMaxRatio*tg:undefined);PUMP.r=d.r;PUMP.kind=d.kind;PUMP.acc=TCI_SET.updateSec;}
  const h=Math.min(left,PUMP.acc);PUMP.s=tciStep(PUMP.m,PUMP.s,PUMP.r,h/60);PUMP.mg+=PUMP.r*h/60;PUMP.acc-=h;left-=h;}
 kdxStep(PUMP.k,dt);kdxStep(PUMP.x,dt);
 const H=PUMP.hist,last=H[H.length-1];if(!last||simT-last.t>=5){H.push({t:simT,cp:pumpCp(),ce:pumpCe(),tg:PUMP.target,ke:kdxCe(PUMP.k),xe:kdxCe(PUMP.x)});if(H.length>2000)H.splice(0,H.length-2000);}
 pumpApply();}
// timeline save points (timeline.js): the whole pump, so going back restores the infusion too
const kdxSave=L=>Object.assign({},L,{s:L.s.slice(),m:null});
function pumpSave(){return {on:PUMP.on,model:PUMP.model,mode:PUMP.mode,pt:Object.assign({},PUMP.pt),target:PUMP.target,sevoEt:PUMP.sevoEt,remi:PUMP.remi,s:PUMP.s.slice(),r:PUMP.r,kind:PUMP.kind,acc:PUMP.acc,mg:PUMP.mg,k:kdxSave(PUMP.k),x:kdxSave(PUMP.x)};}
function pumpLoad(x){if(!x)return;Object.assign(PUMP,x,{pt:Object.assign({},x.pt),s:x.s.slice(),k:kdxSave(x.k||kdxLine()),x:kdxSave(x.x||kdxLine())});PUMP.hist=PUMP.hist.filter(h=>h.t<=simT);pumpModes();pumpApply();pumpUI();}
const pumpKey=()=>[PUMP.model,PUMP.mode,PUMP.target,PUMP.sevoEt,PUMP.remi,PUMP.k.inf,PUMP.k.n,PUMP.x.inf,PUMP.x.n].join('|');

// ----- panel -----
const pumpBox=document.createElement('div');pumpBox.className='ctl pump';pumpBox.id='pumpCtl';pumpBox.hidden=true;
pumpBox.setAttribute('role','group');pumpBox.setAttribute('aria-label','TCI pump');
pumpBox.innerHTML=`<div class="pump-row pump-head"><b>TCI propofol</b>
 <select id="pModel" aria-label="PK model">${Object.entries(TCI_MODELS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('')}</select>
 <div class="seg pump-mode" id="pModeSeg" role="group" aria-label="Target"><button type="button" data-m="Ce" aria-pressed="true">Ce</button><button type="button" data-m="Cp" aria-pressed="false">Cp</button></div>
 <button type="button" id="pReset" class="pump-reset">Reset</button></div>
<div class="pump-row pump-pt" id="pPt"><select id="pSex" aria-label="Sex"><option value="M">Male</option><option value="F">Female</option></select>
 <label>Age <input id="pAge" type="number" min="18" max="90" step="1" value="40"></label>
 <label>cm <input id="pHt" type="number" min="140" max="210" step="1" value="170"></label>
 <label>kg <input id="pWt" type="number" min="40" max="160" step="1" value="70"></label></div>
<label class="pump-row pump-slider"><span>Target <output id="pTgtV">0.0</output> µg/ml</span><input id="pTgt" type="range" min="0" max="8" step="0.1" value="0"></label>
<p class="pump-read" id="pRead" aria-live="off"></p>
<canvas id="pChart" class="pump-chart" aria-label="Plasma and effect-site concentration over the last 15 minutes" role="img"></canvas>
<div class="pump-line" id="pKetLine" role="group" aria-label="Ketamine"><div class="pump-row pump-head"><b>Ketamine</b><span class="pump-ce" id="pKetCe">Ce 0.00 µg/ml</span></div>
 <div class="pump-row"><label>Bolus <input id="pKetBol" type="number" min="0.05" max="2" step="0.05" value="0.5"> mg/kg</label><button type="button" class="pump-give" id="pKetGive">Give</button></div>
 <label class="pump-row pump-slider"><span>Infusion <output id="pKetInfV">0.00</output> mg/kg/h</span><input id="pKetInf" type="range" min="0" max="3" step="0.05" value="0"></label>
 <canvas id="pKetChart" class="pump-chart small" aria-label="Ketamine effect-site concentration over the last 15 minutes" role="img"></canvas></div>
<div class="pump-line" id="pDexLine" role="group" aria-label="Dexmedetomidine"><div class="pump-row pump-head"><b>Dexmedetomidine</b><span class="pump-ce" id="pDexCe">Ce 0.00 ng/ml</span></div>
 <div class="pump-row"><label>Load <input id="pDexLoad" type="number" min="0.1" max="2" step="0.1" value="1"> µg/kg</label><button type="button" class="pump-give" id="pDexGive">Load over 10 min</button></div>
 <label class="pump-row pump-slider"><span>Infusion <output id="pDexInfV">0.0</output> µg/kg/h</span><input id="pDexInf" type="range" min="0" max="1.5" step="0.1" value="0"></label>
 <canvas id="pDexChart" class="pump-chart small" aria-label="Dexmedetomidine effect-site concentration over the last 15 minutes" role="img"></canvas></div>
<details class="pump-more" id="pMore"><summary>Sevoflurane, remifentanil</summary>
 <label class="pump-row pump-slider"><span>Sevoflurane Et <output id="pSevoV">0.0</output> % <small id="pMac"></small></span><input id="pSevo" type="range" min="0" max="4" step="0.1" value="0"></label>
 <label class="pump-row pump-slider"><span>Remifentanil Ce <output id="pRemiV">0</output> ng/ml</span><input id="pRemi" type="range" min="0" max="8" step="0.5" value="0"></label></details>
<p class="pump-note">Predicted concentrations from population models (ketamine: Domino; dexmedetomidine: Hannivoort), for teaching only, not for dosing. How strongly each Ce shows on the EEG is a teaching approximation. Sevoflurane MAC is age-adjusted; the brain follows the end-tidal value with a lag.</p>`;
$('mixCtl').after(pumpBox);
const agentSel=$('agentChoice');{const o=document.createElement('option');o.value='tci';o.textContent='TCI pump';agentSel.append(o);}
const pf=n=>(Math.round(n*10)/10).toFixed(1);
function pumpUI(){pumpBox.hidden=!PUMP.on;workspace.dataset.pump=PUMP.on?'on':'off';if(!PUMP.on)return;
 $('pModel').value=PUMP.model;pumpBox.querySelectorAll('#pModeSeg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===PUMP.mode)));
 $('pSex').value=PUMP.pt.sex;$('pAge').value=PUMP.pt.age;$('pHt').value=PUMP.pt.height;$('pWt').value=PUMP.pt.weight;
 const started=PUMP.mg>0;for(const id of ['pModel','pSex','pAge','pHt','pWt'])$(id).disabled=started;
 $('pPt').title=started?'Reset the pump to change the patient or model':'';
 $('pTgt').value=PUMP.target;$('pTgtV').textContent=pf(PUMP.target);
 $('pSevo').value=PUMP.sevoEt;$('pSevoV').textContent=pf(PUMP.sevoEt);$('pMac').textContent=PUMP.sevoEt?`≈ ${(pumpSevoMac()).toFixed(2)} MAC`:'';
 if(PUMP.sevoEt||PUMP.remi)$('pMore').open=true; // a case or the timeline set them: show them
 $('pRemi').value=PUMP.remi;$('pRemiV').textContent=pf(PUMP.remi);
 $('pKetInf').value=PUMP.k.inf;$('pKetInfV').textContent=PUMP.k.inf.toFixed(2);$('pDexInf').value=PUMP.x.inf;$('pDexInfV').textContent=pf(PUMP.x.inf);
 pumpRead();}
function pumpRead(){if(!PUMP.on)return;const mlh=PUMP.r*60/TCI_SET.conc;
 $('pRead').textContent=`Cp ${pf(pumpCp())} · Ce ${pf(pumpCe())} µg/ml · ${Math.round(mlh)} ml/h · ${Math.round(PUMP.mg)} mg`;pumpChart();
 const kl=PUMP.k,xl=PUMP.x,run=L=>L.left>1e-9?` · ${L===kl?'bolus':'loading'} running`:'';
 $('pKetCe').textContent=`Ce ${kdxCe(kl).toFixed(2)} µg/ml · ${Math.round(kl.tot)} mg${run(kl)}`;
 $('pDexCe').textContent=`Ce ${kdxCe(xl).toFixed(2)} ng/ml · ${Math.round(xl.tot)} µg${run(xl)}`;
 kdxChart('pKetChart','ke','#e07ad0','µg/ml');kdxChart('pDexChart','xe','#7ad0a0','ng/ml');}
// one add-on drug's predicted Ce over the last 15 minutes
function kdxChart(id,k,col,u){const cv=$(id),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const dpr=Math.min(2,devicePixelRatio||1);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const span=900,t0=simT-span,H=PUMP.hist.filter(p=>p.t>=t0&&p[k]!=null),top=Math.max(1,...H.map(p=>p[k]))*1.15;
 const X=t=>2+(t-t0)/span*(w-4),Y=v=>h-3-v/top*(h-14);
 c.font='10px system-ui,sans-serif';c.fillStyle='rgba(120,140,170,.9)';c.fillText(`${top<2?top.toFixed(1):Math.round(top)} ${u} · 15 min`,4,10);
 if(H.length<2)return;c.beginPath();H.forEach((p,i)=>{const y=Y(p[k]);i?c.lineTo(X(p.t),y):c.moveTo(X(p.t),y);});c.strokeStyle=col;c.lineWidth=2;c.stroke();
 c.fillStyle=col;c.fillText('Ce',w-22,10);}
function pumpChart(){const cv=$('pChart'),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const dpr=Math.min(2,devicePixelRatio||1);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const span=900,t1=simT,t0=t1-span,H=PUMP.hist.filter(p=>p.t>=t0),top=Math.max(4,...H.map(p=>Math.max(p.ce,p.cp,p.tg)))*1.1;
 const X=t=>2+(t-t0)/span*(w-4),Y=v=>h-3-v/top*(h-14);
 c.font='10px system-ui,sans-serif';c.fillStyle='rgba(120,140,170,.9)';c.fillText(`${Math.round(top)} µg/ml · 15 min`,4,10);
 const line=(k,col,wd,dash)=>{if(H.length<2)return;c.beginPath();H.forEach((p,i)=>{const y=Y(p[k]);i?c.lineTo(X(p.t),y):c.moveTo(X(p.t),y);});c.strokeStyle=col;c.lineWidth=wd;c.setLineDash(dash||[]);c.stroke();c.setLineDash([]);};
 line('tg','rgba(140,150,170,.9)',1,[4,3]);line('cp','#e0a040',1.2);line('ce','#3da5ff',2.2);
 c.fillStyle='#e0a040';c.fillText('Cp',w-44,10);c.fillStyle='#3da5ff';c.fillText('Ce',w-22,10);}
// start: the drug-mix mode with every level at zero, the pump in charge of the mix
function pumpStart(){stopStory();Object.assign(PUMP,{on:true,target:0,sevoEt:0,remi:0,s:[0,0,0,0],r:0,kind:'off',acc:0,mg:0,hist:[],k:kdxLine(),x:kdxLine()});pumpModes();
 showMode('mix');drug='mix';Object.assign(mix,MIX0);depth=mix;applyTarget();pumpApply();pumpUI();if(paused)$('pause').click();}
function pumpOff(){if(!PUMP.on)return;PUMP.on=false;pumpUI();}
// fields: target, sevoEt, remi, mode, model; ketInf (mg/kg/h), ketBolus (mg/kg over 30 s), dexInf (µg/kg/h), dexLoad (µg/kg over 10 min)
function pumpSet(o){if(!PUMP.on)pumpStart();for(const k of ['target','sevoEt','remi','mode','model'])if(o[k]!=null)PUMP[k]=o[k];
 if(o.model)pumpModes();if(o.target!=null)PUMP.acc=0; // a new target takes effect at once, as on a pump
 if(o.ketInf!=null)PUMP.k.inf=o.ketInf;if(o.dexInf!=null)PUMP.x.inf=o.dexInf;
 if(o.ketBolus)kdxGive(PUMP.k,o.ketBolus,0.5);if(o.dexLoad)kdxGive(PUMP.x,o.dexLoad,10);
 pumpApply();pumpUI();}
pumpBox.querySelector('#pModeSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b){PUMP.mode=b.dataset.m;PUMP.acc=0;pumpUI();}});
$('pModel').onchange=e=>{PUMP.model=e.target.value;pumpModes();pumpUI();};
const ptIn=()=>{const n=(id,lo,hi,d)=>{const v=+$(id).value;return v>=lo&&v<=hi?v:d;};
 PUMP.pt={sex:$('pSex').value,age:n('pAge',18,90,PUMP.pt.age),height:n('pHt',140,210,PUMP.pt.height),weight:n('pWt',40,160,PUMP.pt.weight)};pumpModes();};
for(const id of ['pSex','pAge','pHt','pWt'])$(id).addEventListener('change',()=>{ptIn();pumpUI();});
$('pReset').onclick=()=>pumpStart();
// a manual change ends any case or demo and clears its caption, so an old Induce or Emerge caption never sits beside a new
// target (owner, 25 Nov 2026: "Emergence: drug targets are zero" stayed up at a 6.3 µg/ml target)
const pumpManual=()=>{stopStory();$('storyCap').textContent='';},pumpAddOn=()=>{if(!story)$('storyCap').textContent='';};
$('pTgt').addEventListener('input',e=>{pumpManual();pumpSet({target:+e.target.value});});
$('pSevo').addEventListener('input',e=>{pumpManual();pumpSet({sevoEt:+e.target.value});});
// the add-on lines can be used during a case without stopping it (giving ketamine or dex on top of the case's propofol)
$('pKetInf').addEventListener('input',e=>{pumpAddOn();pumpSet({ketInf:+e.target.value});});
$('pDexInf').addEventListener('input',e=>{pumpAddOn();pumpSet({dexInf:+e.target.value});});
$('pKetGive').onclick=()=>{pumpAddOn();const v=+$('pKetBol').value;if(v>0&&v<=2)pumpSet({ketBolus:v});pumpRead();};
$('pDexGive').onclick=()=>{pumpAddOn();const v=+$('pDexLoad').value;if(v>0&&v<=2)pumpSet({dexLoad:v});pumpRead();};
$('pRemi').addEventListener('input',e=>{pumpManual();pumpSet({remi:+e.target.value});});
// Emerge: every pump target to zero; the predicted levels then fall by the model (propofol) and the engine's lag (the rest)
$('wakeBtn').addEventListener('click',()=>{if(PUMP.on){PUMP.k.left=PUMP.x.left=0;pumpSet({target:0,sevoEt:0,remi:0,ketInf:0,dexInf:0});}});
// any other agent, a preset combination or a lesson turns the pump off
for(const name of ['setDrug','selectMix']){const f=window[name];window[name]=function(...a){pumpOff();return f.apply(this,a);};}
setInterval(pumpRead,500);
