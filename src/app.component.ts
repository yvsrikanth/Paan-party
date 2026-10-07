import { Component, computed, signal, HostListener, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Invoice, Delivery, newInvoice, newRow, totals, rowAmount, rateValid, ledgerError, invoiceError, filledRows, addDays, validDate, today, cleanInvoice, MEETHA_PRICE, FLAVOUR_PRICE } from './model';
import { LedgerColumn, ExcelDateOrder, pasteLedgerCells, copyLedgerCells } from './clipboard';
import { InstallPromptEvent, appHomeUrl, runningAsApp } from './mobile-app';

interface SavedInvoice { id:string; billTo:string; invoiceNo:string; updatedAt:string; }
type SaveState = 'new'|'changed'|'saving'|'saved'|'error';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit,OnDestroy {
  draft=signal<Invoice>(newInvoice());
  summary=computed(()=>totals(this.draft().rows,this.draft()));
  deliveries=computed(()=>this.draft().rows.filter(r=>r.meetha>0||r.flavour>0));
  error=computed(()=>ledgerError(this.draft()));
  saved=signal<SavedInvoice[]>([]);
  loading=signal(true);
  loadError=signal('');
  state=signal<SaveState>('new');
  saveError=signal('');
  notice=signal('');
  activeDate=signal(0);
  activeColumn=signal<LedgerColumn>('date');
  clipboardText=signal('');
  excelDateOrder=signal<ExcelDateOrder>('auto');
  clipboardError=signal('');
  clipboardPreview=computed(()=>{
    if(this.activeColumn()!=='date'||!this.clipboardText().trim())return null;
    try{
      const start=this.activeDate();const pasted=pasteLedgerCells(this.draft().rows,start,'date',this.clipboardText(),this.excelDateOrder());
      return {rowCount:pasted.rowCount,dateOrder:pasted.dateOrder,dates:pasted.rows.slice(start,start+pasted.rowCount).filter(row=>row.date).slice(0,3).map(row=>this.displayDate(row.date)).join(' · ')};
    }catch{return null;}
  });
  drag=signal<{from:number;to:number}|null>(null);
  fillOpen=signal(false);
  fillCount=5;
  fillStep=1;
  pdfBusy=signal(false);
  previewOpen=signal(false);
  resetting=signal(false);
  installed=signal(false);
  installAvailable=signal(false);
  installing=signal(false);
  sharing=signal(false);
  shareUrl=signal('');
  revision=0;
  private editVersion=0;
  private savedEditVersion=0;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private noticeTimer:ReturnType<typeof setTimeout>|undefined;
  private savingPromise:Promise<boolean>|undefined;
  private reorderId='';
  private lifecycle=new AbortController();
  private installPrompt:InstallPromptEvent|null=null;
  @ViewChild('invoiceDialog') dialog!:ElementRef<HTMLDialogElement>;
  @ViewChild('newDialog') newDialog!:ElementRef<HTMLDialogElement>;
  @ViewChild('pasteDialog') pasteDialog!:ElementRef<HTMLDialogElement>;
  @ViewChild('resetDialog') resetDialog!:ElementRef<HTMLDialogElement>;
  @ViewChild('installDialog') installDialog!:ElementRef<HTMLDialogElement>;
  validRate=rateValid;
  amount(row:Delivery) {return rowAmount(row,this.draft());}
  money(n:number) {return Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n):'—';}
  displayDate(s:string) {return validDate(s)?new Intl.DateTimeFormat('en-US',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')):'—';}
  async ngOnInit() {this.installed.set(runningAsApp());this.shareUrl.set(appHomeUrl(window.location.href));await this.load();this.registerTools();}
  ngOnDestroy() {clearTimeout(this.timer);clearTimeout(this.noticeTimer);this.lifecycle.abort();this.installPrompt=null;}
  @HostListener('window:beforeinstallprompt',['$event']) prepareInstallation(event:Event) {
    const prompt=event as InstallPromptEvent;
    if(this.installed()||typeof prompt.prompt!=='function'||!prompt.userChoice)return;
    event.preventDefault();this.installPrompt=prompt;this.installAvailable.set(true);
  }
  @HostListener('window:appinstalled') installationComplete() {
    this.installed.set(true);this.installPrompt=null;this.installAvailable.set(false);
    this.toast('Paan Party has been added to your apps.');
  }
  openInstallation(){this.installDialog.nativeElement.showModal();}
  async installApp() {
    const prompt=this.installPrompt;if(!prompt||this.installing())return;
    this.installPrompt=null;this.installAvailable.set(false);this.installing.set(true);
    try {
      await prompt.prompt();const choice=await prompt.userChoice;
      this.toast(choice.outcome==='accepted'?'Installation requested. Follow your browser’s prompts.':'You can add Paan Party later using your browser menu.');
    }catch{this.toast('Use the Android or iPhone steps below to add Paan Party.');}
    finally{this.installing.set(false);}
  }
  async shareAppLink() {
    const url=this.shareUrl();if(!url||this.sharing())return;
    this.sharing.set(true);
    try {
      if(navigator.share) {
        try{await navigator.share({title:'Paan Party Invoice',text:'Open the Paan Party invoice app.',url});return;}
        catch(e){if(e instanceof Error&&e.name==='AbortError')return;}
      }
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);this.toast('App link copied. Send it to your partner.');
    }catch{this.toast('Select and copy the app link below to share it.');}
    finally{this.sharing.set(false);}
  }
  async request(path:string,options:RequestInit={}) {
    const res=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
    const data=await res.json().catch(()=>({error:'The server returned an unreadable response.'}));
    if(!res.ok) throw new Error(data.error||(res.status===401?'Sign in to load your invoices.':'Your invoice could not be saved.'));
    return data;
  }
  async load() {
    this.loading.set(true);this.loadError.set('');
    try {
      const data=await this.request('/api/invoices');this.saved.set(data.invoices);
      if(data.invoices.length) await this.loadInvoice(data.invoices[0].id);
    }catch(e){this.loadError.set(this.message(e));}
    finally{this.loading.set(false);}
  }
  async loadInvoice(id:string) {
    const data=await this.request('/api/invoices/'+encodeURIComponent(id));
    this.draft.set(cleanInvoice(data.invoice));this.revision=data.revision;
    this.editVersion=0;this.savedEditVersion=0;this.state.set('saved');this.saveError.set('');this.focusCell(0,'date');
  }
  async switchInvoice(id:string) {
    if(!id||id===this.draft().id) return;
    this.loading.set(true);
    try {if(!await this.saveNow()) return;await this.loadInvoice(id);}
    catch(e){this.toast(this.message(e));}
    finally{this.loading.set(false);}
  }
  change(doc:Invoice) {
    this.draft.set(doc);this.editVersion++;this.state.set('changed');this.saveError.set('');
    clearTimeout(this.timer);
    if(rateValid(doc.meethaRate)&&rateValid(doc.flavourRate)&&!doc.rows.some(r=>!Number.isInteger(r.meetha)||r.meetha<0||r.meetha>1000000||!Number.isInteger(r.flavour)||r.flavour<0||r.flavour>1000000)) this.timer=setTimeout(()=>void this.saveNow(),750);
  }
  field(key:'billTo'|'invoiceNo'|'invoiceDate'|'address',value:string) {this.change({...this.draft(),[key]:value});}
  rateField(key:'meethaRate'|'flavourRate',value:number|null) {this.change({...this.draft(),[key]:value===null?NaN:Number(value)});}
  focusCell(index:number,column:LedgerColumn) {this.activeDate.set(index);this.activeColumn.set(column);}
  columnLabel(column:LedgerColumn) {return column==='date'?'Date':column==='meetha'?'Meetha':'Flavour';}
  pasteCells(event:ClipboardEvent,id:string,column:LedgerColumn) {
    const text=event.clipboardData?.getData('text/plain');if(!text)return;
    event.preventDefault();
    try{this.insertCells(text,this.draft().rows.findIndex(row=>row.id===id),column);}
    catch(e){this.toast(this.message(e));}
  }
  openPasteCells() {this.clipboardText.set('');this.clipboardError.set('');this.pasteDialog.nativeElement.showModal();}
  setClipboardText(text:string) {this.clipboardText.set(text);this.clipboardError.set('');}
  setExcelDateOrder(order:ExcelDateOrder) {this.excelDateOrder.set(order);this.clipboardError.set('');}
  pasteFromDialog() {
    try{this.insertCells(this.clipboardText(),this.activeDate(),this.activeColumn());this.pasteDialog.nativeElement.close();}
    catch(e){this.clipboardError.set(this.message(e));}
  }
  private insertCells(text:string,index:number,column:LedgerColumn) {
    const pasted=pasteLedgerCells(this.draft().rows,index,column,text,this.excelDateOrder());
    this.change({...this.draft(),rows:pasted.rows});this.focusCell(index,column);
    this.toast(`${pasted.cellCount} cell${pasted.cellCount===1?'':'s'} pasted across ${pasted.rowCount} row${pasted.rowCount===1?'':'s'}.`);
  }
  async copyEntries() {
    try{
      const text=copyLedgerCells(this.draft().rows);
      let copied=false;
      try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;}}catch{}
      if(!copied){
        const previous=document.activeElement as HTMLElement|null;
        const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.left='-10000px';area.setAttribute('aria-hidden','true');
        document.body.append(area);
        try{area.select();copied=document.execCommand('copy');}finally{area.remove();previous?.focus();}
      }
      if(!copied)throw new Error('Clipboard access was blocked. Select a cell to copy its value.');
      this.toast('Delivery entries copied. Paste them into Excel or another invoice.');
    }catch(e){this.toast(this.message(e));}
  }
  rowField(id:string,key:'date'|'meetha'|'flavour',value:string|number|null) {
    const val=key==='date'?String(value??''):value===null?0:Number(value);
    this.change({...this.draft(),rows:this.draft().rows.map(r=>r.id===id?{...r,[key]:val}:r)});
  }
  addRow() {
    const rows=this.draft().rows;
    if(rows.length>=500){this.toast('An invoice can contain up to 500 delivery rows.');return;}
    const last=rows.at(-1)?.date;let date='';
    try{date=last&&validDate(last)?addDays(last,1):today();}catch{}
    this.change({...this.draft(),rows:[...rows,newRow(date)]});
  }
  removeRow(id:string) {
    const rows=this.draft().rows.filter(r=>r.id!==id);
    this.change({...this.draft(),rows:rows.length?rows:[newRow(today())]});
    this.activeDate.set(Math.min(this.activeDate(),this.draft().rows.length-1));
  }
  startFill(e:PointerEvent,index:number) {
    e.preventDefault();e.stopPropagation();
    if(!validDate(this.draft().rows[index].date)){this.toast('Choose a date in this row first.');return;}
    this.focusCell(index,'date');this.drag.set({from:index,to:index});
  }
  @HostListener('document:pointermove',['$event']) onPointerMove(e:PointerEvent) {
    const d=this.drag();if(!d)return;
    e.preventDefault();
    const cell=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-date-row]');
    if(cell){const i=Number(cell.getAttribute('data-date-row'));if(Number.isInteger(i)&&i>=0&&i<this.draft().rows.length)this.drag.set({...d,to:i});}
  }
  @HostListener('document:pointerup') finishFill() {
    const d=this.drag();if(!d)return;
    this.drag.set(null);
    try{if(d.from!==d.to){this.change({...this.draft(),rows:filledRows(this.draft().rows,d.from,d.to)});this.toast(`${Math.abs(d.to-d.from)+1} dates filled.`);}}catch(e){this.toast(this.message(e));}
  }
  @HostListener('document:pointercancel') cancelFill(){this.drag.set(null);}
  @HostListener('document:keydown.escape') escape(){this.drag.set(null);this.fillOpen.set(false);}
  isFillRow(i:number){const d=this.drag();return !!d&&i>=Math.min(d.from,d.to)&&i<=Math.max(d.from,d.to);}
  fillDates(){
    const start=this.activeDate();const count=Number(this.fillCount);const step=Number(this.fillStep);
    if(!Number.isInteger(count)||count<1||count>500||start+count>500){this.toast('Choose between 1 and 500 dates.');return;}
    if(!Number.isInteger(step)||step<1||step>365){this.toast('Choose a whole interval from 1 to 365 days.');return;}
    try{
      const rows=[...this.draft().rows];while(rows.length<start+count)rows.push(newRow());
      this.change({...this.draft(),rows:filledRows(rows,start,start+count-1,step)});
      this.fillOpen.set(false);this.toast(`${count} dates filled, every ${step===1?'day':step+' days'}.`);
    }catch(e){this.toast(this.message(e));}
  }
  startReorder(e:DragEvent,id:string){this.reorderId=id;e.dataTransfer?.setData('text/plain',id);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';}
  dropRow(e:DragEvent,id:string){
    e.preventDefault();const from=this.draft().rows.findIndex(r=>r.id===this.reorderId);const to=this.draft().rows.findIndex(r=>r.id===id);
    if(from<0||to<0||from===to)return;
    const rows=[...this.draft().rows];const [r]=rows.splice(from,1);rows.splice(to,0,r);this.change({...this.draft(),rows});this.activeDate.set(to);this.reorderId='';
  }
  moveRow(id:string,delta:number){
    const rows=[...this.draft().rows];const i=rows.findIndex(r=>r.id===id);const to=i+delta;if(to<0||to>=rows.length)return;
    [rows[i],rows[to]]=[rows[to],rows[i]];this.change({...this.draft(),rows});this.activeDate.set(to);
  }
  async saveNow():Promise<boolean>{
    clearTimeout(this.timer);
    if(this.savingPromise){await this.savingPromise;if(this.state()==='error')return false;}
    if(this.editVersion===this.savedEditVersion)return true;
    try{cleanInvoice(this.draft());}catch(e){this.state.set('error');this.saveError.set(this.message(e));return false;}
    const run=async()=>{
      try{
        while(this.editVersion!==this.savedEditVersion){
          const version=this.editVersion;const invoice=cleanInvoice(structuredClone(this.draft()));this.state.set('saving');
          const res=await this.request('/api/invoices/'+invoice.id,{method:'PUT',body:JSON.stringify({invoice,revision:this.revision})});
          this.revision=res.revision;this.savedEditVersion=version;
          const item={id:invoice.id,billTo:invoice.billTo,invoiceNo:invoice.invoiceNo,updatedAt:res.updatedAt};
          this.saved.update(s=>[item,...s.filter(i=>i.id!==item.id)]);
        }
        this.state.set('saved');return true;
      }catch(e){this.state.set('error');this.saveError.set(this.message(e));return false;}
    };
    this.savingPromise=run();const result=await this.savingPromise;this.savingPromise=undefined;return result;
  }
  openReset(){this.resetDialog.nativeElement.showModal();}
  async confirmReset(){
    if(this.resetting())return;
    this.resetting.set(true);clearTimeout(this.timer);
    try{
      if(this.savingPromise)await this.savingPromise;
      const current=this.draft();
      this.change({...current,billTo:'',invoiceNo:'',invoiceDate:today(),meethaRate:rateValid(current.meethaRate)?current.meethaRate:MEETHA_PRICE,flavourRate:rateValid(current.flavourRate)?current.flavourRate:FLAVOUR_PRICE,rows:Array.from({length:5},()=>newRow())});
      this.drag.set(null);this.reorderId='';this.focusCell(0,'date');this.fillOpen.set(false);this.fillCount=5;this.fillStep=1;this.clipboardText.set('');this.clipboardError.set('');
      const saved=await this.saveNow();
      this.resetDialog.nativeElement.close();
      this.toast(saved?'Current invoice cleared.':'Entries cleared on this page. Use Save now to retry saving.');
    }finally{this.resetting.set(false);}
  }
  async confirmNew(){
    this.newDialog.nativeElement.close();
    if(!await this.saveNow()){this.toast('Save this invoice before starting another.');return;}
    const used=this.saved().map(i=>i.invoiceNo);const rates=this.draft();let sequence=1;let d=newInvoice(sequence,rates);
    while(used.includes(d.invoiceNo)){d=newInvoice(++sequence,rates);}
    this.draft.set(d);this.revision=0;this.editVersion=0;this.savedEditVersion=0;this.state.set('new');this.focusCell(0,'date');this.fillOpen.set(false);
  }
  openInvoice(){
    const err=invoiceError(this.draft());if(err){this.toast(err);return;}
    this.previewOpen.set(true);this.dialog.nativeElement.showModal();
  }
  closeInvoice(){this.dialog.nativeElement.close();this.previewOpen.set(false);}
  printInvoice(){window.print();}
  async downloadPdf(){
    if(this.pdfBusy())return;
    const err=invoiceError(this.draft());if(err){this.toast(err);return;}
    this.pdfBusy.set(true);
    try{const {downloadInvoice}=await import('./invoice-pdf');await downloadInvoice(structuredClone(this.draft()));this.toast('Invoice PDF downloaded.');}
    catch(e){this.toast('The PDF could not be created. Please try again.');console.error(e);}
    finally{this.pdfBusy.set(false);}
  }
  toast(message:string){this.notice.set(message);clearTimeout(this.noticeTimer);this.noticeTimer=setTimeout(()=>this.notice.set(''),5500);}
  message(e:unknown){return e instanceof Error?e.message:'Something went wrong. Please try again.';}
  private registerTools(){
    const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;
    if(!context?.registerTool)return;
    const tools=[
      {name:'read_paan_invoice',description:'Read the current invoice, delivery quantities and calculated totals.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({invoice:structuredClone(this.draft()),totals:this.summary()})},
      {name:'add_paan_deliveries',description:'Add dated Meetha and Flavour delivery rows to the current invoice and save them.',inputSchema:{type:'object',properties:{deliveries:{type:'array',minItems:1,maxItems:100,items:{type:'object',properties:{date:{type:'string',format:'date'},meetha:{type:'integer',minimum:0,maximum:1000000},flavour:{type:'integer',minimum:0,maximum:1000000}},required:['date','meetha','flavour'],additionalProperties:false}}},required:['deliveries'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{
        const p=input as {deliveries?:Delivery[]};
        if(!p||!Array.isArray(p.deliveries)||p.deliveries.length<1||p.deliveries.length>100)throw new Error('Provide 1–100 deliveries.');
        const rows=p.deliveries.map(r=>newRow(r.date)).map((r,i)=>({...r,meetha:p.deliveries![i].meetha,flavour:p.deliveries![i].flavour}));
        if(rows.some(r=>!validDate(r.date)||(r.meetha===0&&r.flavour===0)))throw new Error('Each delivery needs a valid date and at least one paan.');
        const doc=cleanInvoice({...this.draft(),rows:[...this.draft().rows,...rows]});this.change(doc);
        if(!await this.saveNow())throw new Error(this.saveError());return {added:rows.length,totals:this.summary()};
      }}
    ];
    for(const tool of tools)try{void Promise.resolve(context.registerTool(tool,{signal:this.lifecycle.signal})).catch(()=>{});}catch{}
  }
}
