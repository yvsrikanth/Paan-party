import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../.sites-runtime/worker.mjs';
const sqlite=new DatabaseSync('.sites-runtime/preview.sqlite');
sqlite.exec('CREATE TABLE IF NOT EXISTS _dev_migrations (name TEXT PRIMARY KEY)');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())if(!sqlite.prepare('SELECT name FROM _dev_migrations WHERE name=?').get(file)){sqlite.exec(readFileSync('drizzle/'+file,'utf8'));sqlite.prepare('INSERT INTO _dev_migrations VALUES (?)').run(file);}
const DB={prepare(sql){const statement=sqlite.prepare(sql);let values=[];return {bind(...v){values=v;return this;},async first(){return statement.get(...values)??null;},async all(){return {results:statement.all(...values)};},async run(){const r=statement.run(...values);return {meta:{changes:r.changes}};}};}};
createServer(async(req,res)=>{
  try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);headers.set('oai-authenticated-user-id','preview-owner');
  const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,...(req.method!=='GET'&&req.method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,{DB,DEV_MODE:true});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}
  catch(e){console.error(e);res.writeHead(500);res.end(JSON.stringify({error:'Preview server error.'}));}
}).listen(8788,'127.0.0.1',()=>console.log('Invoice preview storage ready'));
