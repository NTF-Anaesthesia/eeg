// The workshop page's generic monitor (workshop/index.html, 25 Nov 2026): one plain dark screen of our own design, no device
// look. DSA 0-30 Hz with the white SEF95 line, the raw EEG at real time (app.js DSIG), an SQI / EMG / SR row and the processed
// EEG index, masked by default with a Reveal key. Unilateral or bilateral: the right side is app.js's second engine (R).
// Loaded last on that page only; reads app.js globals (COLS, R, DSIG, dProduced, LUT, dbToX, NB, FS, simT, masked, MASK, mon).
const WSM={bi:false,ch:null};
const wsMon=$('wsMon');
wsMon.innerHTML=`<div class="wsm-top"><span class="wsm-name">Processed EEG</span>
 <div class="wsm-seg" role="group" aria-label="Channels"><button type="button" data-bi="0" aria-pressed="true">Unilateral</button><button type="button" data-bi="1" aria-pressed="false">Bilateral</button></div>
 <button type="button" class="wsm-reveal" id="wsReveal" aria-pressed="false">Reveal index</button><span class="wsm-clock" id="wsClock">0:00</span></div>
<div class="wsm-body"><div class="wsm-side">
  <div class="wsm-idx"><span class="k">Index</span><b id="wsIdx">--</b><span class="wsm-idx2" id="wsIdxR" hidden><span class="k">L</span> <b id="wsIdxL2">--</b> <span class="k">R</span> <b id="wsIdxR2">--</b></span></div>
  <div class="wsm-row" id="wsRow"></div></div>
 <div class="wsm-graph"><canvas id="wsDsa" aria-label="Density spectral array, 0 to 30 Hz, last 5 minutes, with the SEF95 line"></canvas>
  <canvas id="wsEeg" aria-label="Raw EEG at real time"></canvas></div></div>
<p class="wsm-msg" id="wsMsg" role="status" aria-live="polite"></p>`;
const wsDsaCv=$('wsDsa'),wsEegCv=$('wsEeg');
// one channel's numbers: SQI, EMG, SR, SEF95 (the last fresh value)
const wsLastSef=cols=>{for(let i=cols.length-1;i>=0&&i>cols.length-8;i--)if(cols[i].sef!=null)return cols[i].sef;return null;};
function wsNums(cols){const c=cols[cols.length-1];if(!c)return null;const bl=c.sqi<15,sef=wsLastSef(cols);
 return {idx:bl||c.bis==null?'--':masked()?MASK:String(Math.round(c.bis)),sqi:c.sqi,emg:Math.round(c.emg),sr:bl?'--':String(Math.round(c.bsr)),sef:bl||sef==null?'--':sef.toFixed(1)};}
function wsReadouts(){const L=wsNums(COLS),Rr=WSM.bi?wsNums(R.COLS):null;if(!L)return;
 const t=(id,v)=>{const e=$(id);if(e&&e.textContent!==v)e.textContent=v;};
 t('wsIdx',L.idx);$('wsIdx').classList.toggle('masked',masked());
 $('wsIdxR').hidden=!WSM.bi;if(Rr){t('wsIdxL2',L.idx);t('wsIdxR2',Rr.idx);}
 const cell=(k,a,b,u)=>b==null?`<div><span class="k">${k}</span><b>${a}</b><span class="u">${u}</span></div>`
  :`<div class="two"><span class="k">${k} <small>${u}</small></span><b><i>L</i> ${a}</b><b><i>R</i> ${b}</b></div>`;
 const row=cell('SEF95',L.sef,Rr?.sef,'Hz')+cell('SQI',L.sqi,Rr?.sqi,'%')+cell('EMG',L.emg,Rr?.emg,'dB')+cell('SR',L.sr,Rr?.sr,'%');
 if(WSM.row!==row){WSM.row=row;$('wsRow').innerHTML=row;}
 t('wsClock',clk(simT));
 const c=COLS[COLS.length-1],m=!c?'':c.sqi<15?'Poor signal quality':c.sqi<50?'Low signal quality: check the trace':c.art?'Artefact':'';t('wsMsg',m);}
