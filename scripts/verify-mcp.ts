import * as path from 'path';
import { spawn } from 'child_process';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: any;
  error?: any;
  method?: string;
  params?: any;
}

export async function runMcpVerification(): Promise<{ test: string; status: 'PASS' | 'FAIL'; details: string }[]> {
  console.log('====================================================');
  console.log('🤖 MCP (Model Context Protocol) 24-Tool QA Suite');
  console.log('====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const binPath = path.join(rootDir, 'bin', 'deckcraft-cli');

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  return new Promise((resolve) => {
    const proc = spawn(binPath, ['mcp', '--sample'], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let buffer = '';
    let currentStep = 0;
    const expectedTools = [
      'list_commands',
      'run_command',
      'batch',
      'new_presentation',
      'open_presentation',
      'save_presentation',
      'export',
      'inspect_document',
      'inspect_slide',
      'render_slide',
      'add_slide',
      'go_to_slide',
      'add_shape',
      'add_text_box',
      'set_text',
      'insert_picture',
      'insert_table',
      'insert_chart',
      'select',
      'pointer',
      'select_tool',
      'key',
      'type_text',
      'screenshot',
    ];

    const send = (msg: JsonRpcRequest) => {
      proc.stdin.write(JSON.stringify(msg) + '\n');
    };

    const cleanupAndResolve = (err?: string) => {
      try {
        proc.kill();
      } catch (_) {}
      if (err) {
        console.error(`  ✗ MCP Test Failed: ${err}`);
      }
      resolve(results);
    };

    const timer = setTimeout(() => {
      cleanupAndResolve('Timeout waiting for MCP responses');
    }, 15000);

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg: JsonRpcResponse;
        try {
          msg = JSON.parse(line);
        } catch (e: any) {
          console.error('Failed to parse line as JSON:', line);
          continue;
        }

        // STEP 1: Handshake response
        if (msg.id === 1) {
          if (msg.result?.protocolVersion && msg.result?.serverInfo?.name === 'deckcraft') {
            results.push({
              test: 'MCP Protocol 2024-11-05 Handshake',
              status: 'PASS',
              details: `Server: ${msg.result.serverInfo.name} v${msg.result.serverInfo.version}, Proto: ${msg.result.protocolVersion}`,
            });
            console.log(`  ✓ MCP Handshake Succeeded: ${msg.result.serverInfo.name} v${msg.result.serverInfo.version}`);
          } else {
            results.push({
              test: 'MCP Protocol 2024-11-05 Handshake',
              status: 'FAIL',
              details: JSON.stringify(msg.error || msg.result),
            });
            clearTimeout(timer);
            return cleanupAndResolve('Invalid initialize result');
          }

          // Send initialized notification + tools/list request
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
          currentStep = 2;
        }

        // STEP 2: Tools List response
        else if (msg.id === 2) {
          const tools = msg.result?.tools || [];
          const toolNames: string[] = tools.map((t: any) => t.name);
          const hasAllTools = expectedTools.every((t) => toolNames.includes(t));

          if (hasAllTools && tools.length >= 24) {
            results.push({
              test: 'MCP 24 Core Tools Verification',
              status: 'PASS',
              details: `Found ${tools.length} declared tools including all 24 required core tools`,
            });
            console.log(`  ✓ Found ${tools.length} declared tools in MCP server`);
          } else {
            results.push({
              test: 'MCP 24 Core Tools Verification',
              status: 'FAIL',
              details: `Missing tools: ${expectedTools.filter((t) => !toolNames.includes(t)).join(', ')}`,
            });
          }

          // Test Tool 1: inspect_document
          send({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: { name: 'inspect_document', arguments: {} },
          });
          currentStep = 3;
        }

        // STEP 3: inspect_document result
        else if (msg.id === 3) {
          const content = msg.result?.content?.[0]?.text;
          let parsed: any;
          try {
            parsed = JSON.parse(content);
          } catch (_) {}

          if (parsed && Array.isArray(parsed.slides) && parsed.slides.length === 8) {
            results.push({
              test: 'MCP Tool: inspect_document',
              status: 'PASS',
              details: `Retrieved presentation "${parsed.title}" with ${parsed.slides.length} slides`,
            });
            console.log(`  ✓ Tool inspect_document returned ${parsed.slides.length} slides for "${parsed.title}"`);
          } else {
            results.push({
              test: 'MCP Tool: inspect_document',
              status: 'FAIL',
              details: `Failed to inspect document: ${content}`,
            });
          }

          // Test Tool 2: inspect_slide 0
          send({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: { name: 'inspect_slide', arguments: { index: 0 } },
          });
          currentStep = 4;
        }

        // STEP 4: inspect_slide result
        else if (msg.id === 4) {
          const content = msg.result?.content?.[0]?.text;
          let parsed: any;
          try {
            parsed = JSON.parse(content);
          } catch (_) {}

          if (parsed && Array.isArray(parsed.shapes)) {
            results.push({
              test: 'MCP Tool: inspect_slide',
              status: 'PASS',
              details: `Slide 0 has ${parsed.shapes.length} shapes (Title: "${parsed.title}")`,
            });
            console.log(`  ✓ Tool inspect_slide returned ${parsed.shapes.length} shapes on slide 0`);
          } else {
            results.push({
              test: 'MCP Tool: inspect_slide',
              status: 'FAIL',
              details: `Failed to inspect slide: ${content}`,
            });
          }

          // Test Tool 3: run_command list_commands or add_shape
          send({
            jsonrpc: '2.0',
            id: 5,
            method: 'tools/call',
            params: {
              name: 'run_command',
              arguments: {
                command: 'shape.insert',
                params: { preset: 'roundRect', rect: [100, 100, 200, 80], text: 'MCP QA Shape' },
              },
            },
          });
          currentStep = 5;
        }

        // STEP 5: run_command result
        else if (msg.id === 5) {
          if (!msg.result?.isError) {
            results.push({
              test: 'MCP Tool: run_command (shape.insert)',
              status: 'PASS',
              details: `Successfully inserted shape via MCP run_command`,
            });
            console.log('  ✓ Tool run_command (shape.insert) executed successfully');
          } else {
            results.push({
              test: 'MCP Tool: run_command (shape.insert)',
              status: 'FAIL',
              details: JSON.stringify(msg.result),
            });
          }

          clearTimeout(timer);
          cleanupAndResolve();
        }
      }
    });

    // Initiate Handshake
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'qa-verifier', version: '1.0.0' },
      },
    });
  });
}

if (require.main === module) {
  runMcpVerification().then((results) => {
    console.log('\n====================================================');
    console.log('📋 MCP QA SUMMARY RESULTS');
    console.log('====================================================');
    console.table(results);
    const pass = results.every((r) => r.status === 'PASS');
    process.exit(pass ? 0 : 1);
  });
}
