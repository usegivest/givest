import sharp from "/Users/russ/stockdrops/web/node_modules/sharp/lib/index.js";

const size = 256;
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <circle cx="128" cy="128" r="128" fill="#EEF0FF"/>
  <g transform="translate(56,32) scale(0.56)">
    <path fill="#627EEA" fill-opacity="0.6" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/>
    <path fill="#627EEA" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
    <path fill="#627EEA" fill-opacity="0.6" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"/>
    <path fill="#627EEA" d="M127.962 312.187v-89.72L0 236.585z"/>
    <path fill="#2A2A72" fill-opacity="0.2" d="M127.961 287.958l127.96-75.637-127.96-58.162z"/>
    <path fill="#2A2A72" fill-opacity="0.35" d="M0 212.32l127.96 75.638v-133.8z"/>
  </g>
</svg>`;

const buf = Buffer.from(svg);
await sharp(buf).png().toFile("/Users/russ/givestapp/assets/logos/ETH.png");
await sharp(buf).png().toFile("/Users/russ/stockdrops/web/public/logos/ETH.png");
console.log("ok");
