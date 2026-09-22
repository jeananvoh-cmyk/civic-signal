import { describe, it, expect } from 'vitest';
import { ALL_COMMUNES_DATA, ALL_REGIONS_DATA } from '../../data/institutionsData';
import { getOfficialWebInfo } from '../../data/officialWebDirectory';

describe('Audit & Répertoire Officiel des Sites Web des Collectivités', () => {
  it('doit contenir exactement 201 communes', () => {
    expect(ALL_COMMUNES_DATA.length).toBe(201);
  });

  it('doit identifier exactement 7 mairies avec site web fonctionnel', () => {
    const fonctionnelles = ALL_COMMUNES_DATA.filter(c => c.web_status === 'FONCTIONNEL');
    expect(fonctionnelles.length).toBe(7);

    const names = fonctionnelles.map(c => c.name);
    expect(names.some(n => n.includes('Plateau'))).toBe(true);
    expect(names.some(n => n.includes('Cocody'))).toBe(true);
    expect(names.some(n => n.toLowerCase().includes('bouak'))).toBe(true);
    expect(names.some(n => n.includes('Port-Bouët'))).toBe(true);
    expect(names.some(n => n.includes('Treichville'))).toBe(true);
    expect(names.some(n => n.includes('Koumassi'))).toBe(true);
    expect(names.some(n => n.toLowerCase().includes('san-pedro'))).toBe(true);
  });

  it('doit identifier exactement 10 mairies avec site officiel inactif ou en maintenance', () => {
    const inactives = ALL_COMMUNES_DATA.filter(c => c.web_status === 'INACTIF');
    expect(inactives.length).toBe(10);

    const names = inactives.map(c => c.name);
    expect(names.some(n => n.includes('Yopougon'))).toBe(true);
    expect(names.some(n => n.includes('Abobo'))).toBe(true);
    expect(names.some(n => n.includes('Marcory'))).toBe(true);
    expect(names.some(n => n.toLowerCase().includes('bassam'))).toBe(true);
    expect(names.some(n => n.includes('Daloa'))).toBe(true);
    expect(names.some(n => n.includes('Korhogo'))).toBe(true);
    expect(names.some(n => n.includes('Yamoussoukro'))).toBe(true);
    expect(names.some(n => n.includes('Adjamé'))).toBe(true);
    expect(names.some(n => n.includes('Attécoubé'))).toBe(true);
    expect(names.some(n => n.includes('Bingerville'))).toBe(true);
  });

  it('doit identifier exactement 184 mairies sans aucun site web officiel', () => {
    const sansSite = ALL_COMMUNES_DATA.filter(c => c.web_status === 'AUCUN');
    expect(sansSite.length).toBe(184);
    sansSite.forEach(c => {
      expect(c.website).toBeUndefined();
    });
  });

  it('doit contenir 33 régions et districts territoriaux', () => {
    expect(ALL_REGIONS_DATA.length).toBe(33);
  });

  it('doit identifier 8 conseils régionaux et districts avec site fonctionnel', () => {
    const fonctionnels = ALL_REGIONS_DATA.filter(r => r.web_status === 'FONCTIONNEL');
    expect(fonctionnels.length).toBe(8);

    const names = fonctionnels.map(r => r.name);
    expect(names.some(n => n.includes('Gontougo'))).toBe(true);
    expect(names.some(n => n.includes('Haut-Sassandra') || n.includes('Haut Sassandra'))).toBe(true);
    expect(names.some(n => n.includes('La Mé'))).toBe(true);
    expect(names.some(n => n.includes('Grands Ponts') || n.includes('Grands-Ponts'))).toBe(true);
    expect(names.some(n => n.includes('Moronou'))).toBe(true);
    expect(names.some(n => n.includes('Gbêkê'))).toBe(true);
    expect(names.some(n => n.includes('District Autonome d\'Abidjan'))).toBe(true);
    expect(names.some(n => n.includes('District Autonome de Yamoussoukro'))).toBe(true);
  });

  it('doit identifier 6 conseils régionaux avec site inactif / maintenance', () => {
    const inactifs = ALL_REGIONS_DATA.filter(r => r.web_status === 'INACTIF');
    expect(inactifs.length).toBe(6);

    const names = inactifs.map(r => r.name);
    expect(names.some(n => n.includes('Tonkpi'))).toBe(true);
    expect(names.some(n => n.includes('Poro'))).toBe(true);
    expect(names.some(n => n.includes('Belier') || n.includes('Bélier'))).toBe(true);
    expect(names.some(n => n.includes('San Pedro') || n.includes('San-Pédro'))).toBe(true);
    expect(names.some(n => n.includes('Nawa'))).toBe(true);
    expect(names.some(n => n.includes('Indenié') || n.includes('Indénié'))).toBe(true);
  });

  it('doit identifier 19 conseils régionaux sans aucun site web officiel', () => {
    const sansSite = ALL_REGIONS_DATA.filter(r => r.web_status === 'AUCUN');
    expect(sansSite.length).toBe(19);
  });
});
