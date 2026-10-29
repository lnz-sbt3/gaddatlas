import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';

const ID='virtual:passage-access',RESOLVED='\0'+ID;
// Modalità di build pubblica (`vite build --mode pubblica`): nessun estratto entra nel sito.
export const PUBLIC_MODE='pubblica';
const chapterFiles=dir=>existsSync(dir)?readdirSync(dir).filter(n=>/^ch\d{2}\.json$/.test(n)):[];
export const fragmentName=(salt,id)=>createHash('sha256').update(salt+'\0'+id).digest('hex')+'.json';

// Legge i derivati privati senza riscriverli. Nessun elenco di URL entra nel client.
export function collectFragments(root,salt){
 const publicData=JSON.parse(readFileSync(resolve(root,'public/data/gaddatlas.geojson')));
 const wanted=new Set(publicData.relief.map(r=>r.referenceId)),found=new Map();
 const source=resolve(root,'../data/dist/passages');
 for(const name of readdirSync(source).filter(n=>/^ch\d{2}\.json$/.test(n))){
  const chapter=JSON.parse(readFileSync(resolve(source,name)));
  for(const [id,p] of Object.entries(chapter.passages)){
   if(!wanted.has(id))continue;
   if(found.has(id)||!p.excerpt||!p.sourceReference)throw Error('Frammento testuale non valido');
   const passage={referenceId:id,excerpt:p.excerpt,sourceReference:p.sourceReference,witnessLabel:p.witnessLabel||null,page:p.page};
   found.set(id,{name:fragmentName(salt,id),source:JSON.stringify(passage)});
  }
 }
 if(found.size!==wanted.size)throw Error('Riferimenti testuali incompleti');
 return found;
}

// Modalità rigida (predefinita): la build si ferma se manca un riferimento. Modalità pubblica, e sviluppo senza
// estratti: nessun frammento, nessuna richiesta; il pannello rinvia all'edizione di riferimento.
export default function passageAccess(){
 const salt=randomBytes(24).toString('hex');let root,fragments,withheld=false;
 const load=()=>fragments??=collectFragments(root,salt);
 return{
  name:'single-reference-passages',
  configResolved(config){root=config.root;withheld=config.mode===PUBLIC_MODE||(config.command==='serve'&&!chapterFiles(resolve(root,'../data/dist/passages')).length);},
  resolveId(id){if(id===ID)return RESOLVED;},
  load(id){if(id!==RESOLVED)return;
   if(withheld)return 'export const passagesAvailable=false;export async function passagePath(){return null;}';
   return `export const passagesAvailable=true;export async function passagePath(id){
   if(!/^ref_\\d{5}$/.test(id))throw Error('Riferimento non valido');
   const bytes=new TextEncoder().encode(${JSON.stringify(salt)}+'\\0'+id);
   const hash=await crypto.subtle.digest('SHA-256',bytes);
   return 'readings/'+Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')+'.json';
  }`;},
  configureServer(server){
   server.middlewares.use((req,res,next)=>{
    const path=decodeURI((req.url||'').split('?')[0]);
    if(/\/data\/passages(?:\/|$)/.test(path)){res.statusCode=404;res.end();return;}
    if(/\/data\/(gaddatlas|roma)\.geojson$/.test(path)){res.setHeader('Content-Type','application/geo+json');res.end(readFileSync(resolve(root,'public/data',path.split('/').pop())));return;}
    const match=path.match(/\/data\/readings\/([a-f0-9]{64}\.json)$/);
    if(!match)return next();
    if(withheld){res.statusCode=404;res.end();return;}
    const item=Array.from(load().values()).find(v=>v.name===match[1]);
    if(!item){res.statusCode=404;res.end();return;}
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.end(item.source);
   });
  },
  generateBundle(){
   // publicDir è disabilitata: si emettono soltanto le due geometrie pubbliche.
   for(const name of ['gaddatlas.geojson','roma.geojson'])this.emitFile({type:'asset',fileName:'data/'+name,source:readFileSync(resolve(root,'public/data',name))});
   if(withheld)return;
   for(const item of load().values())this.emitFile({type:'asset',fileName:'data/readings/'+item.name,source:item.source});
  }
 };
}
