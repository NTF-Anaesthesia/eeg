// The workshop page (workshop/index.html, 25 Nov 2026): the main page's BIS Advance screen, fixed (no skin picker), BIS masked
// by default with Reveal, the case picker, quiz and TCI pump always on, a large NTFGH / NUHS header in the NUHS page style
// (ws-page.css). Loaded last on that page only; uses app.js, demo.js, pump.js, cases.js and quiz.js globals.
// BIS masked unless ?blind=0; the Advance's own Unilateral / Bilateral sensor choice (2 or 4 channels) stays, ?bi=1 opens bilateral
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
