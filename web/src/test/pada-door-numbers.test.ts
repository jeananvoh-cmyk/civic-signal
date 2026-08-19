import { describe, it, expect } from 'vitest';
import { 
  PADA_DOOR_NUMBERS, 
  searchPadaWaysScored, 
  findClosestDoorOnWay, 
  searchClosestDoorNumbers,
  getDoorNumbersByCommune,
  getDoorNumbersByWay
} from '@/lib/pada-database';

describe('PADA Cadastral Door Numbers & Nearest Neighbour Interpolation', () => {
  it('charges properly the official PADA door numbers registry (22,794 doors across Abidjan)', () => {
    expect(PADA_DOOR_NUMBERS).toBeDefined();
    expect(PADA_DOOR_NUMBERS.length).toBe(22794);

    const first = PADA_DOOR_NUMBERS[0];
    expect(first).toHaveProperty('id_numero');
    expect(first).toHaveProperty('numero');
    expect(first).toHaveProperty('id_voie');
    expect(first).toHaveProperty('voie');
    expect(first).toHaveProperty('commune');
    expect(first).toHaveProperty('code_postal');
    expect(first).toHaveProperty('adresse_complete');
  });

  it('filters door numbers by commune and by way correctly across Abidjan', () => {
    const yopougonDoors = getDoorNumbersByCommune('Yopougon');
    expect(yopougonDoors.length).toBe(4198);

    const marcoryDoors = getDoorNumbersByCommune('Marcory');
    expect(marcoryDoors.length).toBe(2926);

    const aboboDoors = getDoorNumbersByCommune('Abobo');
    expect(aboboDoors.length).toBe(2569);

    const aboudramaneDoors = getDoorNumbersByWay('0100211ABO0636');
    expect(aboudramaneDoors.length).toBe(72);
  });

  it('identifies exact cadastral door matches with 100% score and official badge', () => {
    const exactResult = findClosestDoorOnWay('0100211ABO0636', 'AVENUE ABOUDRAMANE SANGARÉ', 243);
    expect(exactResult).not.toBeNull();
    expect(exactResult?.isExact).toBe(true);
    expect(exactResult?.delta).toBe(0);
    expect(exactResult?.exactDoorId).toBe('0100211ABO063600243');
    expect(exactResult?.reference).toContain('243, AVENUE ABOUDRAMANE SANGARÉ');

    // Test in search engine
    const searchResults = searchPadaWaysScored('243', 'Abobo');
    const top = searchResults.find(r => r.way.id === '0100211ABO0636' || r.way.nom.includes('ABOUDRAMANE'));
    expect(top).toBeDefined();
    expect(top?.isExactDoor).toBe(true);
    expect(top?.exactDoorId).toBe('0100211ABO063600243');
    expect(top?.score).toBe(100);
    expect(top?.probabilityLabel).toBe('Haute');
  });

  it('interpolates the nearest registered door neighbors when exact door is not in database', () => {
    // Door 245 does not have an exact cadastral plaque, but 243 and 246 exist
    const interpResult = findClosestDoorOnWay('0100211ABO0636', 'AVENUE ABOUDRAMANE SANGARÉ', 245);
    expect(interpResult).not.toBeNull();
    expect(interpResult?.isExact).toBe(false);
    expect(interpResult?.closest.numero).toBe(246);
    expect(interpResult?.delta).toBe(1);
    expect(interpResult?.lower?.numero).toBe(243);
    expect(interpResult?.higher?.numero).toBe(246);
    expect(interpResult?.reference).toBe('Entre le N° 243 et le N° 246');
  });

  it('ranks all matching and closest door addresses for single number input', () => {
    const closestDoors = searchClosestDoorNumbers(62, 'Abobo');
    expect(closestDoors.length).toBeGreaterThan(0);
    expect(closestDoors[0].isExact).toBe(true);
    expect(closestDoors[0].door.numero).toBe(62);
    expect(closestDoors[0].score).toBe(100);
  });
});
