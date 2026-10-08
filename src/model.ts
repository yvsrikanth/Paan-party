export interface Delivery { id: string; date: string; meetha: number; flavour: number; }
export interface Rates { meethaRate: number; flavourRate: number; }
export interface Invoice extends Rates { id: string; billTo: string; invoiceNo: string; invoiceDate: string; address: string; previousBalance: number; rows: Delivery[]; }
export const MEETHA_PRICE = 2;
export const FLAVOUR_PRICE = 3;
const DEFAULT_RATES: Rates = {meethaRate:MEETHA_PRICE,flavourRate:FLAVOUR_PRICE};
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s+'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === s && s >= '1900-01-01' && s <= '9999-12-31';
}
export function addDays(date: string, days: number): string {
  if (!validDate(date)) throw new Error('Choose a valid starting date.');
  const d = new Date(date+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+days);
  const result = d.toISOString().slice(0,10);
  if (!validDate(result)) throw new Error('The date range is too large.');
  return result;
}
export function newRow(date = ''): Delivery { return {id: crypto.randomUUID(),date,meetha:0,flavour:0}; }
export function nextInvoiceNumber(used: string[], date=today()): string {
  if(!validDate(date))throw new Error('Choose a valid invoice date.');
  const prefix=date.replaceAll('-','')+'-';let last=0;
  for(const number of used){
    if(!number.startsWith(prefix))continue;
    const suffix=number.slice(prefix.length);
    if(/^\d{1,12}$/.test(suffix))last=Math.max(last,Number(suffix));
  }
  return prefix+String(last+1).padStart(2,'0');
}
export function invoiceFilename(invoice: Pick<Invoice,'billTo'|'invoiceNo'>): string {
  const part=(value:string,fallback:string,limit:number)=>value.normalize('NFC').trim().replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,'-').replace(/\s+/g,' ').slice(0,limit).replace(/[ .]+$/,'')||fallback;
  return `${part(invoice.billTo,'Customer',100)}-${part(invoice.invoiceNo,'Invoice',80)}.pdf`;
}
export function newInvoice(sequence = 1, rates: Rates = DEFAULT_RATES): Invoice {
  return {id:crypto.randomUUID(),billTo:'',invoiceNo:`${today().replaceAll('-','')}-${String(sequence).padStart(2,'0')}`,invoiceDate:today(),address:'5620 Vendelay Lane, Cumming, GA 30040',meethaRate:rates.meethaRate,flavourRate:rates.flavourRate,previousBalance:0,rows:[newRow(today()),newRow(),newRow(),newRow(),newRow()]};
}
export function rateValid(n: number): boolean { return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10000&&Math.abs(n*100-Math.round(n*100))<0.000001; }
export function previousBalanceValid(n: number): boolean { return typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000000&&Math.abs(n*100-Math.round(n*100))<0.000001; }
export function rateError(rates: Rates): string {
  if(!rateValid(rates.meethaRate)) return 'Meetha rate: enter $0 to $10,000 with up to 2 decimal places.';
  if(!rateValid(rates.flavourRate)) return 'Flavour rate: enter $0 to $10,000 with up to 2 decimal places.';
  return '';
}
export function totals(rows: Delivery[], rates: Rates & {previousBalance?:number} = DEFAULT_RATES) {
  const meetha = rows.reduce((s,r)=>s+(Number.isInteger(r.meetha)&&r.meetha>=0?r.meetha:0),0);
  const flavour = rows.reduce((s,r)=>s+(Number.isInteger(r.flavour)&&r.flavour>=0?r.flavour:0),0);
  const meethaCents=meetha*(rateValid(rates.meethaRate)?Math.round(rates.meethaRate*100):0);
  const flavourCents=flavour*(rateValid(rates.flavourRate)?Math.round(rates.flavourRate*100):0);
  const balance=previousBalanceValid(rates.previousBalance??0)?Math.round((rates.previousBalance??0)*100):0;
  return {meetha,flavour,meethaAmount:meethaCents/100,flavourAmount:flavourCents/100,subtotal:(meethaCents+flavourCents)/100,previousBalance:balance/100,grandTotal:(meethaCents+flavourCents+balance)/100};
}
export function rowAmount(r: Delivery, rates: Rates = DEFAULT_RATES) { return totals([r],rates).subtotal; }
export function quantityValid(n: number): boolean { return Number.isInteger(n)&&n>=0&&n<=1000000; }
export function ledgerError(doc: Invoice): string {
  const error=rateError(doc);if(error)return error;
  if(!previousBalanceValid(doc.previousBalance===undefined?0:doc.previousBalance))return 'Previous balance: enter $0 to $1,000,000 with up to 2 decimal places.';
  for(let i=0;i<doc.rows.length;i++) {
    const r=doc.rows[i];
    if(!quantityValid(r.meetha)||!quantityValid(r.flavour)) return `Row ${i+1}: enter a whole quantity from 0 to 1,000,000.`;
    if((r.meetha>0||r.flavour>0)&&!validDate(r.date)) return `Row ${i+1}: choose a delivery date.`;
  }
  return '';
}
export function invoiceError(doc: Invoice): string {
  return ledgerError(doc)||(!doc.billTo.trim()?'Enter a customer in Bill to.':'')||(!doc.invoiceNo.trim()?'Enter an invoice number.':'')||(!validDate(doc.invoiceDate)?'Choose an invoice date.':'')||(!doc.rows.some(r=>r.meetha>0||r.flavour>0)&&!(doc.previousBalance>0)?'Enter at least one paan quantity or a previous balance.':'');
}
export function filledRows(rows: Delivery[], from: number, to: number, step=1): Delivery[] {
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=rows.length||to>=rows.length||!Number.isInteger(step)||step<1||step>365) throw new Error('Choose a valid date range.');
  const source=rows[from].date;
  return rows.map((r,i)=>i>=Math.min(from,to)&&i<=Math.max(from,to)?{...r,date:addDays(source,(i-from)*step)}:r);
}
export function cleanInvoice(input: unknown): Invoice {
  const d=input as Invoice;
  if(!d||typeof d!=='object'||typeof d.id!=='string'||!/^[\da-f-]{36}$/i.test(d.id)||!Array.isArray(d.rows)||d.rows.length<1||d.rows.length>500) throw new Error('Invalid invoice.');
  for(const key of ['billTo','invoiceNo','invoiceDate','address'] as const) if(typeof d[key]!=='string'||d[key].length>(key==='address'?500:200)) throw new Error('Invalid invoice details.');
  if(!validDate(d.invoiceDate)) throw new Error('Choose a valid invoice date.');
  const rates={meethaRate:d.meethaRate===undefined?MEETHA_PRICE:d.meethaRate,flavourRate:d.flavourRate===undefined?FLAVOUR_PRICE:d.flavourRate};
  const error=rateError(rates);if(error)throw new Error(error);
  const previousBalance=d.previousBalance===undefined?0:d.previousBalance;
  if(!previousBalanceValid(previousBalance))throw new Error('Previous balance: enter $0 to $1,000,000 with up to 2 decimal places.');
  const seen=new Set<string>();
  const rows=d.rows.map(r=>{
    if(!r||typeof r.id!=='string'||!/^[\da-f-]{36}$/i.test(r.id)||seen.has(r.id)||typeof r.date!=='string'||(r.date!==''&&!validDate(r.date))||!quantityValid(r.meetha)||!quantityValid(r.flavour)) throw new Error('Invalid delivery row.');
    seen.add(r.id);return {id:r.id,date:r.date,meetha:r.meetha,flavour:r.flavour};
  });
  return {id:d.id,billTo:d.billTo.trim(),invoiceNo:d.invoiceNo.trim(),invoiceDate:d.invoiceDate,address:d.address.trim(),...rates,previousBalance,rows};
}
