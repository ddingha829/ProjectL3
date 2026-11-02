import fs from 'node:fs';
const svg=fs.readFileSync('public/brand/ticgle-wordmark-a.svg','utf8'),paths=svg.match(/d="([^"]+)"/)[1].match(/M[^M]+/g);
if(paths.length!==9)throw Error('Review glyph contours after changing the brand master');
const glyphs=[[2],[6,1],[4],[3,8],[0],[5,7]].map(ids=>ids.map(i=>paths[i]).join(' '));
fs.writeFileSync('src/components/loadingWordmarkPaths.ts','// Exact approved A contours, grouped t/i/c/g/l/e. Regenerate after changing the SVG master.\nexport const loadingWordmarkPaths='+JSON.stringify(glyphs,null,1)+';\n');
