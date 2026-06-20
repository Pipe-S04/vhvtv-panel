import { describe, expect, it } from 'vitest';

import { sanitizeError } from '../src/errors.js';
import { redactObject, redactString } from '../src/redaction.js';

describe('central redaction and error sanitization', () => {
  it('redacts URLs, query credentials, and auth headers from strings', () => {
    const raw =
      'GET rtsp://alice:secret@example.test/live?username=alice&password=secret Authorization: Bearer token';
    const redacted = redactString(raw);

    expect(redacted).not.toMatch(/alice|secret|Bearer token/);
    expect(redacted).toMatch(/\[REDACTED_URL\]/);
  });

  it('redacts sensitive object keys recursively', () => {
    const value = redactObject({
      username: 'alice',
      baseUrl: 'https://provider.example/live.m3u',
      streamUrl: 'https://provider.example/live/channel.ts',
      nested: { token: 'secret', safe: 'ok' }
    });

    expect(value).toEqual({
      username: '[REDACTED]',
      baseUrl: '[REDACTED]',
      streamUrl: '[REDACTED]',
      nested: { token: '[REDACTED]', safe: 'ok' }
    });
  });

  it('sanitizes public error messages', () => {
    const publicError = sanitizeError(
      new Error('failed https://example.test/live?password=secret')
    );

    expect(publicError.code).toBe('INTERNAL_ERROR');
    expect(publicError.message).not.toMatch(/secret|example\.test/);
  });

  it('never leaks canary credentials through any redaction entry point', () => {
    const CANARIES = ['PRIVACY_TEST_USERNAME_9F31', 'PRIVACY_TEST_PASSWORD_A72C', 'PRIVACY_TEST_TOKEN_6D84'];
    const streamUrl = `https://provider.example/live/${CANARIES[0]}/${CANARIES[1]}/12345.ts`;

    const outputs = [
      redactString(streamUrl),
      redactString(`Authorization: Bearer ${CANARIES[2]}`),
      JSON.stringify(
        redactObject({ username: CANARIES[0], password: CANARIES[1], token: CANARIES[2], streamUrl })
      ),
      sanitizeError(new Error(`ffmpeg failed for ${streamUrl}`)).message
    ];

    for (const output of outputs) {
      for (const canary of CANARIES) {
        expect(output).not.toContain(canary);
      }
    }
  });
});
