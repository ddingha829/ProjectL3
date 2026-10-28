import sharp from 'sharp';
// The original ProjectL2 icon uses a white T on Ticgle orange. The wordmark
// itself is copied byte-for-byte; only these code-drawn app icons are rendered.
for(const [name,size]of [['ticgle-icon-192.png',192],['ticgle-icon-512.png',512],['ticgle-apple-touch-icon.png',180]]){
 await sharp('public/brand/ticgle-icon.svg').resize(size,size).png().toFile('public/brand/'+name);
}
console.log('Rendered Ticgle app icons: 192, 512, 180');
