// First run (mapshaper is a build tool, not a production dependency):
// npm exec --yes --package=mapshaper@0.7.101 -- mapshaper public/maps/admin-regions/20261001/district.json -clean -simplify weighted interval=100 keep-shapes -o .test-data/district-clean.json format=geojson precision=0.00001
import fs from 'node:fs';
const original=JSON.parse(fs.readFileSync('public/maps/admin-regions/20261001/district.json','utf8')),display=JSON.parse(fs.readFileSync('.test-data/district-clean.json','utf8'));
const byCode=new Map(original.features.map(f=>[f.properties.code,f]));if(display.features.length!==byCode.size)throw Error('region count');for(const f of display.features){const prior=byCode.get(f.properties.code);if(!prior)throw Error('region identity');f.properties=prior.properties;f.bbox=prior.bbox;}
fs.writeFileSync('public/maps/admin-regions/20261001/district-display.json',JSON.stringify(display));
const count=j=>{let n=0;const walk=c=>{if(typeof c[0]==='number')n++;else c.forEach(walk);};j.features.forEach(f=>walk(f.geometry.coordinates));return n;};console.log(JSON.stringify({beforeBytes:fs.statSync('public/maps/admin-regions/20261001/district.json').size,afterBytes:fs.statSync('public/maps/admin-regions/20261001/district-display.json').size,beforeVertices:count(original),afterVertices:count(display),regions:display.features.length}));
