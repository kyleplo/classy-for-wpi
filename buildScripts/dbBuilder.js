import { writeFile } from "fs";

const classes = {};
const terms = {
  A: {
    starts: Infinity,
    ends: 0,
    partOf: "Fall"
  },
  B: {
    starts: Infinity,
    ends: 0,
    partOf: "Fall"
  },
  C: {
    starts: Infinity,
    ends: 0,
    partOf: "Spring"
  },
  D: {
    starts: Infinity,
    ends: 0,
    partOf: "Spring"
  },
  E1: {
    starts: Infinity,
    ends: 0,
    partOf: "Summer"
  },
  E2: {
    starts: Infinity,
    ends: 0,
    partOf: "Summer"
  },
  Spring: {
    starts: Infinity,
    ends: 0,
    partOf: "none"
  },
  Fall: {
    starts: Infinity,
    ends: 0,
    partOf: "none"
  },
  Summer: {
    starts: Infinity,
    ends: 0,
    partOf: "none"
  }
};
const weekdays = "MTWRF";
const year = new Date().getFullYear();

function parseTime(time){
  if(!time){
    return;
  }

  const hour = parseInt(time);
  const minute = parseInt(time.split(":")[1]);
  return ((time.endsWith("PM") && hour !== 12) || (time.endsWith("AM") && hour === 12) ? 720 : 0) + hour * 60 + minute;
}

const listing = await fetch("https://courselistings.wpi.edu/assets/prod-data-raw.json").then(r => r.json());

listing["Report_Entry"].forEach(entry => {
  if(parseInt(entry["Offering_Period"]) < year){
    return;
  }

  const classId = entry["Course_Section"].split("-")[0].replace(" ", "");
  const sectionId = entry["Course_Section"].split(" - ")[0].split("-")[1].split(" ")[0].trimEnd();

  if(!classes[classId]){
    classes[classId] = {
      name: entry["Course_Title"].split(" - ")[1] || classId,
      sections: {}
    }
  }

  var term = entry["Starting_Academic_Period_Type"].split(" ")[0];
  if(terms[entry["Starting_Academic_Period_Type"]]){
    term = entry["Starting_Academic_Period_Type"];
  }

  const starts = new Date(entry["Course_Section_Start_Date"]).getTime();
  const ends = new Date(entry["Course_Section_End_Date"]).getTime();

  if(terms[term]){
    if(starts < terms[term].starts){
      terms[term].starts = starts
    }
    if(ends > terms[term].ends){
      terms[term].ends = ends
    }
  }else{
    term = undefined;
  }

  classes[classId].sections[sectionId] = {
    days: entry["Meeting_Day_Patterns"]?.split("").map(d => weekdays.indexOf(d)).filter(d => d > -1) || [],
    starts: parseTime(entry["Meeting_Patterns"]?.split(" | ")[1].split(" - ")[0]),
    ends: parseTime(entry["Meeting_Patterns"]?.split(" | ")[1].split(" - ")[1]),
    type: entry["Instructional_Format"],
    room: entry["Locations"],
    term: term
  }
});

Object.values(terms).forEach(term => {
  term.ends += 8.64e+7;
  term.startDate = new Date(term.starts).toDateString();
  term.endDate = new Date(term.ends).toDateString()
})

writeFile("./src/db.ts", `
  export const classes: {[classId: string]: {name: string, sections: {[sectionId: string]: {days: number[], starts?: number, ends?: number, type: string, room?: string, term?: string}}}} = ${JSON.stringify(classes)};
  export const terms: {[term: string]: {starts: number, ends: number, startDate: string, endDate: string, partOf: string}} = ${JSON.stringify(terms)};
  `, () => {});