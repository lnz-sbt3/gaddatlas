import {defineConfig} from 'vite';
import passageAccess from './build/passages.js';
import it from './src/strings-it.js';
import localBasemap from './build/local-basemap.js';

const escapeHtml=text=>text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export default defineConfig({
 base:process.env.BASE_PATH||'/',
 publicDir:false,
 plugins:[localBasemap(),passageAccess(),{name:'italian-page-labels',transformIndexHtml:html=>html.replace('%APP_LANG%',it.language).replace('%APP_TITLE%',escapeHtml(it.title)).replace('%APP_DESCRIPTION%',escapeHtml(it.description)).replace('%APP_LOADING%',escapeHtml(it.loadingAtlas))}],
 build:{outDir:'dist',assetsDir:'assets',target:'es2022',sourcemap:true,
  rollupOptions:{output:{sourcemapExcludeSources:true}}},
 server:{port:5173,open:true,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/data/dist/passages/**','**/public/data/passages/**']}},
});
