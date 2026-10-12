import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function collect(directory, prefix='') {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry => entry.isDirectory()
    ? collect(`${directory}/${entry.name}`,`${prefix}${entry.name}/`)
    : entry.name === 'sw.js' ? [] : ['./'+prefix+entry.name]);
}
const files=['./',...collect('dist').sort()];
const digest = createHash('sha256');
for (const file of files.filter(file => file !== './')) digest.update(readFileSync('dist/' + file));
const name='html-study-'+digest.digest('hex').slice(0,12);
writeFileSync('dist/sw.js',`const CACHE=${JSON.stringify(name)},FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('html-study-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreVary:true})).then(r=>r||fetch(e.request)));});
`);