// canvas sized to its box at device resolution
function wsFit(cv){const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return null;const dpr=Math.min(2,devicePixelRatio||1);
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
 const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return {c,w,h};}
// DSA: one image column per second (COLS), colour = power on the monitor's colour range, the white SEF95 line on top
const wsOff=document.createElement('canvas');wsOff.width=COLMAX;wsOff.height=NB;const wsOffC=wsOff.getContext('2d'),wsImg=wsOffC.createImageData(COLMAX,NB);
function wsDsaPanel(c,cols,g,label){const d=wsImg.data,start=COLMAX-cols.length;
 for(let x=0;x<COLMAX;x++){const col=cols[x-start];for(let y=0;y<NB;y++){const i=(y*COLMAX+x)*4;
  if(!col){d[i]=4;d[i+1]=6;d[i+2]=10;d[i+3]=255;continue;}const q=LUT[(dbToX(col.db[NB-1-y])*255)|0];d[i]=q[0];d[i+1]=q[1];d[i+2]=q[2];d[i+3]=255;}}
 wsOffC.putImageData(wsImg,0,0);c.imageSmoothingEnabled=true;c.drawImage(wsOff,g.x,g.y,g.w,g.h);
 c.strokeStyle='#fff';c.lineWidth=1.6;c.beginPath();let pen=false;
 cols.forEach((q,i)=>{if(q.sef==null){pen=false;return;}const x=g.x+(start+i+.5)/COLMAX*g.w,y=g.y+g.h*(1-Math.min(30,q.sef)/30);pen?c.lineTo(x,y):c.moveTo(x,y);pen=true;});c.stroke();
 c.fillStyle='#8a97ad';c.font='600 11px system-ui,sans-serif';c.textAlign='right';
 for(const f of [0,10,20,30])c.fillText(String(f),g.x-5,Math.min(g.y+g.h,Math.max(g.y+9,g.y+g.h*(1-f/30)+4)));
 if(label){c.textAlign='left';c.fillStyle='rgba(4,6,10,.75)';c.fillRect(g.x+4,g.y+4,18,16);c.fillStyle='#e8eef8';c.fillText(label,g.x+8,g.y+16);}}
function wsDrawDsa(){const f=wsFit(wsDsaCv);if(!f)return;const {c,w,h}=f;c.fillStyle='#04060a';c.fillRect(0,0,w,h);
 const x=30,gw=w-x-8,two=WSM.bi,gap=two?8:0,ph=(h-20-gap)/(two?2:1);
 wsDsaPanel(c,COLS,{x,y:4,w:gw,h:ph},two?'L':'');if(two)wsDsaPanel(c,R.COLS,{x,y:4+ph+gap,w:gw,h:ph},'R');
 c.fillStyle='#8a97ad';c.font='600 11px system-ui,sans-serif';c.textAlign='left';c.fillText('−5 min',x,h-4);c.textAlign='center';c.fillText('DSA · 0–30 Hz · SEF95 white',x+gw/2,h-4);c.textAlign='right';c.fillText('now',x+gw,h-4);
 c.save();c.translate(10,4+(h-20)/2);c.rotate(-Math.PI/2);c.textAlign='center';c.fillText('Hz',0,0);c.restore();}
