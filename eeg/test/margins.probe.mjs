// Margin probe (25 Nov 2026; not a CI check): repeats every noisy check of the workshop suites N times in one page and prints
// each quantity's mean, sd, range and its distance from the suite's threshold in sd. The EEG is random, so a check passes every
// run only if its threshold sits well away from the mean; keep every margin at about 4 sd or more (a 3 sd margin fails about 1
// run in 700 on its own, and a suite has a dozen such checks). Run after any engine or case change, then move a window or a
// threshold, not the engine, unless the margin shows a real change.
// Run with a static server in the repo root: PORT=8080 N=40 node eeg/test/margins.probe.mjs
const {chromium}=await import(process.env.PLAYWRIGHT_PATH||'/opt/node22/lib/node_modules/playwright/index.mjs');
const N=+(process.env.N||30);
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage({viewport:{width:1280,height:860}});
await page.goto(`http://localhost:${process.env.PORT||8080}/eeg/workshop/`);
await page.waitForFunction(()=>typeof TL!=='undefined'&&TL.t0!==null&&COLS.length>10&&typeof startCase==='function');
// [name, low bar, high bar] (null: none); the values come from the same windows the suites use
const CHECKS=[['cases tci maintenance BIS',32,60],['cases tci incision alpha dip dB',0.3,null],['cases tci arousal SEF95 rise',3,null],
 ['cases tci arousal BIS rise',9,null],['cases tci treated BIS minus before',null,8],['cases tci emergence BIS',75,null],['cases sevo maintenance BIS',32,60],
 ['cases sevo arousal SEF95 rise',2,null],['cases sevo emergence BIS',80,null],['cases ketamine BIS rise',10,null],['cases ketamine SEF95 rise',6,null],
 ['cases ketamine alpha fall dB',0.5,null],['cases dex alpha fall dB',0,null],['quiz 345 s single BIS',30,60],['flow Induce lowest BIS',10,30],['flow Ce 3.5 BIS (20 s)',32,56]];
const res=await page.evaluate(N=>{
 const R={},add=(k,v)=>(R[k]=R[k]||[]).push(v),run=t=>tlRun(Math.max(0,story.t0+t-simT)),go=id=>{startCase(id);paused=true;};
 const at=(t,n=10)=>{run(t);const c=HIST.slice(-n),m=k=>c.reduce((a,x)=>a+x[k],0)/c.length;
  return {bis:m('bis'),sef:m('sef'),alpha:c.reduce((a,x)=>{let s=0;for(let k=16;k<26;k++)s+=x.db[k];return a+s/10;},0)/c.length};};
 for(let r=0;r<N;r++){
  go('tci');add('cases tci maintenance BIS',at(340,20).bis);
  const pre=at(598,40),dip=at(648,35),ar=at(695);add('cases tci incision alpha dip dB',pre.alpha-dip.alpha);
  add('cases tci arousal SEF95 rise',ar.sef-pre.sef);add('cases tci arousal BIS rise',ar.bis-pre.bis);add('cases tci treated BIS minus before',at(900).bis-pre.bis);
  add('cases tci emergence BIS',at(1790).bis);
  go('sevo');add('cases sevo maintenance BIS',at(420,20).bis);const sp=at(595,20),sa=at(645,20);add('cases sevo arousal SEF95 rise',sa.sef-sp.sef);add('cases sevo emergence BIS',at(1790).bis);
  go('propket');const k0=at(470,40),k1=at(700,40);add('cases ketamine BIS rise',k1.bis-k0.bis);add('cases ketamine SEF95 rise',k1.sef-k0.sef);add('cases ketamine alpha fall dB',k0.alpha-k1.alpha);
  go('propdex');const x0=at(410,60),x1=at(1000,60);add('cases dex alpha fall dB',x0.alpha-x1.alpha);
  go('tci');run(345);add('quiz 345 s single BIS',bisS);
  // Induce on the free pump (workshop-flow): lowest BIS from 61 to 220 s, then the 20-s mean at 300-320 s
  stopStory();pumpStart();paused=true;$('induceBtn').click();paused=true;let lo=99;for(let i=0;i<220;i++){tlRun(1);if(i>60)lo=Math.min(lo,bisS);}add('flow Induce lowest BIS',lo);
  let m=0;for(let i=0;i<100;i++){tlRun(1);if(i>=80)m+=bisS/20;}add('flow Ce 3.5 BIS (20 s)',m);
 }
 stopStory();return R;},N);
let worst=1e9;
for(const [k,lo,hi] of CHECKS){const v=res[k],n=v.length,mu=v.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/(n-1))||1e-9;
 const z=Math.min(lo==null?1e9:(mu-lo)/sd,hi==null?1e9:(hi-mu)/sd);worst=Math.min(worst,z);
 console.log(`${k.padEnd(38)} mean ${mu.toFixed(2).padStart(7)}  sd ${sd.toFixed(2).padStart(5)}  range ${Math.min(...v).toFixed(1)}..${Math.max(...v).toFixed(1)}  bar ${lo??''}${hi!=null?'..'+hi:''}  margin ${z>99?'>99':z.toFixed(1)} sd${z<4?'  <- under 4 sd':''}`);}
console.log(`N=${N}; smallest margin ${worst.toFixed(1)} sd`);
await browser.close();
