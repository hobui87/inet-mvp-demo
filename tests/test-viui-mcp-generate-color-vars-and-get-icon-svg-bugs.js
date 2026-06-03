const https = require('https');

// Helper to make HTTP request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'viui.inet.vn',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve(body);
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Parse SSE format response
function parseSSEResponse(sseText) {
  const lines = sseText.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6);
      return JSON.parse(jsonStr);
    }
  }
  return null;
}

// Test SSE endpoint by calling MCP tools via HTTP
async function testMCPTools() {
  console.log('=== Testing MCP Server at https://viui.inet.vn/mcp ===\n');

  // Test 1: generate_color_vars
  console.log('Bug #1 generate_color_vars: FIXED / BROKEN');
  console.log('---');

  try {
    const response1Text = await makeRequest('POST', '/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'generate_color_vars',
        arguments: {
          format: 'css',
          include_scales: true
        }
      }
    });

    const parsed1 = parseSSEResponse(response1Text);
    if (parsed1 && parsed1.result && parsed1.result.content) {
      const cssContent = parsed1.result.content[0].text;
      console.log(cssContent);

      // Check if :root {} has content
      if (cssContent.includes(':root {') && !cssContent.match(/:root\s*{\s*}/)) {
        console.log('\nStatus: FIXED');
      } else {
        console.log('\nStatus: BROKEN');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\n\nBug #2 get_icon_svg:');
  console.log('---');

  try {
    const response2Text = await makeRequest('POST', '/mcp', {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_icon_svg',
        arguments: {
          name: 'rocket'
        }
      }
    });

    const parsed2 = parseSSEResponse(response2Text);
    if (parsed2 && parsed2.result && parsed2.result.content) {
      const jsonResponse = JSON.parse(parsed2.result.content[0].text);
      console.log(JSON.stringify(jsonResponse, null, 2));

      // Check if svg_markup field exists and contains <svg
      if (jsonResponse.svg_markup && jsonResponse.svg_markup.includes('<svg')) {
        console.log('\nStatus: FIXED');
      } else if (jsonResponse.cdn_url) {
        console.log('\nStatus: UNCHANGED');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testMCPTools().catch(console.error);
