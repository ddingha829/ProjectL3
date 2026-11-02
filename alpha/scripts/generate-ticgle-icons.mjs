import sharp from 'sharp';
// Approved A source artwork; versioned deployment assets preserve old clients.
const root='public/brand/',icon='design/brand/ticgle-icon-a.png';
for(const [name,size]of [['ticgle-icon-a-192.png',192],['ticgle-icon-a-512.png',512],['ticgle-apple-touch-icon-a.png',180]])await sharp(icon).resize(size,size).png({compressionLevel:9,palette:true,colours:128,dither:0,effort:10}).toFile(root+name);
await sharp(icon).resize(448,448).extend({top:32,bottom:32,left:32,right:32,background:'#F4511E'}).png({compressionLevel:9,palette:true,colours:128,dither:0,effort:10}).toFile(root+'ticgle-icon-a-maskable.png');
const wordmark=await sharp('design/brand/ticgle-wordmark-a.png').resize({width:460}).png({compressionLevel:9,palette:true,colours:128,dither:0,effort:10}).toBuffer();
await sharp(wordmark).toFile(root+'ticgle-wordmark-a.png');
const socialWordmark=await sharp('design/brand/ticgle-wordmark-a.png').resize({width:650}).toBuffer();
const wm=await sharp(socialWordmark).metadata();
await sharp({create:{width:1200,height:630,channels:4,background:'#FAF8F3'}}).composite([{input:socialWordmark,left:275,top:Math.round((630-wm.height)/2)}]).png({compressionLevel:9,palette:true,colours:128,dither:0,effort:10}).toFile(root+'ticgle-social-a.png');
console.log(JSON.stringify({wordmark:await sharp(wordmark).metadata().then(({width,height})=>({width,height})),icons:[180,192,512],social:[1200,630]}));
