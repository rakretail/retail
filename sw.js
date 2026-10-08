const CACHE='rak-walkin-v2';
const SHELL=['./','./index.html','./rakwalkin.png','./manifest.json'];
const isOld=k=>k==='ret-tracker-v1'||(k.startsWith('rak-walkin-')&&k!==CACHE);
const keyOf=url=>{const u=new URL(url);u.search='';u.hash='';return u.href};
const isPage=req=>req.mode==='navigate'||req.destination==='document'||/(\/|\.html)$/.test(new URL(req.url).pathname);

self.addEventListener('install',e=>{
  self.skipWaiting();                                   // replace the previous worker straight away
  e.waitUntil(caches.open(CACHE).then(c=>Promise.allSettled(SHELL.map(u=>c.add(new Request(u,{cache:'reload'}))))));
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const old=(await caches.keys()).filter(isOld);
    await Promise.all(old.map(k=>caches.delete(k)));
    await self.clients.claim();
    if(old.length){                                     // an upgrade: reload open windows so they leave the old saved page
      const ws=await self.clients.matchAll({type:'window'});
      await Promise.all(ws.map(w=>w.navigate?w.navigate(w.url).catch(()=>{}):null));
    }
  })());
});

async function page(e){
  const c=await caches.open(CACHE), key=keyOf(e.request.url);
  try{
    const res=await fetch(e.request.url,{cache:'no-store',credentials:'same-origin'});
    if(res.redirected) return Response.redirect(res.url,302);
    if(res.ok) e.waitUntil(c.put(key,res.clone()).catch(()=>{}));
    return res;
  }catch(err){
    return (await c.match(key))||(await c.match('./index.html'))||(await c.match('./'))||Response.error();
  }
}
async function asset(e){
  const c=await caches.open(CACHE), hit=await c.match(e.request);
  const net=fetch(e.request).then(r=>{ if(r.ok) c.put(e.request,r.clone()).catch(()=>{}); return r });
  if(hit){ e.waitUntil(net.catch(()=>{})); return hit }
  return net;
}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin) return;   // live data and fonts go straight to the network
  e.respondWith(isPage(req)?page(e):asset(e));
});
