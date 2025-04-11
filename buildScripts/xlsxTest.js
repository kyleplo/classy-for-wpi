import { readFileSync } from 'fs'
import exceljs from 'exceljs';
var workbook = new exceljs.Workbook();

const sheet = await workbook.xlsx.load(readFileSync(`./buildScripts/View_My_Courses.xlsx`));

console.log(sheet.worksheets[0].name);
var headers = []

function parseClassCode(code, year) {
  const parsed = /([A-Z]{2,} ?[0-9]{3,}X?)-([A-Z][A-Za-z-0-9]*)/g.exec(code.toUpperCase());
  if(!parsed || parsed.length !== 3){
    return;
  }
  const course = {
    course: parsed[1].replace(" ", ""),
    section: parsed[2]
  };
  return course;
}

for (var i = 0; i < sheet.worksheets[0].rowCount; i++){
  const row = sheet.worksheets[0].getRow(i);
      if(!Array.isArray(row.values)){
        continue;
      }

      if (row.values.includes("Registration Status") && row.values.includes("Section") && row.values.includes("Start Date")) {
        headers = row.values;
      }

      if(headers.length && (row.values[headers.indexOf("Registration Status")] === "Registered" || row.values[headers.indexOf("Registration Status")] === "Completed") && row.values[headers.indexOf("Section")] && row.values[headers.indexOf("Start Date")]){
        try {
          const year = new Date(row.values[headers.indexOf("Start Date")]).getFullYear().toString();
          const section = parseClassCode(row.values[headers.indexOf("Section")], year);

          if(!section){
            break;
          }
          console.log(section.course, section.section, year);
        } catch (_) {}
      }
    };