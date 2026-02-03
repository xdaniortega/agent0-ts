import { describe, expect, it } from '@jest/globals';

import { AgentIndexer } from '../src/core/indexer';

describe('hasOASF filter pushdown', () => {
  it('pushes hasOASF into registrationFile_ where clause (where builder)', () => {
    const indexer = new AgentIndexer(undefined as any, undefined as any, 11155111 as any);
    const where = (indexer as any)._buildWhereV2({ hasOASF: true });

    expect(where).toBeTruthy();
    expect((where as any).registrationFile_).toBeTruthy();
    expect((where as any).registrationFile_.hasOASF).toBe(true);
  });
});

