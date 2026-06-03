import https from 'https';

function callMCP(method, params = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
    const options = {
      hostname: 'viui.inet.vn', port: 443, path: '/mcp', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(payload)
      }, timeout: 15000
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

function getText(obj) {
  if (!obj) return '[empty]';
  if (typeof obj === 'string') return obj;
  if (obj.content && Array.isArray(obj.content)) {
    return obj.content.map(c => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n');
  }
  return JSON.stringify(obj, null, 2);
}

async function test() {
  const report = {};

  console.log('=== BUG #1: generate_landing_page ===\n');
  try {
    const defaults = await callMCP('tools/call', { name: 'get_landing_page_defaults', arguments: {} });
    const defaultsText = getText(defaults.result);

    if (defaultsText.includes('error') || defaultsText.includes('Error')) {
      console.log('ERROR getting defaults:', defaultsText.substring(0, 200));
      report.bug1 = { status: 'BROKEN', error: defaultsText.substring(0, 200) };
    } else {
      console.log('Step 1: Defaults retrieved OK');
      const data = JSON.parse(defaultsText);
      if (data.brand) data.brand.name = 'iNET Test';

      const landing = await callMCP('tools/call', { name: 'generate_landing_page', arguments: { data } });
      const landingText = getText(landing.result);

      if (landingText.includes('error') || landingText.includes('Error')) {
        console.log('ERROR:', landingText.substring(0, 200));
        report.bug1 = { status: 'BROKEN', error: landingText.substring(0, 200) };
      } else {
        const lines = landingText.split('\n').slice(0, 50).join('\n');
        console.log('Step 2: HTML generated successfully');
        console.log('First 50 lines preview:');
        console.log(lines);
        report.bug1 = { status: 'FIXED', output: lines.substring(0, 500) };
      }
    }
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    report.bug1 = { status: 'BROKEN', error: e.message };
  }

  console.log('\n=== BUG #2: generate_color_vars ===\n');
  try {
    const colors = await callMCP('tools/call', {
      name: 'generate_color_vars',
      arguments: { format: 'css', include_scales: true }
    });
    const cssText = getText(colors.result);
    console.log('CSS Output:');
    console.log(cssText);

    const hasRoot = cssText.includes(':root');
    const hasVars = cssText.includes('--');
    const isEmpty = cssText.trim() === '' || cssText.includes(':root {}');

    report.bug2 = {
      status: isEmpty ? 'BROKEN' : 'FIXED',
      hasRoot,
      hasVars,
      css: cssText.substring(0, 300)
    };
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    report.bug2 = { status: 'BROKEN', error: e.message };
  }

  console.log('\n=== BUG #3: get_icon_svg (rocket) ===\n');
  try {
    const rocket = await callMCP('tools/call', { name: 'get_icon_svg', arguments: { name: 'rocket' } });
    const rocketText = getText(rocket.result);
    console.log(rocketText);
    const rocketObj = JSON.parse(rocketText);
    report.bug3_rocket = {
      found: rocketObj.found,
      hasCdn: !!rocketObj.cdn_url,
      response: rocketText.substring(0, 200)
    };
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    report.bug3_rocket = { error: e.message };
  }

  console.log('\n=== BUG #3: get_icon_svg (home) ===\n');
  try {
    const home = await callMCP('tools/call', { name: 'get_icon_svg', arguments: { name: 'home' } });
    const homeText = getText(home.result);
    console.log(homeText);
    const homeObj = JSON.parse(homeText);
    report.bug3_home = {
      found: homeObj.found,
      hasCdn: !!homeObj.cdn_url,
      response: homeText.substring(0, 200)
    };
  } catch (e) {
    console.log('EXCEPTION:', e.message);
    report.bug3_home = { error: e.message };
  }

  const rocketInline = report.bug3_rocket?.found;
  const homeInline = report.bug3_home?.found;
  report.bug3 = {
    status: (rocketInline || homeInline) ? 'IMPROVED' : 'UNCHANGED',
    rocket: report.bug3_rocket,
    home: report.bug3_home
  };

  console.log('\n\n=== FINAL REPORT ===\n');
  console.log(JSON.stringify(report, null, 2));
}

test().catch(e => console.error('Fatal:', e.message));
