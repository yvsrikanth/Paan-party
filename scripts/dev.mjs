import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.sites-runtime',{recursive:true});
await build({entryPoints:['worker/index.ts'],outfile:'.sites-runtime/worker.mjs',bundle:true,format:'esm',platform:'node',target:'node24'});
const api=spawn(process.execPath,['scripts/dev-api.mjs'],{stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/@angular/cli/bin/ng.js','serve',...process.argv.slice(2)],{stdio:'inherit'});
const stop=()=>{api.kill('SIGTERM');web.kill('SIGTERM');};process.on('SIGTERM',stop);process.on('SIGINT',stop);
api.on('exit',code=>{if(code){stop();process.exit(code);}});web.on('exit',code=>{stop();process.exit(code??0);});
