import { InteractionResponseType } from "discord-interactions";
import { ClassRow, Writer, JsonResponse, currentTerm, displayTerm, academicYearFromTerm } from "../util";
import { make, encodePNGToStream, registerFont, Context, Bitmap } from "pureimage/dist/index.js";
import { classes, terms } from "../db";

export async function scheduleCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  const term = options.get("term") || currentTerm();

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: `${options.has("userName") ? options.get("userName") + "'s s" : "S"}chedule for ${displayTerm(term)}`,
        image: {
          url: `${env.BOT_LINK}/schedule.png?userId=${options.get("user") || userId}&term=${term}&v=${Date.now()}`
        },
        url: `${env.BOT_LINK}/schedule?userId=${options.get("user") || userId}&term=${term}`
      }]
    }
  });
}

export async function generateScheduleResponse(env: Env, ctx: ExecutionContext, userId: string | null, term: string | null, version: string | null) {
  if(!userId || !term || !terms[term]){
    return new Response('Bad request.', { status: 400 });
  }

  const cachedImage = await caches.default.match(`${env.BOT_LINK}/schedule?userId=${userId}&term=${term}&v=${version}`);
  if(cachedImage){
    return cachedImage;
  }

  const sections = await env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ? AND (term = ? OR term = ?)").bind(userId, term, terms[term].partOf).all<ClassRow>();

  const scheduleImage = new Response(await generateScheduleImage(term, sections.results), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=604800, immutable'
    }
  });

  if(version){
    ctx.waitUntil(caches.default.put(`${env.BOT_LINK}/schedule?userId=${userId}&term=${term}&v=${version}`, scheduleImage.clone()));
  }

  scheduleImage.headers.append("last-modified", new Date().toUTCString());
  return scheduleImage;
}

export async function generateSchedulePageResponse(env: Env, ctx: ExecutionContext, userId: string | null, term: string | null) {
  if(!userId || !term || !terms[term]){
    return new Response('Bad request.', { status: 400 });
  }

  const sections = await env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ? AND (term = ? OR term = ?)").bind(userId, term, terms[term].partOf).all<ClassRow>();

  return generateSchedulePage(term, sections.results);
}

