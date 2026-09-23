const http = require('http');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../public/previews');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const savedIds = new Set();
const expectedCount = 24;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save-preview') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { id, dataUrl } = JSON.parse(body);
        if (!id || !dataUrl) {
          res.writeHead(400);
          res.end('Missing id or dataUrl');
          return;
        }

        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = dataUrl.startsWith('data:image/webp') ? 'webp' : 'png';
        
        // Save as id.webp (e.g. balatro-dark.webp or balatro-light.webp)
        const filePath = path.join(outDir, `${id}.${ext}`);
        fs.writeFileSync(filePath, buffer);

        // If it's -dark, also save as fallback balatro.webp
        if (id.endsWith('-dark')) {
          const fallbackPath = path.join(outDir, `${id.replace(/-dark$/, '')}.${ext}`);
          fs.writeFileSync(fallbackPath, buffer);
        }

        savedIds.add(id);
        console.log(`[${savedIds.size}/${expectedCount}] Saved ${id}.${ext} (${buffer.length} bytes)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id, count: savedIds.size }));

        if (savedIds.size >= expectedCount) {
          console.log('All 24 previews (Light + Dark) saved! Closing server in 1s...');
          setTimeout(() => {
            server.close();
            process.exit(0);
          }, 1000);
        }
      } catch (err) {
        console.error('Error saving preview:', err);
        res.writeHead(500);
        res.end(err.message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(3333, () => {
  console.log('Preview Receiver Server listening on http://localhost:3333 for 24 previews (Light + Dark)');
});
