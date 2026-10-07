import { jsPDF } from 'jspdf';
import { Invoice, totals, rowAmount, validDate, invoiceError } from './model';
const teal:[number,number,number]=[77,140,139];
const dark:[number,number,number]=[49,95,98];
const pale:[number,number,number]=[215,234,234];
const text:[number,number,number]=[47,66,71];
const currency=(v:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v);
const count=(v:number)=>new Intl.NumberFormat('en-US').format(v);
const date=(s:string)=>validDate(s)?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')):s;
export interface PdfFonts {regular:string;bold:string;italic:string;}
export function createInvoicePdf(invoice:Invoice,logo:string,fonts:PdfFonts):jsPDF {
  const error=invoiceError(invoice);if(error)throw new Error(error);
  const doc=new jsPDF({unit:'mm',format:'a4'});const s=totals(invoice.rows,invoice);const margin=20;
  for(const [file,style,data] of [['PaanSans.ttf','normal',fonts.regular],['PaanSans-Bold.ttf','bold',fonts.bold],['PaanSans-Oblique.ttf','italic',fonts.italic]]){
    doc.addFileToVFS(file,data);doc.addFont(file,'helvetica',style);
  }
  doc.setProperties({title:`Paan Party Invoice ${invoice.invoiceNo}`,subject:`Invoice for ${invoice.billTo}`,author:'Paan Party LLC',creator:'Paan Party'});
  doc.addImage(logo,'PNG',23,24,25,25);
  doc.setFont('helvetica','bold');doc.setFontSize(30);doc.setTextColor(...teal);doc.text('Invoice',190,39,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(158,148,153);
  const address=doc.splitTextToSize(`Paan Party LLC | ${invoice.address}`,126);doc.text(address,190,47,{align:'right'});
  let y=Math.max(59,49+(address.length-1)*4);
  doc.setDrawColor(...teal);doc.setLineWidth(.7);doc.line(margin,y,190,y);y+=6;
  doc.setDrawColor(177,161,166);doc.setLineWidth(.2);doc.line(margin,y,190,y);y+=4;
  const billLines=doc.splitTextToSize(invoice.billTo,75);const noLines=doc.splitTextToSize(invoice.invoiceNo,42);const blockHeight=Math.max(18,11+billLines.length*4,11+noLines.length*4);
  doc.setFillColor(...pale);doc.rect(margin,y,85,blockHeight,'F');doc.setTextColor(...dark);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('BILL TO',margin+4,y+6);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...text);doc.text(billLines,margin+4,y+11);
  doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(...dark);doc.text('INVOICE #',108,y+6);doc.text('INVOICE DATE',108,y+blockHeight-4);
  doc.setDrawColor(185,170,174);doc.line(148,y,148,y+blockHeight);doc.setFont('helvetica','normal');doc.setTextColor(...text);doc.text(noLines,151,y+6);doc.text(date(invoice.invoiceDate),151,y+blockHeight-4);
  y+=blockHeight+8;
  const cell=(label:string,x:number,cy:number,cw:number,ch:number,fill:[number,number,number]|null,color:[number,number,number],bold=false,right=false)=>{
    if(fill){doc.setFillColor(...fill);doc.rect(x,cy,cw,ch,'F');}doc.setDrawColor(195,214,215);doc.setLineWidth(.2);doc.rect(x,cy,cw,ch);
    doc.setFont('helvetica',bold?'bold':'normal');doc.setTextColor(...color);doc.text(label,right?x+cw-3:x+3,cy+ch/2+1.3,{align:right?'right':'left'});
  };
  doc.setFontSize(8);cell('DESCRIPTION',20,y,132,8,dark,[255,255,255],true);cell('AMOUNT',152,y,38,8,dark,[255,255,255],true,true);y+=8;
  doc.setFontSize(9);
  if(s.meetha){cell(`${count(s.meetha)} Meetha Paans @ ${currency(invoice.meethaRate)} each`,20,y,132,9,null,text);cell(currency(s.meethaAmount),152,y,38,9,null,text,false,true);y+=9;}
  if(s.flavour){cell(`${count(s.flavour)} Flavour Paans @ ${currency(invoice.flavourRate)} each`,20,y,132,9,null,text);cell(currency(s.flavourAmount),152,y,38,9,null,text,false,true);y+=9;}
  cell('Total',20,y,132,9,pale,dark,true);cell(currency(s.grandTotal),152,y,38,9,pale,dark,true,true);y+=27;
  const detailHeader=()=>{
    doc.setFont('helvetica','bold');doc.setTextColor(...dark);doc.setFontSize(9);doc.text('Delivery details:',20,y);y+=3;
    doc.setFontSize(8);cell('Date',20,y,50,9,teal,[255,255,255],true);cell('Meetha quantity',70,y,42,9,teal,[255,255,255],true,true);cell('Flavour quantity',112,y,42,9,teal,[255,255,255],true,true);cell('Amount',154,y,36,9,teal,[255,255,255],true,true);y+=9;
  };
  if(y>240){doc.addPage();y=24;}detailHeader();
  for(const row of invoice.rows.filter(r=>r.meetha>0||r.flavour>0)){
    if(y+8>263){doc.addPage();y=24;doc.setFontSize(8);doc.setTextColor(...teal);doc.text(`Paan Party · Invoice ${invoice.invoiceNo}`,20,16);detailHeader();}
    doc.setFontSize(8);cell(date(row.date),20,y,50,8,null,text);cell(count(row.meetha),70,y,42,8,null,text,false,true);cell(count(row.flavour),112,y,42,8,null,text,false,true);cell(currency(rowAmount(row,invoice)),154,y,36,8,null,text,false,true);y+=8;
  }
  if(y+8>263){doc.addPage();y=24;detailHeader();}
  const mauve:[number,number,number]=[169,155,159];
  cell('Total',20,y,50,8,mauve,[255,255,255],true);cell(count(s.meetha),70,y,42,8,mauve,[255,255,255],true,true);cell(count(s.flavour),112,y,42,8,mauve,[255,255,255],true,true);cell(currency(s.grandTotal),154,y,36,8,mauve,[255,255,255],true,true);y+=18;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);
  const paymentLines=doc.splitTextToSize('For cheque pay to PAAN PARTY LLC or Zelle to paanparty.atl@gmail.com',170);
  const footerHeight=21+(paymentLines.length-1)*4;
  if(y+footerHeight>271){doc.addPage();y=24;}
  doc.setDrawColor(177,161,166);doc.line(20,y,190,y);doc.setTextColor(...teal);doc.setFontSize(9);doc.setFont('helvetica','italic');doc.text('Thank You,',20,y+6);doc.setFont('helvetica','bold');doc.text('Paan Party',20,y+12);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...dark);doc.text(paymentLines,20,y+20,{lineHeightFactor:1.33});
  const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(150,164,164);doc.text('All amounts in USD',20,284);doc.text(`${i} / ${pages}`,190,284,{align:'right'});}
  return doc;
}
export async function downloadInvoice(invoice:Invoice){
  const res=await fetch('/paan-party-logo.png');if(!res.ok)throw new Error('Logo unavailable.');const blob=await res.blob();
  const logo=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob);});
  const fontData=await Promise.all(['PaanSans.ttf','PaanSans-Bold.ttf','PaanSans-Oblique.ttf'].map(async name=>{
    const res=await fetch('/fonts/'+name);if(!res.ok)throw new Error('Invoice font unavailable.');const blob=await res.blob();
    return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(blob);});
  }));
  const pdf=createInvoicePdf(invoice,logo,{regular:fontData[0],bold:fontData[1],italic:fontData[2]});const name=invoice.invoiceNo.replace(/[^a-z0-9_-]/gi,'-').slice(0,80)||'invoice';pdf.save(`Paan-Party-Invoice-${name}.pdf`);
}
