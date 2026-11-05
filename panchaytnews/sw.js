'use strict';
const CACHE='panchayt-news-v3';
const ASSETS=['./','index.html','style.css','app.js','logo.svg','rural.svg','regions.json','news.json','manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('panchayt-news-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const key=new Request(url.origin+url.pathname);try{const response=await fetch(event.request);if(response.ok)await cache.put(key,response.clone());return response}catch{return await cache.match(key)||Response.error()}})())});
