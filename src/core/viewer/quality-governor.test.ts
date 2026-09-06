import { describe, expect, it } from 'vitest';
import { QualityGovernor } from './quality-governor';

describe('adaptive resolution', () => {
  it('reduces resolution only after sustained slow frames', () => {
    const governor = new QualityGovernor();
    for (let i = 0; i < 89; i++) expect(governor.sample(40, i * 40, 1.5)).toBeNull();
    expect(governor.sample(40, 3600, 1.5)).toBe(1.25);
  });
  it('does not treat idle gaps as rendering work', () => {
    const governor = new QualityGovernor();
    for (let i = 0; i < 200; i++) expect(governor.sample(1000, i * 1000, 1.5)).toBeNull();
  });
  it('keeps a conservative lower bound', () => {
    const governor = new QualityGovernor();
    for (let i = 0; i < 100; i++) expect(governor.sample(80, i * 80, 0.75)).toBeNull();
  });
});
