#!/usr/bin/env node
// Penpot's remote MCP bridge. The key stays in the user's device-local config.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join, dirname } from 'node:path';

const TOKEN_FILE = process.env.PENPOT_MCP_TOKEN_FILE || join(homedir(), '.config/penpot/token');
const ENDPOINT = process.env.PENPOT_MCP_URL || 'https://design.penpot.app/mcp/stream';

function usage() {
  console.log(`Usage:
  node scripts/penpot.mjs status
  node scripts/penpot.mjs api TYPE [MEMBER]
  node scripts/penpot.mjs apply SCRIPT --file-id ID --page-id ID
  node scripts/penpot.mjs pull --file-id ID --page-id ID --shape-id ID --out DIR
  node scripts/penpot.mjs export --shape-id ID --out FILE [--format png|svg]

The Penpot file must be open with the MCP toolbar button connected.
Set PENPOT_MCP_TOKEN_FILE for a nondefault, device-local key file.`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const value = rest[i];
    if (value.startsWith('--')) {
      const key = value.slice(2);
      if (!['file-id', 'page-id', 'shape-id', 'out', 'format'].includes(key) || !rest[i + 1]) {
        throw new Error(`Invalid option: ${value}`);
      }
      options[key] = rest[++i];
    } else {
      positional.push(value);
    }
  }
  return { command, positional, options };
}

function requireOptions(options, keys) {
  for (const key of keys) if (!options[key]) throw new Error(`Missing --${key}`);
}

async function key() {
  const mode = (await stat(TOKEN_FILE)).mode;
  if (process.platform !== 'win32' && (mode & 0o077)) {
    throw new Error(`Penpot key file must be owner-only: chmod 600 ${TOKEN_FILE}`);
  }
  const value = (await readFile(TOKEN_FILE, 'utf8')).trim();
  if (!/^[A-Za-z0-9._~-]{50,2000}$/.test(value)) throw new Error('Unexpected Penpot key format');
  return value;
}

async function client() {
  const secret = await key();
  const url = new URL(ENDPOINT);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Penpot MCP requires HTTPS outside localhost');
  }
  url.searchParams.set('userToken', secret);
  let sessionId;
  let id = 0;
  async function rpc(method, params) {
    const requestId = ++id;
    const headers = { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;
    const response = await fetch(url, {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }),
    });
    sessionId = response.headers.get('mcp-session-id') || sessionId;
    const body = await response.text();
    const events = body.split('\n').filter(line => line.startsWith('data: ')).flatMap(line => {
      try { return [JSON.parse(line.slice(6))]; } catch { return []; }
    });
    if (!events.length) {
      try { events.push(JSON.parse(body)); } catch { /* handled below */ }
    }
    const message = events.find(event => event.id === requestId) || events[0];
    if (!response.ok || message?.error) {
      const detail = JSON.stringify(message?.error || body.slice(0, 300));
      throw new Error(`Penpot ${method} failed (HTTP ${response.status}): ${detail.replaceAll(secret, '[redacted]').replace(/userToken=[^&\s"']+/g, 'userToken=[redacted]')}`);
    }
    if (!message) throw new Error(`Penpot ${method} returned no MCP response`);
    return message.result;
  }
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'aAugment Penpot bridge', version: '1' } });
  return async (name, args) => {
    const result = await rpc('tools/call', { name, arguments: args });
    if (result?.isError) throw new Error(result.content?.map(block => block.text).filter(Boolean).join('\n') || `${name} failed`);
    return result;
  };
}

function unpack(result) {
  const text = result.content?.find(block => block.type === 'text')?.text;
  if (!text) throw new Error('Penpot returned no text result');
  if (text.startsWith('Tool execution failed:')) throw new Error(text);
  try {
    const parsed = JSON.parse(text);
    return Object.hasOwn(parsed, 'result') ? parsed.result : parsed;
  } catch {
    return text;
  }
}

function guard(options) {
  return `if (penpot.currentFile?.id !== ${JSON.stringify(options['file-id'])} || penpot.currentPage?.id !== ${JSON.stringify(options['page-id'])}) throw new Error('Penpot focus changed; reopen the intended file and page.');\n`;
}

