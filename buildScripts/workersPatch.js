import { readFileSync, writeFile } from "fs";

writeFile("./node_modules/node-xlsx/dist/chunk-ID6OMQGT.js", readFileSync("./node_modules/node-xlsx/dist/chunk-ID6OMQGT.js", () => {}).toString().replace('import * as fs from "fs";', "const fs = {};"), () => {});

writeFile("./node_modules/pureimage/dist/image.js", readFileSync("./node_modules/pureimage/dist/image.js", () => {}).toString().replace('import * as _PNG from "pngjs";', `import * as _PNG from "pngjs/browser.js";`), () => {});

writeFile("./node_modules/opentype.js/src/opentype.js", readFileSync("./node_modules/opentype.js/src/opentype.js", () => {}).toString().replace(`var isNode = typeof window === 'undefined';`, `var isNode = false;`).replace(`function loadFromUrl(url, callback) {
    var request = new XMLHttpRequest();
    request.open('get', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
        if (request.status !== 200) {
            return callback('Font could not be loaded: ' + request.statusText);
        }

        return callback(null, request.response);
    };

    request.send();
}`, `function loadFromUrl(url, callback) {
    callback(null, Uint8Array.from(atob(\`${btoa(Array.from(readFileSync("./font.ttf", () => {})).map(b => String.fromCharCode(b)).join(''))}\`), c => c.charCodeAt(0)).buffer);
}`), () => {});

writeFile("./node_modules/opentype.js/src/font.js", readFileSync("./node_modules/opentype.js/src/font.js", () => {}).toString().replace(`{
        var glyphPath = glyph.getPath(gX, gY, gFontSize);`, `{
        if(glyph.unicode === 32){
            return;
        }
        var glyphPath = glyph.getPath(gX, gY, gFontSize);`), () => {});