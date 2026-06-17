// Pure-function unit tests for cashfreeService. Hits no network.

const crypto = require('crypto');
const cashfree = require('../src/services/cashfreeService');

describe('verifyWebhookSignature', () => {
  const secret = 'test_secret_xyz';
  const ts = '1780000000';
  const body = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: { x: 1 } });
  const goodSig = crypto.createHmac('sha256', secret).update(ts + body).digest('base64');

  it('accepts a well-formed signature', () => {
    expect(
      cashfree.verifyWebhookSignature({ timestamp: ts, rawBody: body, signature: goodSig, secret }),
    ).toBe(true);
  });

  it('rejects when the body is tampered', () => {
    expect(
      cashfree.verifyWebhookSignature({
        timestamp: ts, rawBody: body + 'extra', signature: goodSig, secret,
      }),
    ).toBe(false);
  });

  it('rejects when the timestamp is replayed with a different signature', () => {
    expect(
      cashfree.verifyWebhookSignature({
        timestamp: '0', rawBody: body, signature: goodSig, secret,
      }),
    ).toBe(false);
  });

  it('rejects when secret is wrong', () => {
    expect(
      cashfree.verifyWebhookSignature({
        timestamp: ts, rawBody: body, signature: goodSig, secret: 'wrong',
      }),
    ).toBe(false);
  });

  it('rejects when fields are missing', () => {
    expect(cashfree.verifyWebhookSignature({ timestamp: ts, rawBody: body, signature: '', secret })).toBe(false);
    expect(cashfree.verifyWebhookSignature({ timestamp: '', rawBody: body, signature: goodSig, secret })).toBe(false);
    expect(cashfree.verifyWebhookSignature({ timestamp: ts, rawBody: '', signature: goodSig, secret })).toBe(false);
  });

  it('works when rawBody is a Buffer', () => {
    const buf = Buffer.from(body, 'utf8');
    expect(
      cashfree.verifyWebhookSignature({ timestamp: ts, rawBody: buf, signature: goodSig, secret }),
    ).toBe(true);
  });
});

describe('mapOrderStatus', () => {
  it('maps PAID', () => expect(cashfree.mapOrderStatus('PAID')).toBe('paid'));
  it('maps ACTIVE / CREATED to created', () => {
    expect(cashfree.mapOrderStatus('ACTIVE')).toBe('created');
    expect(cashfree.mapOrderStatus('CREATED')).toBe('created');
  });
  it('maps EXPIRED to cancelled', () => expect(cashfree.mapOrderStatus('EXPIRED')).toBe('cancelled'));
  it('maps FAILED / TERMINATED to failed', () => {
    expect(cashfree.mapOrderStatus('FAILED')).toBe('failed');
    expect(cashfree.mapOrderStatus('TERMINATED')).toBe('failed');
  });
  it('defaults to created for unknown values', () => {
    expect(cashfree.mapOrderStatus(undefined)).toBe('created');
    expect(cashfree.mapOrderStatus('SOMETHING_ELSE')).toBe('created');
  });
});
