const fs = require('fs');
const path = require('path');
const bgDir = path.resolve(__dirname, '../src/components/backgrounds');
const files = fs.readdirSync(bgDir);

files.forEach(f => {
  const p = path.join(bgDir, f);
  let c = fs.readFileSync(p, 'utf8');
  if (/getContext\('(webgl|webgl2)',\s*\{/.test(c) && !/preserveDrawingBuffer/.test(c)) {
    c = c.replace(/getContext\('(webgl|webgl2)',\s*\{/, "getContext('$1', {\n      preserveDrawingBuffer: true,");
    fs.writeFileSync(p, c, 'utf8');
    console.log('Added preserveDrawingBuffer to', f);
  }
});
