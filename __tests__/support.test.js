const {
  CATEGORIES, PRIORITIES, STATUSES,
  makeTicketCode, isValidTicketCode, agentForCategory, clampAttachments,
} = require('../src/utils/support');

describe('support constants', () => {
  it('exposes the blueprint categories / priorities / statuses', () => {
    expect(CATEGORIES).toEqual(['payment', 'construction', 'document', 'general']);
    expect(PRIORITIES).toEqual(['normal', 'urgent']);
    expect(STATUSES).toEqual(['open', 'in_progress', 'resolved', 'closed']);
  });
});

describe('makeTicketCode / isValidTicketCode', () => {
  it('produces SR-YYYY-NNNNN with a deterministic seed', () => {
    const now = new Date('2026-06-10T00:00:00Z');
    const code = makeTicketCode(now, () => 0.5); // → 10000 + 45000 = 55000
    expect(code).toBe('SR-2026-55000');
    expect(isValidTicketCode(code)).toBe(true);
  });

  it('always yields a 5-digit valid code across the rand range', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(isValidTicketCode(makeTicketCode(now, () => 0))).toBe(true);
    expect(isValidTicketCode(makeTicketCode(now, () => 0.999999))).toBe(true);
  });

  it.each(['SR-26-1', 'sr-2026-10001', 'XX-2026-10001', '', null, 12345])('rejects %s', bad => {
    expect(isValidTicketCode(bad)).toBe(false);
  });
});

describe('agentForCategory', () => {
  it('routes each category to its CRM owner', () => {
    expect(agentForCategory('payment')).toBe('Kunal Naskar');
    expect(agentForCategory('construction')).toBe('Rohit Verma');
    expect(agentForCategory('document')).toBe('Sneha Iyer');
  });
  it('falls back to the general desk for unknown categories', () => {
    expect(agentForCategory('aliens')).toBe('Support Desk');
    expect(agentForCategory(undefined)).toBe('Support Desk');
  });
});

describe('clampAttachments', () => {
  it('keeps at most 3 and drops entries without a url', () => {
    const out = clampAttachments([
      { url: 'a.jpg' }, { url: '' }, { nope: true }, { url: 'b.pdf', kind: 'document' },
      { url: 'c.png' }, { url: 'd.png' },
    ]);
    expect(out).toHaveLength(3);
    expect(out.map(a => a.url)).toEqual(['a.jpg', 'b.pdf', 'c.png']);
  });

  it('defaults kind to image and fileSize to null', () => {
    const [a] = clampAttachments([{ url: 'x.jpg' }]);
    expect(a.kind).toBe('image');
    expect(a.fileSize).toBeNull();
  });

  it('returns [] for non-arrays', () => {
    expect(clampAttachments(null)).toEqual([]);
    expect(clampAttachments(undefined)).toEqual([]);
    expect(clampAttachments('nope')).toEqual([]);
  });
});
