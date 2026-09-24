import { describe, it, expect } from 'vitest';
import { loadDoorNumbersForCommuneAsync, normalizeCommuneName, getDoorNumbersByCommune } from '@/lib/pada-database';

describe('PADA Cadastral Async Loader & Commune Normalization', () => {
  it('normalizes commune names correctly', () => {
    expect(normalizeCommuneName('cocody')).toBe('Cocody');
    expect(normalizeCommuneName('Yopougon ')).toBe('Yopougon');
    expect(normalizeCommuneName('ADJAMÉ')).toBe('Adjamé');
    expect(normalizeCommuneName('Port Bouet')).toBe('Port-Bouët');
  });

  it('loads doors asynchronously for valid communes', async () => {
    const doors = await loadDoorNumbersForCommuneAsync('Cocody');
    expect(doors).toBeDefined();
    expect(doors.length).toBeGreaterThan(0);
    const syncDoors = getDoorNumbersByCommune('Cocody');
    expect(doors.length).toBe(syncDoors.length);
  });

  it('returns empty array for invalid commune in async loader', async () => {
    const doors = await loadDoorNumbersForCommuneAsync('CommuneInexistante123');
    expect(doors).toEqual([]);
  });
});
