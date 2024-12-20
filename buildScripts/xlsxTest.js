import { readFileSync } from 'fs'
import exceljs from 'exceljs';
var workbook = new exceljs.Workbook();

const sheet = await workbook.xlsx.load(readFileSync(`./buildScripts/test-enrolled.xlsx`));
if(sheet.worksheets.length !== 1 || (sheet.worksheets[0].name !== "View My Courses" && sheet.worksheets[0].name !== "Sheet1")){
  throw "failed to parse"
}

sheet.worksheets[0].eachRow(row => {
  if(!Array.isArray(row.values)){
    return;
  }
  if(row.values[9] === "Registered" && row.values[5]){
    const section = row.values[5].toString().replace(" ", "").split(" ")[0].split("-");

    console.log(section)
  }
});