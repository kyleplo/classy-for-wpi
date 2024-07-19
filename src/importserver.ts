import { parse } from "node-xlsx";
import { classes } from "./db";
import { HtmlResponse, lazyDecrypt } from "./util";

function importForm(key: string): string {
  return `
    <form method='post' action='/upload' enctype='multipart/form-data'>
      <input type='file' accept='application/vnd.ms-excel,.xlsx' name='classes'>
      <input type='hidden' name='key' value='${key}'>
      <input type='submit'>
    </form>
  `;
}

export async function handleImport(request: Request, env: Env, key: string): Promise<Response> {
  if(request.method === "POST"){
    const body = await request.formData();

    if(!body || !body.get("classes") || !body.get("key") || (body.get("classes") as File).size > 10000){
      return new HtmlResponse(`
        <p>Failed to read uploaded file.</p>
        ${importForm(key)}
      `);
    }

    const sheet = parse(await (body.get("classes") as File).arrayBuffer());

    if(sheet.length !== 1 || sheet[0].name !== "View My Courses" || sheet[0].data[0][0] !== "My Enrolled Courses"){
      return new HtmlResponse(`
        <p>Failed to read uploaded file.</p>
        ${importForm(body.get("key") as string)}
      `);
    }

    const batch: D1PreparedStatement[] = [];

    sheet[0].data.forEach(row => {
      if(row[8] === "Registered" && row[4]){
        const section = row[4].replace(" ", "").split(" ")[0].split("-");

        if(!classes[section[0]] || !classes[section[0]].sections.includes(section[1])){
          return;
        }

        batch.push(env.DB.prepare("INSERT INTO classes (userId, classId, sectionId)\nVALUES (?, ?, ?)").bind(lazyDecrypt(body.get("key") as string), section[0], section[1]))
      }
    });

    if(batch.length){
      await env.DB.batch(batch);
      
      return new HtmlResponse(`
        <p>Successfully uploaded ${batch.length} class sections. You may now close this tab.</p>
      `);
    }else{
      return new HtmlResponse(`
        <p>File did not contain any valid classes.</p>
        ${importForm(body.get("key") as string)}
      `);
    }
  }else{
    return new HtmlResponse(importForm(key));
  }
}