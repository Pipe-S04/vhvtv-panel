import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const tokenSource = await readFile(new URL('../tokens.ts', import.meta.url), 'utf8');

test('VHV palette exposes blue dark-luxury design tokens', () => {
  for (const token of [
    '--vhv-color-canvas',
    '--vhv-color-primary',
    '--vhv-color-cyan',
    '--vhv-color-surface-glass',
    '--vhv-shadow-luxe',
    '--vhv-radius-xl'
  ]) {
    assert.match(css, new RegExp(token));
  }

  assert.match(tokenSource, /canvas: ['"]#05070d['"]/);
  assert.match(tokenSource, /primary: ['"]#168bff['"]/);
});

test('all stream statuses have CSS variables and component classes', () => {
  for (const status of ['online', 'degraded', 'offline', 'unknown', 'paused']) {
    assert.match(css, new RegExp(`--vhv-status-${status}`));
    assert.match(css, new RegExp(`\\.vhv-status--${status}`));
    assert.match(tokenSource, new RegExp(`${status}: ['"]#[0-9a-fA-F]{6}['"]`));
  }
});

test('core reusable components have style hooks', () => {
  for (const className of ['vhv-card', 'vhv-button', 'vhv-badge', 'vhv-status']) {
    assert.match(css, new RegExp(`\\.${className}`));
  }
});
