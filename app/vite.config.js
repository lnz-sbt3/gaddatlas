import { defineConfig } from "vite";

// Il percorso base NON e' cablato (D-007). Il sito puo' passare da
// GitHub Pages a projects.dharc.unibo.it: deve restare una variabile.
//
//   dev locale       -> "/"
//   GitHub Pages     -> BASE_PATH=/gaddatlas/        (nome del repository)
//   DH.ARC           -> BASE_PATH=/gaddatlas/        (prefisso di percorso)
//
// I progetti DH.ARC stanno sotto prefisso (projects.dharc.unibo.it/odi/),
// quindi nessun percorso assoluto nel codice: solo import e URL relativi.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // il GeoJSON e i brani stanno in public/ e vengono copiati intatti:
    // non passano dal bundler, quindi restano ispezionabili e cacheabili
    target: "es2022",
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
