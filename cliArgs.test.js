import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from './cliArgs.js';

test('uses Sample.resx by default', () => {
  assert.deepEqual(parseCliArgs([]), { file: 'Sample.resx', help: false });
});

test('accepts --file', () => {
  assert.deepEqual(parseCliArgs(['--file', 'Custom.resx']), { file: 'Custom.resx', help: false });
});

test('accepts -f', () => {
  assert.deepEqual(parseCliArgs(['-f', 'Another.resx']), { file: 'Another.resx', help: false });
});

test('accepts --file=...', () => {
  assert.deepEqual(parseCliArgs(['--file=Direct.resx']), { file: 'Direct.resx', help: false });
});

test('sets help flag for --help', () => {
  assert.deepEqual(parseCliArgs(['--help']), { file: 'Sample.resx', help: true });
});

test('throws when --file is missing a value', () => {
  assert.throws(() => parseCliArgs(['--file']), /Missing value for --file\/\-f/);
});
