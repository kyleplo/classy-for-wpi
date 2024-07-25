import { InteractionResponseType } from "discord-interactions";
import { ClassRow, Writer, JsonResponse, currentTerm } from "../util";
import { make, encodePNGToStream, registerFont, Context, Bitmap } from "pureimage/dist/index.js";
import { classes, terms } from "../db";

export async function scheduleCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  const term = options.get("term") || currentTerm();

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: `${options.has("userName") ? options.get("userName") + "'s s" : "S"}chedule for ${term} term`,
        image: {
          url: `${env.BOT_LINK}/schedule.png?userId=${options.get("user") || userId}&term=${term}&v=${Date.now()}`
        }
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

async function generateScheduleImage(term: string, schedule: ClassRow[]): Promise<ReadableStream> {
  var earliest = 1290;
  var latest = 360;
  var classColors: {[classId: string]: string} = {};
  var usedColors = 0;

  schedule.forEach(value => {
    const section = classes[value.classId].sections[value.sectionId];

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

  const pxPerMin = 575 / (latest - earliest);
  
  if(!image || !ctx){
    image = make(800, 600);
    ctx = image.getContext("2d");

    const font = registerFont("", "font");
    await font.load();
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 800, 600);

  ctx.fillStyle = "#ffffff";
  ctx.font = "14px font";

  ctx.fillText(term + " term", 5, 15);

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
    const section = classes[value.classId.toUpperCase()].sections[value.sectionId.toUpperCase()];

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
      ctx.fillRect(sectionX - 2, sectionY - 2, 144, sectionHeight);
      ctx.fillStyle = "#000000";
      ctx.fillText(ellipsis(ctx, value.classId.toUpperCase() + "-" + value.sectionId.toUpperCase(), 140), sectionX, 10 + sectionY);
      if(sectionHeight > 30){
        ctx.fillText(ellipsis(ctx, classes[value.classId].name, 140), sectionX, 25 + sectionY);
      }
      if(sectionHeight > 45){
        ctx.fillText(ellipsis(ctx, section.room, 140), sectionX, 40 + sectionY);
      }
      if(sectionHeight > 60){
        ctx.fillText(ellipsis(ctx, section.type, 140), sectionX, 55 + sectionY);
      }
    });
  });

  const { readable, writable } = new TransformStream();
  await encodePNGToStream(image, new Writer(writable) as any);
  return readable;
}