import { Delivery, newRow, quantityValid, validDate } from './model';

export type LedgerColumn = 'date'|'meetha'|'flavour';
export type ExcelDateOrder = 'auto'|'mdy'|'dmy';
const columns: LedgerColumn[] = ['date','meetha','flavour'];
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const numericDate=/^(\d{1,2})([\/.-])(\d{1,2})\2(\d{2}|\d{4})$/;

function clipboardTable(text: string): string[][] {
  if(text.length>150000)throw new Error('Paste up to 500 rows at a time.');
  const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else if(quoted||cell==='')quoted=!quoted;
      else cell+=c;
    }else if(!quoted&&(c==='\t'||c==='\n'||c==='\r')){
      row.push(cell);cell='';
      if(c!=='\t'){rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    }else cell+=c;
  }
  if(quoted)throw new Error('The copied cells contain an unfinished quote. Copy the Excel range again.');
  row.push(cell);rows.push(row);
  while(rows.length&&rows.at(-1)!.every(v=>!v.trim()))rows.pop();
  if(!rows.length)throw new Error('Copy some Excel cells first.');
  return rows;
}

function dateParts(year: number, month: number, day: number): string {
  const date=`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if(!validDate(date))throw new Error('Use a valid calendar date, such as 02-Apr-2026.');
  return date;
}

function dateText(value: string, validateTime=true): string {
  let s=value.replace(/[\u00a0\u202f]/g,' ').replace(/[\u2010-\u2014]/g,'-').trim();
  s=s.replace(/^(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*,?\s+/i,'');
  const time=s.match(/^(.*?)(?:T|\s+)(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:\s*([ap]m))?Z?$/i);
  if(time){
    const hour=Number(time[2]);
    if(validateTime&&(hour<(time[5]?1:0)||hour>(time[5]?12:23)||Number(time[3])>59||Number(time[4]??0)>59))throw new Error('Use a valid date and time.');
    s=time[1].trim();
  }
  return s;
}

function resolveDateOrder(values: string[], requested: ExcelDateOrder): 'mdy'|'dmy' {
  if(!['auto','mdy','dmy'].includes(requested))throw new Error('Choose an Excel date order.');
  if(requested!=='auto')return requested;
  let detected:'mdy'|'dmy'|undefined;
  for(const value of values){
    const match=dateText(value,false).match(numericDate);if(!match)continue;
    const first=Number(match[1]);const second=Number(match[3]);
    const hint=first>12&&second>=1&&second<=12?'dmy':second>12&&first>=1&&first<=12?'mdy':undefined;
    if(hint&&detected&&hint!==detected)throw new Error('The copied dates mix day/month and month/day. Choose one Excel date order or use dates like 02-Apr-2026.');
    if(hint)detected=hint;
  }
  return detected??'mdy';
}

function excelYear(value: string): number {
  const year=Number(value);return value.length===2?year+(year<70?2000:1900):year;
}

function monthNumber(value: string): number {
  const name=value.toLowerCase();return name==='sept'?9:months.findIndex(month=>name===month||name===month.slice(0,3))+1;
}

export function excelDate(value: string, dateOrder: ExcelDateOrder='auto'): string {
  const s=dateText(value);if(!s)return '';
  if(validDate(s))return s;
  let match=s.match(/^(\d{4})([\/.-])(\d{1,2})\2(\d{1,2})$/);
  if(match)return dateParts(Number(match[1]),Number(match[3]),Number(match[4]));
  match=s.match(numericDate);
  if(match){const order=resolveDateOrder([s],dateOrder);return dateParts(excelYear(match[4]),Number(match[order==='mdy'?1:3]),Number(match[order==='mdy'?3:1]));}
  match=s.match(/^(\d{1,2})[\s\/.-]+([a-z]{3,9})[\s\/.-]+(\d{2}|\d{4})$/i);
  if(match)return dateParts(excelYear(match[3]),monthNumber(match[2]),Number(match[1]));
  match=s.match(/^([a-z]{3,9})[\s\/.-]+(\d{1,2}),?[\s\/.-]+(\d{2}|\d{4})$/i);
  if(match)return dateParts(excelYear(match[3]),monthNumber(match[1]),Number(match[2]));
  if(/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s)){
    const serial=Math.floor(Number(s.replaceAll(',','')));
    if(serial>=1&&serial<=2958465&&serial!==60){
      const d=new Date(Date.UTC(1899,11,30)+(serial+(serial<60?1:0))*86400000);
      return dateParts(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
    }
  }
  throw new Error('Use dates like 02-Apr-2026 or 2026-04-02, or choose the matching Excel date order for numeric dates.');
}

function excelQuantity(value: string): number {
  const s=value.trim();if(!s)return 0;
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.0+)?$/.test(s))throw new Error('Enter a whole quantity from 0 to 1,000,000.');
  const number=Number(s.replaceAll(',',''));
  if(!quantityValid(number))throw new Error('Enter a whole quantity from 0 to 1,000,000.');
  return number;
}

function isHeader(value: string,column: LedgerColumn): boolean {
  const s=value.trim().toLowerCase().replace(/\s+/g,' ');
  return column==='date'?/^(delivery )?date$/.test(s):column==='meetha'?/^(?:meeta|meetha|meeth)( quantity)?$/.test(s):/^flavou?r( quantity)?$/.test(s);
}

export function pasteLedgerCells(rows: Delivery[],start: number,column: LedgerColumn,text: string,dateOrder: ExcelDateOrder='auto') {
  const offset=columns.indexOf(column);
  if(!Number.isInteger(start)||start<0||start>=rows.length||offset<0)throw new Error('Select a delivery cell first.');
  const cells=clipboardTable(text);
  if(cells[0].length<=3-offset&&cells[0].every((c,i)=>isHeader(c,columns[offset+i])))cells.shift();
  if(!cells.length)throw new Error('The copied range has headings but no delivery cells.');
  if(start+cells.length>500)throw new Error('An invoice can contain up to 500 delivery rows.');
  const width=cells[0].length;
  if(width>3-offset)throw new Error(`Paste only ${3-offset} column${3-offset===1?'':'s'} starting at ${column==='date'?'Date':column==='meetha'?'Meetha':'Flavour'}. Column order is Date, Meetha, Flavour.`);
  if(cells.some(row=>row.length!==width))throw new Error('Copy a rectangular range of Excel cells.');
  const resolvedOrder=resolveDateOrder(offset===0?cells.map(row=>row[0]):[],dateOrder);
  const result=rows.map(row=>({...row}));let cellCount=0;
  for(let i=0;i<cells.length;i++){
    const rowIndex=start+i;
    if(!result[rowIndex])result.push(newRow());
    for(let j=0;j<width;j++){
      const key=columns[offset+j];
      try{
        if(key==='date')result[rowIndex].date=excelDate(cells[i][j],resolvedOrder);
        else result[rowIndex][key]=excelQuantity(cells[i][j]);
        cellCount++;
      }catch(e){throw new Error(`Row ${rowIndex+1}, ${key==='date'?'Date':key==='meetha'?'Meetha':'Flavour'}: ${e instanceof Error?e.message:'invalid cell.'}`);}
    }
  }
  return {rows:result,cellCount,rowCount:cells.length,dateOrder:resolvedOrder};
}

export function copyLedgerCells(rows: Delivery[]): string {
  const entries=[...rows];while(entries.length&&!entries.at(-1)!.date&&!entries.at(-1)!.meetha&&!entries.at(-1)!.flavour)entries.pop();
  for(const row of entries)if((row.date&&!validDate(row.date))||!quantityValid(row.meetha)||!quantityValid(row.flavour))throw new Error('Correct invalid cells before copying entries.');
  return ['Delivery date\tMeetha\tFlavour',...entries.map(row=>`${row.date}\t${row.meetha}\t${row.flavour}`)].join('\r\n');
}
