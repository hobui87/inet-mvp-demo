import https from 'https';

function callMCP(method, params = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    });

    const options = {
      hostname: 'viui.inet.vn',
      port: 443,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let buffer = '';
      let resolved = false;

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        lines.forEach(line => {
          if (line.startsWith('data:') && !resolved) {
            const dataStr = line.substring(5).trim();
            if (dataStr) {
              try {
                const data = JSON.parse(dataStr);
                resolved = true;
                resolve(data);
              } catch (e) {
                console.error('SSE parse error:', e.message);
              }
            }
          }
        });
      });

      res.on('end', () => {
        if (!resolved && buffer.trim()) {
          try {
            resolved = true;
            resolve(JSON.parse(buffer));
          } catch (e) {
            reject(new Error('Invalid JSON in buffer'));
          }
        } else if (!resolved) {
          reject(new Error('Stream ended without data'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(payload);
    req.end();
  });
}

function printResult(obj) {
  if (!obj) return '[null]';
  if (typeof obj === 'string') return obj;
  if (obj.content && Array.isArray(obj.content)) {
    return obj.content.map(c => {
      if (c.type === 'text') return c.text;
      return JSON.stringify(c);
    }).join('\n');
  }
  return JSON.stringify(obj, null, 2);
}

async function test() {
  try {
    console.log('Test 1: get_landing_page_defaults\n');
    const r1 = await callMCP('tools/call', { name: 'get_landing_page_defaults' });
    console.log(printResult(r1.result).substring(0, 300));
    
    console.log('\n\nTest 2: generate_color_vars\n');
    const r2 = await callMCP('tools/call', { 
      name: 'generate_color_vars',
      arguments: { format: 'css', include_scales: true }
    });
    console.log(printResult(r2.result).substring(0, 800));
    
    console.log('\n\nTest 3: get_icon_svg rocket\n');
    const r3 = await callMCP('tools/call', {
      name: 'get_icon_svg',
      arguments: { name: 'rocket' }
    });
    console.log(printResult(r3.result).substring(0, 500));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
