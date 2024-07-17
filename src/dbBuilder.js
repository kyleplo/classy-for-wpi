import { parseString } from "xml2js";
import { writeFile } from "fs";

const classes = {};

parseString(await fetch("https://planner.wpi.edu/new.schedb").then(r => r.text()), (err, data) => {
  data.schedb.dept.forEach(dept => {
    if(!dept.course){
      return;
    }

    dept.course.forEach(course => {
      const thisClass = {
        name: course.$.name,
        sections: []
      }

      if(!course.section){
        return;
      }

      course.section.forEach(section => {
        section.$.number.split("/").forEach(section => {
          const sectionId = section.split(" - ")[0];
          
          if(!thisClass.sections.includes(sectionId)){
            thisClass.sections.push(sectionId);
          }
        });
      });
      classes[dept.$.abbrev + course.$.number] = thisClass;
    });
  });

  writeFile("./src/db.ts", "export const classes: {[classId: string]: {name: string, sections: string[]}} = " + JSON.stringify(classes), () => {});
});