const colors = ["rgb(172, 114, 94)", "rgb(250, 87, 60)", "rgb(255, 173, 70)",
			"rgb(66, 214, 146)", "rgb(123, 209, 72)", "rgb(154, 156, 255)",
			"rgb(179, 220, 108)", "rgb(202, 189, 191)",
			"rgb(251, 233, 131)", "rgb(205, 116, 230)", "rgb(194, 194, 194)",
			"rgb(159, 225, 231)", "rgb(246, 145, 178)", "#92E1C0",
			"rgb(251, 233, 131)", "#7BD148", "rgb(159, 198, 231)"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function ellipsis(ctx: Context, text: string, width: number): string {
  if(ctx.measureText(text).width <= width){
    return text;
  }
  
  var len = text.length - 1;
  while(len > 0 && ctx.measureText(text.slice(0, len) + "...").width > width){
    len--;
  }
  return text.slice(0, len) + "...";
}

var image: Bitmap, ctx: Context;

function prepareSchedule(schedule: ClassRow[], term: string){
  var earliest = 1290;
  var latest = 360;
  var classColors: {[classId: string]: string} = {};
  var usedColors = 0;

  schedule.forEach(value => {
    const section = classes[value.classId].years[academicYearFromTerm(term)][value.sectionId];

    if(!section.starts || !section.ends){
      return;
    }
    
    if(section.starts < earliest){
      earliest = section.starts;
    }
    if(section.ends > latest){
      latest = section.ends;
    }
    if(!classColors[value.classId]){
      classColors[value.classId] = colors[usedColors++] || "#ffffff";
    }
  });

  return { earliest, latest, classColors }
}

async function generateScheduleImage(term: string, schedule: ClassRow[]): Promise<ReadableStream> {
  const { earliest, latest, classColors } = prepareSchedule(schedule, term);
  const pxPerMin = 575 / (latest - earliest);
  
  if(!image || !ctx){
    image = make(800, 600);
    ctx = image.getContext("2d");

    const font = registerFont("", "font");
    await font.load();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "14px font";
  console.time("setup")
  ctx.fillText(displayTerm(term, false), 5, 15);
  console.timeEnd("setup")
  for(var i = 0;i < 5;i++){
    ctx.fillRect(50 + i * 150, 0, 1, 600);
    ctx.fillText(daysOfWeek[i], 55 + i * 150, 15);
  }

  ctx.fillRect(0, 25, 800, 1);

  for(var h = Math.ceil(earliest / 60);h < Math.ceil(latest / 60);h++){
    ctx.fillRect(0, 25 + pxPerMin * ((h * 60) - earliest), 800, 1);
    ctx.fillText((h > 12 ? h - 12 : h) + (h > 11 ? "PM" : "AM"), 5, 40 + pxPerMin * ((h * 60) - earliest))
  }

  schedule.forEach(value => {
    const section = classes[value.classId.toUpperCase()].years[academicYearFromTerm(term)][value.sectionId.toUpperCase()];

    if(!section.days){
      return;
    }

    section.days.forEach(day => {
      if(!section.starts || !section.ends || !section.room){
        return;
      }

      const sectionX = 55 + day * 150;
      const sectionY = pxPerMin * (section.starts - earliest) + 30;
      const sectionHeight = pxPerMin * (section.ends - section.starts);

      ctx.fillStyle = classColors[value.classId];
      ctx.fillRect(sectionX - 4, sectionY - 4, 149, 5);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(ellipsis(ctx, value.classId.toUpperCase() + "-" + value.sectionId.toUpperCase(), 140), sectionX, 15 + sectionY);
      if(sectionHeight > 35){
        ctx.fillText(ellipsis(ctx, classes[value.classId].name, 140), sectionX, 30 + sectionY);
      }
      if(sectionHeight > 50){
        ctx.fillText(ellipsis(ctx, section.room, 140), sectionX, 45 + sectionY);
      }
      if(sectionHeight > 65){
        ctx.fillText(ellipsis(ctx, section.type, 140), sectionX, 60 + sectionY);
      }
    });
  });

  const { readable, writable } = new TransformStream();
  await encodePNGToStream(image, new Writer(writable) as any);
  return readable;
}

async function generateSchedulePage(term: string, schedule: ClassRow[]): Promise<Response> {
  const { earliest, latest, classColors } = prepareSchedule(schedule, term);

  const hours: {
    hour: number,
    classes: (null | {
      classId: string,
      id: string,
      name: string,
      type: string,
      room: string,
      start: number,
      length: number,
      instructors: string[]
    })[]
  }[] = [];
  for(var h = Math.ceil(earliest / 60);h < Math.ceil(latest / 60);h++){
    hours.push({
      hour: h,
      classes: [null, null, null, null, null]
    });
  }

  schedule.forEach(value => {
    const section = classes[value.classId.toUpperCase()].years[academicYearFromTerm(term)][value.sectionId.toUpperCase()];

    if(!section.days){
      return;
    }

    section.days.forEach(day => {
      if(!section.starts || !section.ends || !section.room){
        return;
      }

      for(var h = Math.floor((section.starts - earliest) / 60);h * 60 <= section.ends - earliest;h++){
        hours[h].classes[day] = {
          classId: value.classId,
          id: value.classId.toUpperCase() + "-" + value.sectionId.toUpperCase(),
          name: classes[value.classId.toUpperCase()].name,
          type: section.type,
          room: section.room,
          start: Math.floor(section.starts / 60),
          length: Math.ceil((section.ends - section.starts) / 60),
          instructors: section.instructors
        };
      }
    });
  });
  
  return new Response(`<!DOCTYPE html>
<html>
  <head>
    <title>Schedule</title>
    <style>
      html {
        --bg: black;
        background: var(--bg);
        color: white;
      }

      tr:not(:first-child) {
        height: 70px;
      }

      td:not(:first-child) {
        min-width: max(200px, calc(20vw - 20px));
      }

      table {
        overflow-x: scroll;
        white-space: nowrap;
      }

      th, td {
        white-space: normal;
        box-sizing: border-box;
        padding: 5px;
      }

      body {
        font-family: sans-serif;
      }

      th {
        background: var(--bg);
      }

      td {
        background: #222;
        color: black;
      }

      tr:first-child {
        position: sticky;
        top: 0;
      }

      tr {
        overflow: hidden;
        width: 0px;
      }

      th:first-child {
        position: sticky;
        left: 0;
      }

      th:not(:first-child) {
        width: max(200px, calc(20vw - 20px));
      }

      select {
        font: inherit;
        color: inherit;
        background: inherit;
        border: none;
      }

      @media (prefers-color-scheme: light) {
        html {
          color: black;
          --bg: white;
        }

        td {
          background: #ddd;
        }
      }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <th>
          <select>
            ${Object.entries(terms).map(listTerm => {
              if (listTerm[1].partOf === "none") {
                return "";
              }
              return `<option value="${listTerm[0]}"${listTerm[0] === term ? " selected" : ""}>${displayTerm(listTerm[0])}</option>`;
            })}
          </select>
        </th>
        <th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th></tr>
      ${hours.map(h => {
        return `<tr><th scope="row">${(h.hour > 12 ? h.hour - 12 : h.hour) + (h.hour > 11 ? "PM" : "AM")}</th>${
          h.classes.map(section => {
            if(!section){
              return `<td></td>`
            }else if(section.start !== h.hour){
              return ``;
            }
            
            return `<td style="background-color: ${classColors[section.classId]}" rowspan="${section.length}"><strong>${section.id}</strong><br><em>${section.name}</em><br>${section.room}<br>${section.type}<br>${section.instructors.join(", ")}</td>`
          }).join("")
        }</tr>`
      }).join("")}
    </table>
    <script>
      window.addEventListener("load", () => {
        document.querySelector("select").addEventListener("change", e => {
          const url = new URL(location.href);
          url.searchParams.set("term", e.target.value);
          location.href = url.href;
        });
      });
    </script>
  </body>
</html>`, {
    headers: {
      "Content-Type": "text/html"
    }
  });
}