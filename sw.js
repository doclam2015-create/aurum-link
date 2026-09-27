var CACHE='aurum-v11';
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(['./index.html','./manifest.webmanifest','./icon.png']);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k.indexOf('aurum-v')===0&&k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(function(r){if(r.ok){var copy=r.clone();e.waitUntil(caches.open(CACHE).then(function(c){return c.put('./index.html',copy);}));}return r;}).catch(function(){return caches.open(CACHE).then(function(c){return c.match('./index.html');});}));return;}
e.respondWith(caches.open(CACHE).then(function(c){return c.match(e.request).then(function(r){return r||fetch(e.request);});}));});
