const map={view:'map',axon:0,narrative:0},diagram={view:'diagram',axon:0,narrative:0};
const full={...diagram,narrative:1},axon={...full,axon:1},mapAxon={view:'map',axon:1,narrative:1};
export const PASSAGES=[
 ['map-diagram','Mappa → diagramma',map,diagram,'view'],
 ['diagram-map','Diagramma → mappa',diagram,map,'view'],
 ['diagram-map-axon','Diagramma → assonometria della mappa',full,mapAxon,'coupled'],
 ['map-axon-diagram','Assonometria della mappa → diagramma',mapAxon,full,'coupled'],
 ['axon-to-map','Assonometria: diagramma → mappa',axon,mapAxon,'view'],
 ['map-to-axon','Assonometria: mappa → diagramma',mapAxon,axon,'view'],
 ['narrative-on','Narrativi: comparsa in pianta',diagram,full,'narrative'],
 ['narrative-off','Narrativi: scomparsa in pianta',full,diagram,'narrative'],
 ['diagram-axon','Diagramma → assonometria del diagramma',full,axon,'tilt'],
 ['axon-diagram','Assonometria del diagramma → diagramma',axon,full,'tilt'],
 ['axon-narrative-on','Narrativi: comparsa in assonometria',{...axon,narrative:0},axon,'narrative'],
 ['axon-narrative-off','Narrativi: scomparsa in assonometria',axon,{...axon,narrative:0},'narrative'],
 ['map-tilt','Mappa → assonometria della mappa',map,{...map,axon:1},'tilt'],
 ['map-untilt','Assonometria della mappa → mappa',{...map,axon:1},map,'tilt'],
].map(([id,label,from,to,kind])=>({id,label,from,to,kind}));
export const SAMPLE_IDS=['gaz_via_merulana','gaz_torraccio','gaz_marino','gaz_soriano_nel_cimino','gaz_anzio','gaz_marsica','gaz_monte_circeo','palazzo_219','laboratorio_zamira','gaz_milano'];
