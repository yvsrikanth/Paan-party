import { cleanInvoice } from '../src/model';
interface D1Statement { bind(...v:unknown[]):D1Statement; first<T>():Promise<T|null>; all<T>():Promise<{results:T[]}>; run():Promise<{meta:{changes:number}}> }
export interface Env { DB:{prepare:(sql:string)=>D1Statement}; ASSETS:{fetch:(r:Request)=>Promise<Response>}; DEV_MODE?:boolean; }
function database(env:Env){if(!env.DB)throw new Error('Invoice storage is unavailable.');return env.DB;}
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
// Allocate and store the next daily number in the same write so concurrent phones cannot claim it twice.
const nextNumberSql="? || printf('%02d', (SELECT COALESCE(MAX(CAST(substr(json_extract(payload, '$.invoiceNo'), 10) AS INTEGER)), 0) + 1 FROM invoices WHERE owner_id = ? AND substr(json_extract(payload, '$.invoiceNo'), 1, 9) = ? AND length(substr(json_extract(payload, '$.invoiceNo'), 10)) BETWEEN 1 AND 12 AND substr(json_extract(payload, '$.invoiceNo'), 10) NOT GLOB '*[^0-9]*'))";
export default {async fetch(request:Request,env:Env):Promise<Response>{
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const owner=request.headers.get('oai-authenticated-user-id');
  if(!owner)return json({error:'Sign in to access your invoices.'},401);
  if(request.method!=='GET' && !env.DEV_MODE){const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'This request is not allowed.'},403);}
  try{
    const db=database(env);
    if(url.pathname==='/api/invoices' && request.method==='GET'){
      const result=await db.prepare("SELECT id, json_extract(payload, '$.billTo') AS billTo, json_extract(payload, '$.invoiceNo') AS invoiceNo, updated_at AS updatedAt FROM invoices WHERE owner_id = ? ORDER BY updated_at DESC").bind(owner).all();
      return json({invoices:result.results});
    }
    const match=url.pathname.match(/^\/api\/invoices\/([\da-f-]{36})$/i);
    if(!match)return json({error:'Not found.'},404);
    const id=match[1];
    if(request.method==='GET'){
      const row=await db.prepare('SELECT payload, revision FROM invoices WHERE id = ? AND owner_id = ?').bind(id,owner).first<{payload:string;revision:number}>();
      return row?json({invoice:cleanInvoice(JSON.parse(row.payload)),revision:row.revision}):json({error:'This invoice could not be found.'},404);
    }
    if(request.method==='PUT'){
      const raw=await request.text();if(raw.length>150000)return json({error:'The invoice is too large.'},413);
      let body;try{body=JSON.parse(raw);}catch{return json({error:'Invalid invoice data.'},400);}
      let invoice;try{invoice=cleanInvoice(body.invoice);}catch(e){return json({error:e instanceof Error?e.message:'Invalid invoice.'},400);}
      if(invoice.id!==id||!Number.isSafeInteger(body.revision)||body.revision<0)return json({error:'Invalid invoice revision.'},400);
      if(body.autoNumber!==undefined&&typeof body.autoNumber!=='boolean')return json({error:'Invalid invoice numbering option.'},400);
      const updatedAt=new Date().toISOString();
      const payload=JSON.stringify(invoice);const prefix=invoice.invoiceDate.replaceAll('-','')+'-';
      const updatedPayload=body.invoice.previousBalance===undefined?"json_set(?, '$.previousBalance', COALESCE(json_extract(payload, '$.previousBalance'), 0))":"?";
      const result=body.autoNumber===true
        ?body.revision===0
          ?await db.prepare(`INSERT INTO invoices (id, owner_id, payload, revision, updated_at) VALUES (?, ?, json_set(?, '$.invoiceNo', ${nextNumberSql}), 1, ?) ON CONFLICT(id) DO NOTHING`).bind(id,owner,payload,prefix,owner,prefix,updatedAt).run()
          :await db.prepare(`UPDATE invoices SET payload = json_set(${updatedPayload}, '$.invoiceNo', ${nextNumberSql}), revision = revision + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ?`).bind(payload,prefix,owner,prefix,updatedAt,id,owner,body.revision).run()
        :body.revision===0
          ?await db.prepare('INSERT INTO invoices (id, owner_id, payload, revision, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(id) DO NOTHING').bind(id,owner,payload,updatedAt).run()
          :await db.prepare(`UPDATE invoices SET payload = ${updatedPayload}, revision = revision + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ?`).bind(payload,updatedAt,id,owner,body.revision).run();
      if(result.meta.changes!==1)return json({error:'This invoice changed in another tab. Reload to see the latest version before editing it.'},409);
      const numbered=body.autoNumber===true?await db.prepare("SELECT json_extract(payload, '$.invoiceNo') AS invoiceNo FROM invoices WHERE id = ? AND owner_id = ?").bind(id,owner).first<{invoiceNo:string}>():null;
      return json({revision:body.revision+1,updatedAt,invoiceNo:numbered?.invoiceNo??invoice.invoiceNo});
    }
    return json({error:'Method not allowed.'},405);
  }catch(e){console.error('Invoice storage error',e instanceof Error?e.message:'unknown');return json({error:'Invoice storage is temporarily unavailable. Please try saving again.'},503);}
}};
