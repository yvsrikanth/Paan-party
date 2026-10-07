import { Delivery, newRow, quantityValid, validDate } from './model';

export type LedgerColumn = 'date'|'meetha'|'flavour';
const columns: LedgerColumn[] = ['date','meetha','flavour'];
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

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
  if(!validDate(date))throw new Error('Use a valid date, such as 10/02/2026 or 2026-10-02.');
  return date;
}

export function excelDate(value: string): string {
  const s=value.trim();if(!s)return '';
  if(validDate(s))return s;
  let match=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if(match){let year=Number(match[3]);if(year<100)year+=year<70?2000:1900;return dateParts(year,Number(match[1]),Number(match[2]));}
  match=s.match(/^(\d{1,2})[\s-]([a-z]{3,9})[\s-](\d{2}|\d{4})$/i);
  if(match){let year=Number(match[3]);if(year<100)year+=year<70?2000:1900;return dateParts(year,months.indexOf(match[2].slice(0,3).toLowerCase())+1,Number(match[1]));}
  match=s.match(/^([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i);
  if(match)return dateParts(Number(match[3]),months.indexOf(match[1].slice(0,3).toLowerCase())+1,Number(match[2]));
  if(/^\d+$/.test(s)){
    const serial=Number(s);
    if(serial>=1&&serial<=2958465&&serial!==60){
      const d=new Date(Date.UTC(1899,11,30)+(serial+(serial<60?1:0))*86400000);
      return dateParts(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());
    }
  }
  throw new Error('Use dates like 10/02/2026, 2026-10-02 or 02-Oct-26.');
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
  return column==='date'?/^(delivery )?date$/.test(s):column==='meetha'?/^meeth?a( quantity)?$/.test(s):/^flavou?r( quantity)?$/.test(s);
}

export function pasteLedgerCells(rows: Delivery[],start: number,column: LedgerColumn,text: string) {
  const offset=columns.indexOf(column);
  if(!Number.isInteger(start)||start<0||start>=rows.length||offset<0)throw new Error('Select a delivery cell first.');
  const cells=clipboardTable(text);
  if(cells[0].length<=3-offset&&cells[0].every((c,i)=>isHeader(c,columns[offset+i])))cells.shift();
  if(!cells.length)throw new Error('The copied range has headings but no delivery cells.');
  if(start+cells.length>500)throw new Error('An invoice can contain up to 500 delivery rows.');
  const width=cells[0].length;
  if(width>3-offset)throw new Error(`Paste only ${3-offset} column${3-offset===1?'':'s'} starting at ${column==='date'?'Date':column==='meetha'?'Meetha':'Flavour'}. Column order is Date, Meetha, Flavour.`);
  if(cells.some(row=>row.length!==width))throw new Error('Copy a rectangular range of Excel cells.');
  const result=rows.map(row=>({...row}));let cellCount=0;
  for(let i=0;i<cells.length;i++){
    const rowIndex=start+i;
    if(!result[rowIndex])result.push(newRow());
    for(let j=0;j<width;j++){
      const key=columns[offset+j];
      try{
        if(key==='date')result[rowIndex].date=excelDate(cells[i][j]);
        else result[rowIndex][key]=excelQuantity(cells[i][j]);
        cellCount++;
      }catch(e){throw new Error(`Row ${rowIndex+1}, ${key==='date'?'Date':key==='meetha'?'Meetha':'Flavour'}: ${e instanceof Error?e.message:'invalid cell.'}`);}
    }
  }
  return {rows:result,cellCount,rowCount:cells.length};
}

export function copyLedgerCells(rows: Delivery[]): string {
  const entries=[...rows];while(entries.length&&!entries.at(-1)!.date&&!entries.at(-1)!.meetha&&!entries.at(-1)!.flavour)entries.pop();
  for(const row of entries)if((row.date&&!validDate(row.date))||!quantityValid(row.meetha)||!quantityValid(row.flavour))throw new Error('Correct invalid cells before copying entries.');
  return ['Delivery date\tMeetha\tFlavour',...entries.map(row=>`${row.date}\t${row.meetha}\t${row.flavour}`)].join('\r\n');
}
