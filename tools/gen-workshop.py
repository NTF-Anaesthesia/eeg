# Builds eeg/workshop/index.html from the main page's monitor section (eeg/index.html), so the shared scripts find their
# elements. Run from the repo root after changing the main page's monitor markup: python3 tools/gen-workshop.py
import re, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'eeg'))
L=open('index.html').read().split('\n')
S=next(i for i,l in enumerate(L) if '<section id="monitor"' in l); E=next(i for i,l in enumerate(L) if l.startswith('</section>'))
sec=L[S:E+1]
vs=next(i for i,l in enumerate(sec) if 'id="vistaWrap"' in l); va=next(i for i,l in enumerate(sec) if 'id="advWrap"' in l)
sec=sec[:vs]+sec[va:]
h='\n'.join(sec)
h=re.sub(r'<select id="monitorChoice">.*?</select>','<select id="monitorChoice" hidden><option value="advance">BIS Advance</option></select>',h)
h=h.replace('<h1 class="apptitle" id="h-mon">Processed EEG simulator</h1>','<h1 class="apptitle" id="h-mon">EEG workshop <span>· BIS DSA and SEF95 simulator</span></h1>')
assert not re.search(r'Masimo|SedLine|Philips|IntelliVue|Vista',h,re.I), re.search(r'.{40}(Masimo|SedLine|Philips|IntelliVue|Vista).{40}',h,re.I)
head='''<!doctype html>
<html lang="en-GB" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#002f6c">
<meta name="color-scheme" content="light">
<title>EEG workshop · BIS DSA and SEF95 simulator</title>
<meta name="description" content="Workshop simulator: blinded reading of the density spectral array (DSA), SEF95 and the raw EEG, with scripted cases, a quiz and a TCI pump. Synthetic EEG only.">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<!-- its own home-screen app (id /workshop/, scope ./), apart from any future main-page install; installable, never prompted -->
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="EEG Workshop">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="format-detection" content="telephone=no">
<script>addEventListener('beforeinstallprompt', e => e.preventDefault());</script>
<!-- The workshop page (25 Nov 2026): the same engine, BIS Advance screen, pump, cases and quiz scripts as the main page
     (../index.html), with no skin picker, a large NTFGH / NUHS header and the NUHS page style (ws-page.css). Generated from the
     main page's monitor section (so the shared scripts find their elements); the Medtronic-style screen is left out, and the
     other skins are never built because the skin is fixed. -->
<link rel="preload" href="../fonts/OpenSans-latin-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../page.css">
<link rel="stylesheet" href="../adv.css">
<link rel="stylesheet" href="../demo.css?v=20261017-fit">
<link rel="stylesheet" href="../workshop.css">
<link rel="stylesheet" href="../ws-page.css">
<script>window.WS_PAGE=1</script>
</head>
<body class="ws-page">
<div class="wrap">
'''
stubs='''
<!-- elements the shared scripts expect from the main page's teaching sections; empty and hidden here -->
<div id="wsStubs" hidden><canvas id="cEx"></canvas><ol id="steps"></ol><p id="exCap"></p><button id="exPlay" type="button"></button><button id="exNext" type="button"></button>
<div id="lib"></div><canvas id="cQuiz"></canvas><span id="score"></span><div id="opts"></div><p id="fb"></p><button id="qNext" type="button"></button></div>
<footer class="ws-foot">Teaching simulation with synthetic EEG; the index is a model, not the monitor's algorithm. Not for clinical use or dosing.</footer>
</div>
'''
scripts=['mt-screen.js','adv-screen.js','adv-draw.js','adv-live.js','adv-menu.js','adv-seed.js','sed-screen.js','sed-draw.js','sed-menu.js','pv-screen.js','app.js','teaching.js','timeline.js','demo.js?v=20261017-fit','pump.js','cases.js','workshop.js','quiz.js','ws-page.js']
tail='\n'.join(f'<script src="../{s}"></script>' for s in scripts)+'\n</body>\n</html>\n'
open('workshop/index.html','w').write(head+h+stubs+tail)
# the service worker's SHELL: every file the page links (stylesheets, scripts, fonts it preloads or its CSS uses, the logo)
css=['page.css','adv.css','demo.css?v=20261017-fit','workshop.css','ws-page.css']
assert all(f'href="../{c}"' in head for c in css)
fonts=['fonts/OpenSans-latin-var.woff2','fonts/Selawik-Light-latin.woff2','fonts/Selawik-Regular-latin.woff2','fonts/Selawik-Semibold-latin.woff2','fonts/jetbrains-mono.woff2']
shell=[f'../{x}' for x in css+scripts+fonts+['assets/ana-ntf-logo.svg?v=clean']]
sw=open('workshop/sw.js').read()
sw=re.sub(r'  // shell:start\n.*?  // shell:end\n','  // shell:start\n'+''.join(f"  '{x}',\n" for x in shell)+'  // shell:end\n',sw,flags=re.S)
open('workshop/sw.js','w').write(sw)