async function main() {
  const { command, positional, options } = parseArgs(process.argv.slice(2));
  if (!command || ['help', '-h', '--help'].includes(command)) return usage();
  if (!['status', 'api', 'apply', 'pull', 'export'].includes(command)) throw new Error(`Unknown command: ${command}`);
  if (command === 'apply') {
    requireOptions(options, ['file-id', 'page-id']);
    if (positional.length !== 1) throw new Error('apply needs one JavaScript file');
  }
  if (command === 'pull') requireOptions(options, ['file-id', 'page-id', 'shape-id', 'out']);
  if (command === 'export') requireOptions(options, ['shape-id', 'out']);
  const call = await client();
  if (command === 'status') {
    const code = `return {file:penpot.currentFile && {id:penpot.currentFile.id,name:penpot.currentFile.name,pages:penpot.currentFile.pages.map(p=>({id:p.id,name:p.name}))},page:penpot.currentPage && {id:penpot.currentPage.id,name:penpot.currentPage.name,boards:penpot.currentPage.findShapes({type:'board'}).filter(s=>s.parent?.id===penpot.currentPage.root.id).map(s=>({id:s.id,name:s.name,width:s.width,height:s.height}))}};`;
    console.log(JSON.stringify(unpack(await call('execute_code', { code })), null, 2));
  } else if (command === 'api') {
    if (!positional[0]) throw new Error('api needs a Penpot API type');
    const result = await call('penpot_api_info', { type: positional[0], ...(positional[1] ? { member: positional[1] } : {}) });
    console.log(result.content?.map(block => block.text).filter(Boolean).join('\n'));
  } else if (command === 'apply') {
    const script = await readFile(resolve(positional[0]), 'utf8');
    console.log(JSON.stringify(unpack(await call('execute_code', { code: guard(options) + script })), null, 2));
  } else if (command === 'pull') {
    const shapeId = JSON.stringify(options['shape-id']);
    const code = `${guard(options)}const shape=penpot.currentPage.getShapeById(${shapeId});if(!shape)throw new Error('Shape not found');function walk(s){return {id:s.id,name:s.name,type:s.type,x:s.x,y:s.y,width:s.width,height:s.height,characters:s.type==='text'?s.characters:undefined,fontFamily:s.type==='text'?s.fontFamily:undefined,fontSize:s.type==='text'?s.fontSize:undefined,fontWeight:s.type==='text'?s.fontWeight:undefined,fills:Array.isArray(s.fills)?s.fills.map(f=>({fillColor:f.fillColor,fillImage:f.fillImage&&{id:f.fillImage.id,name:f.fillImage.name,width:f.fillImage.width,height:f.fillImage.height}})):undefined,strokes:s.strokes,children:s.children?.map(walk)}}return {structure:walk(shape),html:penpot.generateMarkup([shape],{type:'html'}),css:penpot.generateStyle([shape],{type:'css',withPrelude:true,includeChildren:true})};`;
    const output = unpack(await call('execute_code', { code }));
    const dir = resolve(options.out);
    await mkdir(dir, { recursive: true });
    await Promise.all([
      writeFile(join(dir, 'structure.json'), JSON.stringify(output.structure, null, 2) + '\n'),
      writeFile(join(dir, 'draft.html'), output.html),
      writeFile(join(dir, 'draft.css'), output.css),
    ]);
    console.log(`Saved Penpot structure and draft code to ${dir}`);
  } else if (command === 'export') {
    const format = options.format || 'png';
    if (!['png', 'svg'].includes(format)) throw new Error('Export format must be png or svg');
    const result = await call('export_shape', { shapeId: options['shape-id'], format });
    const block = result.content?.find(item => item.type === 'image' || item.type === 'text');
    if (!block) throw new Error('Penpot returned no export');
    const bytes = block.data ? Buffer.from(block.data, 'base64') : Buffer.from(block.text || '', 'utf8');
    const out = resolve(options.out);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, bytes);
    console.log(`Saved ${bytes.length} bytes to ${out}`);
  }
}

main().catch(error => { console.error(error.message.replace(/userToken=[^&\s"']+/g, 'userToken=[redacted]')); process.exitCode = 1; });
