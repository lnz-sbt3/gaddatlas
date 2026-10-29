import fs from 'node:fs';
import path from 'node:path';
// Solo in sviluppo con Vite: nessuna immagine della carta locale entra nel build.
export default function localBasemap(){
  let root,base,serving=false;
  // LOCAL_BASEMAP_DIR indica un'altra cartella di immagini al posto di local-basemap.
  const dir=()=>process.env.LOCAL_BASEMAP_DIR?path.resolve(root,process.env.LOCAL_BASEMAP_DIR):path.join(root,'local-basemap');
  const file=()=>path.join(dir(),'manifest.json');
  const read=()=>serving&&fs.existsSync(file())?JSON.parse(fs.readFileSync(file(),'utf8')):null;
  return {name:'local-historical-map',
    configResolved(config){root=config.root;base=config.base;serving=config.command==='serve';},
    resolveId(id){if(id==='virtual:historical-manifest')return '\0historical-manifest';},
    load(id){if(id==='\0historical-manifest')return 'export default '+JSON.stringify(read())+';';},
    configureServer(server){
      server.watcher.add(dir());
      server.watcher.on('change',changed=>{if(changed===file()){
        const module=server.moduleGraph.getModuleById('\0historical-manifest');if(module)server.moduleGraph.invalidateModule(module);
        server.ws.send({type:'full-reload'});
      }});
      server.middlewares.use((req,res,next)=>{
      const prefix=base+'__local_basemap/';if(!req.url?.startsWith(prefix))return next();
      const manifest=read(),name=req.url.slice(prefix.length).split('?')[0];
      const levels=manifest?.levels||manifest?.sources?.flatMap(s=>s.levels)||[];
      if(!levels.some(level=>level.file===name)||name!==path.basename(name)){res.statusCode=404;return res.end();}
      const source=path.join(dir(),name);if(!fs.existsSync(source)){res.statusCode=404;return res.end();}
      res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','no-store');fs.createReadStream(source).pipe(res);
    });}
  };
}
