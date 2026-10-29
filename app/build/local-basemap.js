import fs from 'node:fs';
import path from 'node:path';
// Carte storiche. In sviluppo: app/local-basemap/ (oppure LOCAL_BASEMAP_DIR), servita sotto __local_basemap/;
// senza cartella locale si usa la cartella di pubblicazione. Nella build: solo app/carte-storiche/, emessa sotto
// carte-storiche/; senza quella cartella il build non contiene carte.
export const PUBLISHED_DIR='carte-storiche';
const TYPES={'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
export default function localBasemap(){
  let root,base,serving=false;
  // LOCAL_BASEMAP_DIR prova un'altra cartella (per esempio la composizione) senza toccare app/local-basemap.
  const dir=()=>{
    if(!serving)return path.join(root,PUBLISHED_DIR);
    if(process.env.LOCAL_BASEMAP_DIR)return path.resolve(root,process.env.LOCAL_BASEMAP_DIR);
    const local=path.join(root,'local-basemap');
    return fs.existsSync(path.join(local,'manifest.json'))?local:path.join(root,PUBLISHED_DIR);
  };
  const file=()=>path.join(dir(),'manifest.json');
  const read=()=>fs.existsSync(file())?JSON.parse(fs.readFileSync(file(),'utf8')):null;
  const levelsOf=manifest=>manifest?.levels||manifest?.sources?.flatMap(s=>s.levels)||[];
  // Il caricatore legge il prefisso delle immagini dal manifest, relativo a BASE_URL.
  const client=()=>{const manifest=read();return manifest&&{...manifest,assetBase:serving?'__local_basemap/':PUBLISHED_DIR+'/'};};
  return {name:'local-historical-map',
    configResolved(config){root=config.root;base=config.base;serving=config.command==='serve';},
    resolveId(id){if(id==='virtual:historical-manifest')return '\0historical-manifest';},
    load(id){if(id==='\0historical-manifest')return 'export default '+JSON.stringify(client())+';';},
    configureServer(server){
      server.watcher.add(dir());
      server.watcher.on('change',changed=>{if(changed===file()){
        const module=server.moduleGraph.getModuleById('\0historical-manifest');if(module)server.moduleGraph.invalidateModule(module);
        server.ws.send({type:'full-reload'});
      }});
      server.middlewares.use((req,res,next)=>{
      const prefix=base+'__local_basemap/';if(!req.url?.startsWith(prefix))return next();
      const manifest=read(),name=req.url.slice(prefix.length).split('?')[0];
      if(!levelsOf(manifest).some(level=>level.file===name)||name!==path.basename(name)){res.statusCode=404;return res.end();}
      const source=path.join(dir(),name);if(!fs.existsSync(source)){res.statusCode=404;return res.end();}
      res.setHeader('Content-Type',TYPES[path.extname(name)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(source).pipe(res);
    });},
    generateBundle(){
      // Solo le immagini elencate dal manifest; il manifest stesso entra nel bundle come modulo.
      const manifest=read();if(!manifest)return;
      for(const level of levelsOf(manifest)){
        if(level.file!==path.basename(level.file))throw Error('Carta storica: nome di file non valido');
        this.emitFile({type:'asset',fileName:PUBLISHED_DIR+'/'+level.file,source:fs.readFileSync(path.join(dir(),level.file))});
      }
    }
  };
}
