import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('dist/server', {recursive: true});
await build({entryPoints:['worker/cloudflare.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'neutral',target:'es2022'});