// raw EEG: a sweep at real time (DSIG, 128 samples/s), 4 s across a phone, 8 s on a wider screen; ±100 µV per trace
function wsDrawEeg(){const f=wsFit(wsEegCv);if(!f)return;const {c,w,h}=f;c.fillStyle='#04060a';c.fillRect(0,0,w,h);
 const secs=w<520?4:8,N=secs*FS,x0=30,gw=w-x0-8,two=WSM.bi,lanes=two?2:1,lh=(h-16)/lanes,pos=dProduced%N,gapN=Math.round(N*0.04);
 c.strokeStyle='#18212f';c.lineWidth=1;for(let k=0;k<=secs;k++){const x=Math.round(x0+gw*k/secs)+.5;c.beginPath();c.moveTo(x,0);c.lineTo(x,h-16);c.stroke();}
 for(let l=0;l<lanes;l++){const sig=l?R.DSIG:DSIG,top=l*lh,mid=top+lh/2,sc=(lh/2)/100,L=sig.length-1;
  c.strokeStyle='#18212f';c.beginPath();c.moveTo(x0,Math.round(mid)+.5);c.lineTo(x0+gw,Math.round(mid)+.5);c.stroke();
  c.save();c.beginPath();c.rect(x0,top,gw,lh);c.clip();c.strokeStyle='#7ee0a1';c.lineWidth=1.3;c.beginPath();let pen=false;
  for(let j=0;j<N;j++){let idx;if(j<pos)idx=L-(pos-1-j);else if(j>=pos+gapN)idx=L-(pos-1-j)-N;else{pen=false;continue;}
   if(idx<0||idx>L){pen=false;continue;}const X=x0+j/N*gw,Y=mid-sig[idx]*sc;pen?c.lineTo(X,Y):c.moveTo(X,Y);pen=true;}
  c.stroke();c.restore();c.fillStyle='#8a97ad';c.font='600 11px system-ui,sans-serif';c.textAlign='left';if(two)c.fillText(l?'R':'L',8,top+14);}
 c.fillStyle='#8a97ad';c.textAlign='left';c.fillText(`EEG · real time · ${secs} s · ±100 µV`,x0,h-3);}
function wsTick(dirty){const id=COLS.length?COLS[COLS.length-1].n:-1;
 if(dirty||WSM.col!==id||WSM.key!==wsKey()){WSM.col=id;WSM.key=wsKey();wsDrawDsa();wsReadouts();}
 wsDrawEeg();}
const wsKey=()=>[WSM.bi,masked(),wsDsaCv.clientWidth,wsDsaCv.clientHeight,mon.dbLo,mon.dbHi].join();
function wsSetBi(on){WSM.bi=!!on;wsMon.dataset.bi=WSM.bi?'1':'0';wsMon.querySelectorAll('.wsm-seg button').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.bi===+WSM.bi)));
 WSM.key=null;try{const u=new URL(location.href);if(WSM.bi)u.searchParams.set('bi','1');else u.searchParams.delete('bi');history.replaceState(null,'',u);}catch(e){}}
wsMon.querySelector('.wsm-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)wsSetBi(b.dataset.bi==='1');});
// Reveal: the index stays masked on this page unless ?blind=0; the key shows it until pressed again
const wsRevealBtn=$('wsReveal');
function wsRevealUI(){const on=blind.on&&blind.reveal;wsRevealBtn.setAttribute('aria-pressed',String(on));wsRevealBtn.textContent=!blind.on?'Mask index':on?'Mask index':'Reveal index';WSM.key=null;}
wsRevealBtn.onclick=()=>{if(!blind.on){setBlind(true);}else setReveal(!blind.reveal);wsRevealUI();};
for(const b of [blindBtn,revealBtn])b.addEventListener('click',wsRevealUI);
if(wsParams.get('blind')!=='0'&&!blind.on)setBlind(true);
wsRevealUI();wsSetBi(wsParams.get('bi')==='1');
// the case caption sits in the control dock here (the main page's notes column is not used)
panel.querySelector('.story').append($('storyCap'));
// the pump is this page's drug source: on from the start (a case sets its own patient)
if(!PUMP.on)pumpStart();
// the case captions and labels say 'index' for the processed EEG number on this page
for(const c of Object.values(CASES)){c.label=c.label.replace(/\bBIS\b/g,'index');for(const s of c.steps)s.cap=s.cap.replace(/\bBIS\b/g,'the index').replace(/^the index/,'The index');}
for(const cps of Object.values(QUIZ))for(const cp of cps)cp.note=cp.note.replace(/\bBIS\b/g,'the index').replace(/^the index/,'The index');
for(const o of caseSel.options){const c=CASES[o.value];if(c)o.textContent=c.label;}
