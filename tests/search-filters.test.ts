/**
 * Unit tests for SearchFilters, SearchOptions, and filter/option shapes.
 * No network; validates types and filter construction.
 */

import type { SearchFilters, SearchOptions, FeedbackFilters } from '../src/models/interfaces.js';

describe('SearchFilters / SearchOptions', () => {
  describe('SearchFilters shape', () => {
    it('accepts empty filters', () => {
      const f: SearchFilters = {};
      expect(f).toEqual({});
    });

    it('accepts chains as number[]', () => {
      const f: SearchFilters = { chains: [1, 11155111] };
      expect(f.chains).toEqual([1, 11155111]);
    });

    it('accepts chains as "all"', () => {
      const f: SearchFilters = { chains: 'all' };
      expect(f.chains).toBe('all');
    });

    it('accepts agentIds', () => {
      const f: SearchFilters = { agentIds: ['1:123', '11155111:374'] };
      expect(f.agentIds).toHaveLength(2);
    });

    it('accepts keyword for semantic search', () => {
      const f: SearchFilters = { keyword: 'crypto agent' };
      expect(f.keyword).toBe('crypto agent');
    });

    it('accepts name and description substring', () => {
      const f: SearchFilters = { name: 'AI', description: 'assistant' };
      expect(f.name).toBe('AI');
      expect(f.description).toBe('assistant');
    });

    it('accepts owners and operators', () => {
      const f: SearchFilters = {
        owners: ['0x1234567890123456789012345678901234567890'],
        operators: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
      };
      expect(f.owners).toHaveLength(1);
      expect(f.operators).toHaveLength(1);
    });

    it('accepts endpoint existence flags', () => {
      const f: SearchFilters = {
        hasMCP: true,
        hasA2A: true,
        hasOASF: true,
      };
      expect(f.hasMCP).toBe(true);
      expect(f.hasA2A).toBe(true);
      expect(f.hasOASF).toBe(true);
    });

    it('accepts capability arrays', () => {
      const f: SearchFilters = {
        mcpTools: ['tool1'],
        a2aSkills: ['python'],
        oasfSkills: ['data_engineering/data_transformation_pipeline'],
        oasfDomains: ['technology/data_science'],
      };
      expect(f.mcpTools).toContain('tool1');
      expect(f.a2aSkills).toContain('python');
    });

    it('accepts active and x402support', () => {
      const f: SearchFilters = { active: true, x402support: true };
      expect(f.active).toBe(true);
      expect(f.x402support).toBe(true);
    });

    it('accepts feedback filters', () => {
      const feedback: FeedbackFilters = {
        minValue: 80,
        maxValue: 100,
        tag: 'enterprise',
        includeRevoked: false,
      };
      const f: SearchFilters = { feedback: feedback };
      expect(f.feedback?.minValue).toBe(80);
      expect(f.feedback?.tag).toBe('enterprise');
    });

    it('accepts time filters', () => {
      const f: SearchFilters = {
        updatedAtFrom: 1700000000,
        updatedAtTo: Date.now(),
      };
      expect(typeof f.updatedAtFrom).toBe('number');
      expect(typeof f.updatedAtTo).toBe('number');
    });
  });

  describe('SearchOptions shape', () => {
    it('accepts empty options', () => {
      const o: SearchOptions = {};
      expect(o).toEqual({});
    });

    it('accepts sort', () => {
      const o: SearchOptions = {
        sort: ['updatedAt:desc', 'name:asc'],
      };
      expect(o.sort).toHaveLength(2);
    });

    it('accepts semanticMinScore and semanticTopK', () => {
      const o: SearchOptions = {
        semanticMinScore: 0.5,
        semanticTopK: 100,
      };
      expect(o.semanticMinScore).toBe(0.5);
      expect(o.semanticTopK).toBe(100);
    });
  });

  describe('filter combination', () => {
    it('keyword + chains is valid', () => {
      const filters: SearchFilters = { keyword: 'agent', chains: [1] };
      const options: SearchOptions = { semanticTopK: 20 };
      expect(filters.keyword).toBe('agent');
      expect(options.semanticTopK).toBe(20);
    });

    it('feedback filter with minValue and tag', () => {
      const filters: SearchFilters = {
        feedback: { minValue: 70, tag: 'data_analyst', includeRevoked: false },
      };
      expect(filters.feedback?.minValue).toBe(70);
      expect(filters.feedback?.tag).toBe('data_analyst');
    });
  });
});
