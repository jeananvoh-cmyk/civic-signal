import { describe, it, expect } from 'vitest';
import { formatFCFA, formatAmountInWords, formatCompactFCFA, getProjectEntityInfo, getStatusConfig, getProjectTier, getProjectTierBadge, getInstitutionLeaderGender } from '../formatters';

describe('Formatters Unit Tests', () => {
  it('formats FCFA amounts with space separators', () => {
    expect(formatFCFA(1000000)).toBe('1 000 000 FCFA');
    expect(formatFCFA(450000)).toBe('450 000 FCFA');
    expect(formatFCFA(0)).toBe('0 FCFA');
  });

  it('translates amounts into French words correctly', () => {
    expect(formatAmountInWords(100000000)).toMatch(/100\sMillions/);
    expect(formatAmountInWords(1500000000)).toMatch(/1,5\sMilliard/);
    expect(formatAmountInWords(2000000000)).toMatch(/2\sMilliards/);
    expect(formatAmountInWords(350000)).toMatch(/350\sMille/);
    expect(formatAmountInWords(0)).toBe('0 FCFA');
  });

  it('formats compact FCFA for badges', () => {
    expect(formatCompactFCFA(2000000000)).toBe('2,0 Milliards FCFA');
    expect(formatCompactFCFA(50000000)).toBe('50 Millions FCFA');
  });

  it('detects entity info and clean location without duplicates', () => {
    // Mairie
    const mairie = getProjectEntityInfo('Mairie de Korhogo', 'Poro');
    expect(mairie.entityType).toBe('MAIRIE');
    expect(mairie.entityName).toBe('Mairie de Korhogo');
    expect(mairie.locationLabel).toBe('Korhogo (Poro)');

    // Conseil Régional
    const reg = getProjectEntityInfo('Conseil Régional Cavally', 'Cavally');
    expect(reg.entityType).toBe('REGION');
    expect(reg.entityName).toBe('Conseil Régional Cavally');
    expect(reg.locationLabel).toBe('Région Cavally');

    // District
    const dist = getProjectEntityInfo('District Autonome Yamoussoukro', 'Yamoussoukro');
    expect(dist.entityType).toBe('DISTRICT');
    expect(dist.entityName).toBe('District Autonome Yamoussoukro');
  });

  it('returns valid status config', () => {
    const notStarted = getStatusConfig('NOT_STARTED');
    expect(notStarted.label).toBe('Voté au Budget');
    expect(notStarted.icon).toBe('️');

    const inProgress = getStatusConfig('IN_PROGRESS');
    expect(inProgress.label).toBe('En cours');

    const completed = getStatusConfig('COMPLETED');
    expect(completed.label).toBe('Terminé / Livré');
  });

  it('classifies project tiers correctly (MUNICIPAL vs REGIONAL vs STATE)', () => {
    // Explicit tier
    expect(getProjectTier({ project_tier: 'MUNICIPAL' })).toBe('MUNICIPAL');
    expect(getProjectTier({ project_tier: 'STATE' })).toBe('STATE');

    // Bouaké flagship project
    expect(getProjectTier({ id: 'proj-bouake-maby-marche' })).toBe('MUNICIPAL');
    
    // Municipal CSV ID
    expect(getProjectTier({ id: 'proj-com-2275', commune_name: 'Bouaké' })).toBe('MUNICIPAL');

    // Regional Council CSV ID
    expect(getProjectTier({ id: 'proj-reg-312', region_name: 'Gbêkê' })).toBe('REGIONAL');

    // National project
    expect(getProjectTier({ id: 'proj-nat-100', scope_level: 'NATIONAL' })).toBe('STATE');

    // Badge styling and labels
    const muniBadge = getProjectTierBadge('MUNICIPAL');
    expect(muniBadge.label).toBe('Projet Municipal');
    expect(muniBadge.icon).toBe('');

    const regBadge = getProjectTierBadge('REGIONAL');
    expect(regBadge.label).toBe('Conseil Régional');
    expect(regBadge.icon).toBe('');

    const stateBadge = getProjectTierBadge('STATE');
    expect(stateBadge.label).toBe("Investissement de l'État");
    expect(stateBadge.icon).toBe('');
  });

  it('determines leader gender accurately according to Loi n°2019-870 and CEI results', () => {
    // 1. Regional councils (2 female presidents in Côte d'Ivoire)
    const cavally: any = {
      id: 'inst-reg-conseil-regional-du-cavally',
      name: 'Conseil Régional du Cavally',
      type: 'REGION',
      leader_name: 'OULOTO ANNE DESIREE'
    };
    const moronou: any = {
      id: 'inst-reg-conseil-regional-du-moronou',
      name: 'Conseil Régional du Moronou',
      type: 'REGION',
      leader_name: 'AKA AMANAN VERONIQUE'
    };
    const agneby: any = {
      id: 'inst-reg-conseil-regional-de-l-agneby-tiassa',
      name: "Conseil Régional de l'Agneby-Tiassa",
      type: 'REGION',
      leader_name: "DIMBA N'GOU PIERRE"
    };

    expect(getInstitutionLeaderGender(cavally)).toBe('F');
    expect(getInstitutionLeaderGender(moronou)).toBe('F');
    expect(getInstitutionLeaderGender(agneby)).toBe('M');

    // 2. Communes (25 female mayors out of 201)
    const abobo: any = {
      id: 'inst-com-abobo',
      name: 'Mairie de Abobo',
      type: 'MAIRIE',
      leader_name: 'KAMISSOKO KANDIA'
    };
    const gohitafla: any = {
      id: 'inst-com-gohitafla',
      name: 'Mairie de Gohitafla',
      type: 'MAIRIE',
      leader_name: 'ZAMBLE NAYA NAOMI JARVIS'
    };
    const cocody: any = {
      id: 'inst-com-cocody',
      name: 'Mairie de Cocody',
      type: 'MAIRIE',
      leader_name: 'YACE JEAN-MARC'
    };
    const yopougon: any = {
      id: 'inst-com-yopougon',
      name: 'Mairie de Yopougon',
      type: 'MAIRIE',
      leader_name: 'BICTOGO ADAMA'
    };

    expect(getInstitutionLeaderGender(abobo)).toBe('F');
    expect(getInstitutionLeaderGender(gohitafla)).toBe('F');
    expect(getInstitutionLeaderGender(cocody)).toBe('M');
    expect(getInstitutionLeaderGender(yopougon)).toBe('M');

    // 3. Explicit leader_gender attribute override
    const customInst: any = {
      id: 'custom-1',
      name: 'Entité test',
      type: 'MAIRIE',
      leader_name: 'DOE JANE',
      leader_gender: 'F'
    };
    expect(getInstitutionLeaderGender(customInst)).toBe('F');
  });
});

