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
    console.log('=== Bug #1: get_landing_page_defaults ===');
    const defaultsRes = await callMCP('tools/call', { name: 'get_landing_page_defaults' });
    console.log('Status:', defaultsRes.error ? 'ERROR: ' + defaultsRes.error.message : 'OK');
    
    if (defaultsRes.result) {
      const data = defaultsRes.result;
      if (data.brand) data.brand.name = 'iNET Test';
      
      console.log('\n=== Bug #1: generate_landing_page ===');
      const landingRes = await callMCP('tools/call', {
        name: 'generate_landing_page',
        arguments: data
      });
      
      if (landingRes.error) {
        console.log('Status: ERROR -', landingRes.error.message);
      } else {
        const html = landingRes.result;
        console.log('Status: OK - Generated HTML');
        const lines = html.split('\n').slice(0, 50).join('\n');
        console.log('First 50 lines:');
        console.log(lines.substring(0, 1500));
      }
    }
    
    console.log('\n=== Bug #2: generate_color_vars ===');
    const colorRes = await callMCP('tools/call', {
      name: 'generate_color_vars',
      arguments: { format: 'css', include_scales: true }
    });
    
    if (colorRes.error) {
      console.log('Status: ERROR -', colorRes.error.message);
    } else {
      const css = colorRes.result;
      console.log('Status: OK - Generated CSS');
      console.log('CSS Output:');
      console.log(css);
    }
    
    console.log('\n=== Bug #3: get_icon_svg (rocket) ===');
    const rocketRes = await callMCP('tools/call', {
      name: 'get_icon_svg',
      arguments: { name: 'rocket' }
    });
    
    if (rocketRes.error) {
      console.log('Status: ERROR -', rocketRes.error.message);
    } else {
      console.log('Type:', typeof rocketRes.result);
      console.log('Has SVG:', rocketRes.result?.includes('<svg'));
      console.log('Preview:', String(rocketRes.result).substring(0, 200));
    }
    
    console.log('\n=== Bug #3: get_icon_svg (home) ===');
    const homeRes = await callMCP('tools/call', {
      name: 'get_icon_svg',
      arguments: { name: 'home' }
    });
    
    if (homeRes.error) {
      console.log('Status: ERROR -', homeRes.error.message);
    } else {
      console.log('Type:', typeof homeRes.result);
      console.log('Has SVG:', homeRes.result?.includes('<svg'));
      console.log('Preview:', String(homeRes.result).substring(0, 200));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
