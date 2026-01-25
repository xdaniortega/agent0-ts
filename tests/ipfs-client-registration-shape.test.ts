import { IPFSClient } from '../src/core/ipfs-client';
import type { RegistrationFile } from '../src/models/interfaces';
import { EndpointType, TrustModel } from '../src/models/enums';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

function makeBaseRegistrationFile(overrides: Partial<RegistrationFile> = {}): RegistrationFile {
  return {
    name: 'Test Agent',
    description: 'Test Description',
    endpoints: [],
    trustModels: [],
    owners: [],
    operators: [],
    active: true,
    x402support: false,
    metadata: {},
    updatedAt: 0,
    ...overrides,
  };
}

describe('IPFSClient.addRegistrationFile shape', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('emits ERC-8004 registration with `services` key (not `endpoints`)', async () => {
    const client = new IPFSClient({ pinataEnabled: true, pinataJwt: 'test-jwt' });

    const addJsonSpy = jest
      .spyOn(IPFSClient.prototype as unknown as { addJson: (data: any) => Promise<string> }, 'addJson')
      .mockImplementation(async (data: any) => {
        expect(data).toHaveProperty('services');
        expect(Array.isArray(data.services)).toBe(true);
        expect(data).not.toHaveProperty('endpoints');
        // ERC-8004 registration file uses `x402Support` (camelCase).
        expect(data).toHaveProperty('x402Support');
        expect(data).not.toHaveProperty('x402support');
        expect(data.x402Support).toBe(true);
        return 'cid';
      });

    const rf = makeBaseRegistrationFile({
      endpoints: [
        { type: EndpointType.MCP, value: 'https://mcp.example.com', meta: { version: '2025-06-18' } },
      ],
      trustModels: [TrustModel.REPUTATION],
      x402support: true,
    });

    const cid = await client.addRegistrationFile(rf, 11155111, '0x000000000000000000000000000000000000dEaD');
    expect(cid).toBe('cid');
    expect(addJsonSpy).toHaveBeenCalledTimes(1);
  });
});


