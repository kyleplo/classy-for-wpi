import { parseString } from "xml2js";
import { readFileSync, writeFile } from "fs";

const classes = {};

function parseTime(time){
  const hour = parseInt(time);
  const minute = parseInt(time.split(":")[1]);
  return ((time.endsWith("PM") && hour !== 12) || (time.endsWith("AM") && hour === 12) ? 720 : 0) + hour * 60 + minute;
}

parseString(await fetch("https://planner.wpi.edu/new.schedb").then(r => r.text()), (err, data) => {
  data.schedb.dept.forEach(dept => {
    if(!dept.course){
      return;
    }

    dept.course.forEach(course => {
      const thisClass = {
        name: course.$.name,
        sections: {}
      }

      if(!course.section){
        return;
      }

      course.section.forEach(section => {
        section.period.forEach(period => {
          thisClass.sections[period.$.section.split(" ")[0]] = {
            days: period.$.days.split(",").map(day => ["mon", "tue", "wed", "thu", "fri"].indexOf(day)),
            starts: parseTime(period.$.starts),
            ends: parseTime(period.$.ends),
            type: period.$.type,
            room: period.$.room
          };
        });
      });
      classes[dept.$.abbrev + course.$.number] = thisClass;
    });
  });

  writeFile("./src/db.ts", "export const classes: {[classId: string]: {name: string, sections: {[sectionId: string]: {days: number[], starts: number, ends: number, type: string, room: string}}}} = " + JSON.stringify(classes), () => {});
});