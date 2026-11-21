// Exercise emitted JavaScript, not only Node's development TypeScript loader.
import ts from 'typescript';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const output = mkdtempSync(path.join(tmpdir(), 'wolbachia-server-'));
try {
  const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const program = ts.createProgram(['api/count-image.ts'], { ...parsed.options, noEmit: false, incremental: false, composite: false, rootDir: process.cwd(), outDir: output });
  const emitted = program.emit(), diagnostics = [...ts.getPreEmitDiagnostics(program), ...emitted.diagnostics];
  if (diagnostics.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  writeFileSync(path.join(output, 'package.json'), '{"type":"module"}');
  const handler = (await import(pathToFileURL(path.join(output, 'api/count-image.js')).href)).default.fetch;
  const pixels = Buffer.alloc(32 * 32 * 3, 255);
  for (let y = 10; y < 16; y++) for (let x = 10; x < 16; x++) pixels.fill(0, (y * 32 + x) * 3, (y * 32 + x) * 3 + 3);
  const response = await handler(new Request('https://example.test/api/count-image', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ schema: 'bead-counter-request-v1', imageSha256: 'a'.repeat(64), pixelSha256: createHash('sha256').update(pixels).digest('hex'), width: 32, height: 32, kind: 'bead_proxy', rgbBase64: pixels.toString('base64'), options: { foreground: 'dark', threshold: 130, minArea: 12, maxArea: 10000, roi: { x: 0, y: 0, width: 100, height: 100 } } }) }));
  assert.equal(response.status, 200); assert.equal((await response.json()).count, 1);
  console.log('Compiled Node API smoke check passed: imported emitted modules and counted actual pixels.');
} finally { rmSync(output, { recursive: true, force: true }); }
