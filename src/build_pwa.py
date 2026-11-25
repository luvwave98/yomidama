import os, json, shutil, zipfile
from PIL import Image
OUT='..'  # the repository root is the published site
os.makedirs(OUT+'/icons',exist_ok=True)
# icons
src=Image.open('assets/c06_impact_a.webp').convert('RGB').crop((40,160,680,800))
for n,s in [('icon-192.png',192),('icon-512.png',512),('icon-maskable-512.png',512),('apple-touch-icon.png',180),('icon-32.png',32)]:
    src.resize((s,s),Image.LANCZOS).save(f'{OUT}/icons/{n}',optimize=True)
# page: split the artifact content into <head> material and <body> markup
page=open('index.html').read()
cut=page.index('</style>')+len('</style>')
headpart,bodypart=page[:cut],page[cut:]
headpart=headpart.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
html=f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="カードを伏せて同時にめくり、配球と狙い球を読み合う野球ゲーム。">
<meta name="theme-color" content="#0a1310">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="ヨミダマ">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}html,body{{margin:0}}img{{max-width:100%}}</style>
{headpart}
</head>
<body>
{bodypart}
<script>
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){{
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{{updateViaCache:'none'}}).then(reg=>{{
    const chk=()=>reg.update().catch(()=>{{}});document.addEventListener('visibilitychange',()=>{{if(!document.hidden)chk();}});setInterval(chk,30*60*1000);}}).catch(()=>{{}}));
  /* a new version took over: reload once, but only on the title screen so a game in progress is never cut off */
  const had=!!navigator.serviceWorker.controller;let pend=false;
  const tryReload=()=>{{const s=document.getElementById('setup');if(s&&!s.hidden&&!document.getElementById('hub')?.offsetParent){{location.reload();}}else pend=true;}};
  navigator.serviceWorker.addEventListener('controllerchange',()=>{{if(had)tryReload();}});
  document.addEventListener('visibilitychange',()=>{{if(pend&&!document.hidden)tryReload();}});}}
</script>
</body>
</html>
'''
open(f'{OUT}/index.html','w').write(html)
manifest={"name":"ヨミダマ","short_name":"ヨミダマ","description":"カードを伏せて同時にめくり、配球と狙い球を読み合う野球ゲーム。",
 "lang":"ja","start_url":"./","scope":"./","display":"standalone","orientation":"portrait",
 "background_color":"#0a1310","theme_color":"#0a1310","categories":["games","sports"],
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},
          {"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"},
          {"src":"icons/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
json.dump(manifest,open(f'{OUT}/manifest.webmanifest','w'),ensure_ascii=False,indent=2)
ver=str(int(os.path.getmtime('index.html')))
sw=f"""/* ヨミダマ service worker: works offline after the first visit */
const V='yomidama-{ver}';
const CORE=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/icon-32.png'];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(x=>new Request(x,{{cache:'reload'}})))).then(()=>self.skipWaiting()));}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));}});
self.addEventListener('fetch',e=>{{
  const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){{
    /* the page itself: network first so updates arrive, cached copy when offline */
    if(r.mode==='navigate'){{e.respondWith(fetch(r.url,{{cache:'no-cache'}}).then(res=>{{const cp=res.clone();caches.open(V).then(c=>c.put('index.html',cp));return res;}}).catch(()=>caches.match('index.html')));return;}}
    e.respondWith(caches.match(r).then(m=>m||fetch(r)));return;}}
  /* web fonts: cached after first use so the game keeps its look offline */
  if(/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname)){{
    e.respondWith(caches.open(V).then(c=>c.match(r).then(m=>{{const f=fetch(r).then(res=>{{c.put(r,res.clone());return res;}}).catch(()=>m);return m||f;}})));}}
}});
"""
open(f'{OUT}/sw.js','w').write(sw)
print('ok: site written to repository root')
