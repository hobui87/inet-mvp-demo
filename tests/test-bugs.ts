const SERVER_URL = 'https://viui.inet.vn/mcp';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, any>;
}

async function makeRequest(request: MCPRequest): Promise<any> {
  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error.message);
          return data.result || data;
        }
      }
    }

    throw new Error('No valid response received');
  } catch (error: any) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

async function testTools() {
  console.log('🧪 Testing 3 Bugs\n');

  // Bug 1
  console.log('Bug #1: generate_color_vars');
  console.log('────────────────────────────');
  try {
    const result1 = await makeRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'generate_color_vars',
        arguments: { format: 'css', include_scales: true }
      }
    });
    const content = result1.content?.[0]?.text || result1;
    console.log('Status: FIXED' + (content.includes(':root') ? ' (has :root)' : ''));
    console.log('Output:', content.substring(0, 500));
  } catch (e: any) {
    console.log('Status: BROKEN');
    console.log('Error:', e.message);
  }
  console.log('\n');

  // Bug 2
  console.log('Bug #2: get_icon_svg');
  console.log('────────────────────');
  try {
    const rocket = await makeRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_icon_svg',
        arguments: { name: 'rocket' }
      }
    });
    console.log('rocket:', rocket.content?.[0]?.text || rocket);
  } catch (e: any) {
    console.log('rocket error:', e.message);
  }
  
  try {
    const home = await makeRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_icon_svg',
        arguments: { name: 'home' }
      }
    });
    console.log('home:', home.content?.[0]?.text || home);
  } catch (e: any) {
    console.log('home error:', e.message);
  }
  console.log('\n');

  // Bug 3
  console.log('Bug #3: generate_landing_page');
  console.log('─────────────────────────────');
  try {
    const defaults = await makeRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_landing_page_defaults',
        arguments: {}
      }
    });
    const defaultData = JSON.parse(defaults.content?.[0]?.text || defaults);
    defaultData.brand.name = 'iNET Test';
    
    const result3 = await makeRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'generate_landing_page',
        arguments: { data: defaultData }
      }
    });
    const html = result3.content?.[0]?.text || result3;
    console.log('Status: FIXED (HTML generated)');
    console.log('Preview:', html.substring(0, 300));
  } catch (e: any) {
    console.log('Status: BROKEN');
    console.log('Error:', e.message);
  }
}

testTools().catch(console.error);
