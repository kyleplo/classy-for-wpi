import { writeFile } from "fs";

function parseClassCode(code) {
	const parsed = /([A-Z]{2,} ?[0-9]{3,}X?)-([A-Z][A-Za-z-0-9]*)/g.exec(code.toUpperCase());
	if(!parsed || parsed.length !== 3){
		return;
	}
	return  {
		course: parsed[1].replace(" ", ""),
		section: parsed[2]
	};
}

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
  const starts = new Date(entry["Course_Section_Start_Date"]).getTime();
  const ends = new Date(entry["Course_Section_End_Date"]).getTime();

  if(starts < Date.now() - 7.889399e+9 || ends > Date.now() + 2.36682e+10){
    return;
  }

  const section = parseClassCode(entry["Course_Section"]);

  if(!section) {
    console.log("Failed to parse course code: " + entry["Course_Section"]);
  }

  if(!classes[section.course]){
    classes[section.course] = {
      name: entry["Course_Title"].split(" - ")[1] || section.course,
      sections: {}
    }
  }

  var term = entry["Starting_Academic_Period_Type"].split(" ")[0];
  if(terms[entry["Starting_Academic_Period_Type"]]){
    term = entry["Starting_Academic_Period_Type"];
  }

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

  classes[section.course].sections[section.section] = {
    days: entry["Meeting_Day_Patterns"]?.split("").map(d => weekdays.indexOf(d)).filter(d => d > -1) || [],
    starts: parseTime(entry["Meeting_Patterns"]?.split(" | ")[1].split(" - ")[0]),
    ends: parseTime(entry["Meeting_Patterns"]?.split(" | ")[1].split(" - ")[1]),
    type: entry["Instructional_Format"],
    room: entry["Locations"],
    instructors: entry["Instructors"]?.split("; ") || [],
    term: term
  }
});

Object.values(terms).forEach(term => {
  if(!isFinite(term.starts)){
    term.starts = 0;
  }
  term.ends += 8.64e+7;
  term.startDate = new Date(term.starts).toDateString();
  term.endDate = new Date(term.ends).toDateString()
})

writeFile("./src/db.ts", `
  export const dorms: {[dormId: string]: {name: string}} = {"daniels":{name:"Daniels Hall"},"east":{name:"East Hall"},"faraday":{name:"Faraday Hall"},"founders":{name:"Founders Hall"},"institute":{name:"Institute Hall"},"messenger":{name:"Messenger Hall"},"morgan":{name:"Morgan Hall"},"sanford-riley":{name:"Sanford Riley Hall"},"stoddard":{name:"Stoddard Complex"},"townhouses":{name:"WPI Townhouses"},"ellsworth":{name:"Ellsworth Apartments"},"fuller":{name:"Fuller Apartments"},"cedar":{name:"Cedar Houses"},"elbridge":{name:"Elbridge House"},"fruit":{name:"Fruit House"},"hackfeld":{name:"Hackfeld House"},"marston":{name:"Marston Houses"},"oak":{name:"Oak House"},"schussler":{name:"Schussler House"},"sever":{name:"Sever House"},"trowbridge":{name:"Trowbridge House"},"wachusett":{name:"Wachusett House"},"west":{name:"West House"},"william":{name:"William House"},"off-campus":{name:"Off Campus"}};
  export const classes: {[classId: string]: {name: string, sections: {[sectionId: string]: {days: number[], starts?: number, ends?: number, type: string, room?: string, term?: string, instructors: string[]}}}} = ${JSON.stringify(classes)};
  export const terms: {[term: string]: {starts: number, ends: number, startDate: string, endDate: string, partOf: string}} = ${JSON.stringify(terms)};
  `, () => {});