import { describe, expect, it } from 'vitest';
import { amazonReaderHttpError, describeAmazonSearchError } from './amazon-search-diagnostics';
import { amazonRecoveryAt, isAmazonRoundStop } from './amazon-request-policy';

describe('reader recovery without leaking credentials', () => {
  it('respects a longer Retry-After and stops the round on HTTP 429', async () => {
    const error = await amazonReaderHttpError(new Response(null, { status: 429, headers: { 'Retry-After': '900' } }), 1000);
    expect(error.retryAt).toBe(901000);
    expect(amazonRecoveryAt(describeAmazonSearchError(error), 1000)).toBe(901000);
    expect(isAmazonRoundStop(error)).toBe(true);
  });
  it('distinguishes a workspace credit limit from authentication refusal', async () => {
    const error = await amazonReaderHttpError(Response.json({ message: 'Credit limit reached' }, { status: 403 }), 1000);
    expect(error.code).toBe('reader_credit_limit');
    expect(error.retryAt).toBe(3601000);
  });
  it('does not retain arbitrary provider messages', async () => {
    const error = await amazonReaderHttpError(Response.json({ message: 'private credential' }, { status: 403 }), 1000);
    expect(error.code).toBe('reader_http_error');
    expect(JSON.stringify(describeAmazonSearchError(error))).not.toContain('private credential');
  });
  it('uses a five minute pause for a timeout instead of the normal 5–12 seconds', () => {
    expect(amazonRecoveryAt({ code: 'timeout' }, 1000)).toBe(301000);
  });
});