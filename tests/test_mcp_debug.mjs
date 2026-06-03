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

async function test() {
  try {
    const defaultsRes = await callMCP('tools/call', { name: 'get_landing_page_defaults' });
    if (defaultsRes.result) {
      const data = defaultsRes.result;
      if (data.brand) data.brand.name = 'iNET Test';
      
      const landingRes = await callMCP('tools/call', {
        name: 'generate_landing_page',
        arguments: data
      });
      
      if (landingRes.result) {
        const html = landingRes.result;
        console.log('=== BUG #1: generate_landing_page ===');
        console.log('Type of result:', typeof html);
        console.log('Is string:', typeof html === 'string');
        console.log('Constructor:', html?.constructor?.name);
        
        if (typeof html === 'string') {
          const lines = html.split('\n').slice(0, 50).join('\n');
          console.log('\nFirst 50 lines:');
          console.log(lines);
        } else if (html && typeof html === 'object') {
          console.log('Object keys:', Object.keys(html).slice(0, 10));
          console.log('Full object:', JSON.stringify(html, null, 2).substring(0, 1000));
        }
      }
    }
    
    const colorRes = await callMCP('tools/call', {
      name: 'generate_color_vars',
      arguments: { format: 'css', include_scales: true }
    });
    
    if (colorRes.result) {
      console.log('\n=== BUG #2: generate_color_vars ===');
      const css = colorRes.result;
      console.log('Type of result:', typeof css);
      console.log('Preview:', String(css).substring(0, 500));
    }
    
    const rocketRes = await callMCP('tools/call', {
      name: 'get_icon_svg',
      arguments: { name: 'rocket' }
    });
    
    console.log('\n=== BUG #3: get_icon_svg (rocket) ===');
    console.log('Type of result:', typeof rocketRes.result);
    console.log('Preview:', String(rocketRes.result).substring(0, 300));
    
  } catch (e) {
    console.error('Error:', e.message, e.stack);
  }
}

test();
