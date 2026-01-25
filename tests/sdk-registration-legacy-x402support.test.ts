import { SDK } from '../src/index';
import { describe, expect, it } from '@jest/globals';

describe('Registration parsing backwards compatibility', () => {
  it('parses legacy `x402support` key (and prefers boolean value)', () => {
    // No network calls happen; we only exercise the internal transform logic.
    const sdk = new SDK({ chainId: 1, rpcUrl: 'http://localhost:8545' });

    const rawLegacy = {
      name: 'Agent',
      description: 'Desc',
      active: true,
      services: [],
      x402support: true,
    };

    const rf = (sdk as any)._transformRegistrationFile(rawLegacy);
    expect(rf.x402support).toBe(true);
  });
});


