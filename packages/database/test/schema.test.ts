import { describe, expect, it } from 'vitest';
import * as enums from '../src/enums.js';
import * as database from '../src/index.js';
import * as schema from '../src/schema.js';

describe('database package exports', () => {
  it('exports central enum values', () => {
    expect(enums.PROVIDER_TYPES).toEqual(['xtream', 'm3u']);
    expect(enums.ERROR_CODES).toContain('CONNECT_TIMEOUT');
  });

  it('loads schema tables', () => {
    expect(schema.providers).toBeDefined();
    expect(schema.channels).toBeDefined();
    expect(schema.channelChecks).toBeDefined();
    expect(schema.incidents).toBeDefined();
  });

  it('re-exports client, schema, enums, and seed helpers', () => {
    expect(database.createDatabase).toBeTypeOf('function');
    expect(database.seedFoundation).toBeTypeOf('function');
    expect(database.providers).toBe(schema.providers);
    expect(database.PROVIDER_TYPES).toBe(enums.PROVIDER_TYPES);
  });
});
