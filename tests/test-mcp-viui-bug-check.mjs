import https from 'https';

function callMCP(method, params = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
    const options = {
      hostname: 'viui.inet.vn', port: 443, path: '/mcp', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Content-Length': Buffer.byteLength(payload) },
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
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(payload);
    req.end();
  });
}

function getText(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.content && Array.isArray(obj.content)) {
    return obj.content.map(c => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n');
  }
  return JSON.stringify(obj, null, 2);
}

function extractJSON(text) {
  const jsonStart = text.indexOf('{');
  if (jsonStart < 0) return null;
  const jsonPart = text.substring(jsonStart);
  let braceCount = 0;
  let endPos = 0;
  for (let i = 0; i < jsonPart.length; i++) {
    if (jsonPart[i] === '{') braceCount++;
    if (jsonPart[i] === '}') braceCount--;
    if (braceCount === 0 && i > 0) {
      endPos = i + 1;
      break;
    }
  }
  return endPos > 0 ? JSON.parse(jsonPart.substring(0, endPos)) : null;
}

async function test() {
  try {
    console.log('=== BUG #1: generate_landing_page - ENOENT CSS ===\n');
    const defaults = await callMCP('tools/call', { name: 'get_landing_page_defaults', arguments: {} });
    const defaultsData = extractJSON(getText(defaults.result));

    if (!defaultsData) {
      console.log('Status: BROKEN - Could not parse defaults');
    } else {
      console.log('Step 1: Defaults retrieved OK');
      if (defaultsData.brand) defaultsData.brand.name = 'iNET Test';

      const landing = await callMCP('tools/call', { name: 'generate_landing_page', arguments: { data: defaultsData } });
      const landingText = getText(landing.result);
      const htmlEnd = landingText.indexOf('\n---');
      const html = htmlEnd > 0 ? landingText.substring(0, htmlEnd) : landingText;

      const first50 = html.split('\n').slice(0, 50).join('\n');
      console.log('Step 2: HTML generated successfully');
      console.log('\nFirst 50 lines:');
      console.log(first50);
      console.log('\nStatus: FIXED');
    }

    console.log('\n\n=== BUG #2: generate_color_vars - Empty CSS ===\n');
    const colors = await callMCP('tools/call', { name: 'generate_color_vars', arguments: { format: 'css', include_scales: true } });
    const cssText = getText(colors.result);
    const cssEnd = cssText.indexOf('\n---');
    const css = cssEnd > 0 ? cssText.substring(0, cssEnd) : cssText;
    const hasVars = css.includes('--');

    console.log('CSS Output:');
    console.log(css);
    console.log('\nStatus:', hasVars ? 'FIXED - Has CSS variables' : 'BROKEN - Empty CSS variables');

    console.log('\n\n=== BUG #3: get_icon_svg - CDN fallback vs inline SVG ===\n');
    const rocket = await callMCP('tools/call', { name: 'get_icon_svg', arguments: { name: 'rocket' } });
    const rocketText = getText(rocket.result);
    const rocketEnd = rocketText.indexOf('\n---');
    const rocketRaw = rocketEnd > 0 ? rocketText.substring(0, rocketEnd) : rocketText;
    const rocketObj = JSON.parse(rocketRaw);

    console.log('Rocket icon response:');
    console.log('  found (has inline SVG):', rocketObj.found);
    console.log('  cdn_url provided:', !!rocketObj.cdn_url);
    console.log('  Full response:');
    console.log(JSON.stringify(rocketObj, null, 2));

    const home = await callMCP('tools/call', { name: 'get_icon_svg', arguments: { name: 'home' } });
    const homeText = getText(home.result);
    const homeEnd = homeText.indexOf('\n---');
    const homeRaw = homeEnd > 0 ? homeText.substring(0, homeEnd) : homeText;
    const homeObj = JSON.parse(homeRaw);

    console.log('\nHome icon response:');
    console.log('  found (has inline SVG):', homeObj.found);
    console.log('  cdn_url provided:', !!homeObj.cdn_url);
    console.log('  Full response:');
    console.log(JSON.stringify(homeObj, null, 2));

    const status = (rocketObj.found || homeObj.found) ? 'IMPROVED' : 'UNCHANGED';
    console.log('\nStatus:', status, '- Icons are', rocketObj.found ? 'found locally' : 'using CDN fallback');

  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
