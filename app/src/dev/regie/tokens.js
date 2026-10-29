// Unico luogo di durate, curve, finestre e ritardi delle regie di sviluppo; escluso dal build.
export const TOKENS = Object.freeze({
  duration: {A:{view:1800,narrative:1400,tilt:1200,coupled:2000},B:{view:1600,narrative:1000,tilt:1200,coupled:1900},C:{view:1800,narrative:1300,tilt:1500,coupled:2100},D:{view:1300,narrative:1300,tilt:1300,coupled:1300}},
  directionD:{samples:256,rankAmplitude:.12,deceleration:.12,positionEnd:.84,pigmentWindow:[0,.12],pigmentReturn:[.88,1],durations:[1000,1300,1600]},
  zoom:{levels:[1,1.5,3,6],anchors:{dense:'gaz_via_merulana',middle:'gaz_marino',edge:'gaz_anzio'}},
  legacyFrames:100,chase:{tilt:.05},camera:{readingZoom:2,offset:[.45,.3]},
  phases:{separate:[0,.15],move:[.12,.76],relief:[.66,1],narrative:[.42,.78],withdraw:[0,.3],geoOut:[0,.2],geoIn:[.76,1],border:[0,.16]},
  stagger:.12,rankWeight:.7,rankSpread:.72,rankSpan:.28,
  curve:'smootherstep', planarHandoff:[0,.08], reducedMs:0, profileLimit:1.1,
  presenceEpsilon:1e-9, sampleSteps:20, visibilityAlpha:.015,
  shell:{paper:'#f1e7d0',sheet:'#fcfaf4',ink:'#2b2c27',muted:'#595a50',line:'#7c7c6e',target:44,focus:3,gap:16},
});
export const clamp=v=>Math.max(0,Math.min(1,v));
export const lerp=(a,b,p)=>a+(b-a)*p;
export const ease=p=>{p=clamp(p);return p*p*p*(p*(p*6-15)+10)};
export const windowAt=(p,[a,b])=>ease((p-a)/(b-a));
export function finiteChase(p,gain){return (1-Math.pow(1-gain,TOKENS.legacyFrames*clamp(p)))/(1-Math.pow(1-gain,TOKENS.legacyFrames));}
