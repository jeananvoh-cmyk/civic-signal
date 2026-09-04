import type { PadaWay } from '@/lib/pada-database';

// Import all commune datasets
import aboboData from './communes/abobo.json';
import adjameData from './communes/adjame.json';
import anyamaData from './communes/anyama.json';
import attecoubeData from './communes/attecoube.json';
import bingervilleData from './communes/bingerville.json';
import cocodyData from './communes/cocody.json';
import koumassiData from './communes/koumassi.json';
import marcoryData from './communes/marcory.json';
import plateauData from './communes/plateau.json';
import portBouetData from './communes/port-bouet.json';
import songonData from './communes/songon.json';
import treichvilleData from './communes/treichville.json';
import yopougonData from './communes/yopougon.json';

// Split door datasets per commune (divided from monolithic dataset)
import aboboDoors from './doors/abobo.json';
import adjameDoors from './doors/adjame.json';
import anyamaDoors from './doors/anyama.json';
import attecoubeDoors from './doors/attecoube.json';
import bingervilleDoors from './doors/bingerville.json';
import cocodyDoors from './doors/cocody.json';
import koumassiDoors from './doors/koumassi.json';
import marcoryDoors from './doors/marcory.json';
import plateauDoors from './doors/plateau.json';
import portBouetDoors from './doors/port-bouet.json';
import songonDoors from './doors/songon.json';
import treichvilleDoors from './doors/treichville.json';
import yopougonDoors from './doors/yopougon.json';

export const PADA_COMMUNES_REGISTRY: Record<string, PadaWay[]> = {
  'Abobo': aboboData as PadaWay[],
  'Adjamé': adjameData as PadaWay[],
  'Anyama': anyamaData as PadaWay[],
  'Attécoubé': attecoubeData as PadaWay[],
  'Bingerville': bingervilleData as PadaWay[],
  'Cocody': cocodyData as PadaWay[],
  'Koumassi': koumassiData as PadaWay[],
  'Marcory': marcoryData as PadaWay[],
  'Plateau': plateauData as PadaWay[],
  'Port-Bouët': portBouetData as PadaWay[],
  'Songon': songonData as PadaWay[],
  'Treichville': treichvilleData as PadaWay[],
  'Yopougon': yopougonData as PadaWay[],
};

export const PADA_COMMUNE_DOORS_REGISTRY: Record<string, PadaDoorNumber[]> = {
  'Abobo': aboboDoors as PadaDoorNumber[],
  'Adjamé': adjameDoors as PadaDoorNumber[],
  'Anyama': anyamaDoors as PadaDoorNumber[],
  'Attécoubé': attecoubeDoors as PadaDoorNumber[],
  'Bingerville': bingervilleDoors as PadaDoorNumber[],
  'Cocody': cocodyDoors as PadaDoorNumber[],
  'Koumassi': koumassiDoors as PadaDoorNumber[],
  'Marcory': marcoryDoors as PadaDoorNumber[],
  'Plateau': plateauDoors as PadaDoorNumber[],
  'Port-Bouët': portBouetDoors as PadaDoorNumber[],
  'Songon': songonDoors as PadaDoorNumber[],
  'Treichville': treichvilleDoors as PadaDoorNumber[],
  'Yopougon': yopougonDoors as PadaDoorNumber[],
};

/**
 * Returns all official PADA ways for a given commune
 */
export function getWaysByCommune(commune: string): PadaWay[] {
  const norm = normalizeCommuneName(commune);
  return PADA_COMMUNES_REGISTRY[norm] || [];
}

/**
 * Returns the total count of official ways registered in the PADA database
 */
export function getTotalOfficialWaysCount(): number {
  let count = 0;
  for (const list of Object.values(PADA_COMMUNES_REGISTRY)) {
    count += list.length;
  }
  return count;
}

export interface PadaDoorNumber {
  id_numero: string;
  numero: number;
  id_voie: string;
  voie: string;
  code_postal: string;
  commune: string;
  district: string;
  pays: string;
  adresse_complete: string;
}

// Flat list for global queries and vitest compatibility
export const PADA_DOOR_NUMBERS: PadaDoorNumber[] = [
  ...aboboDoors,
  ...adjameDoors,
  ...anyamaDoors,
  ...attecoubeDoors,
  ...bingervilleDoors,
  ...cocodyDoors,
  ...koumassiDoors,
  ...marcoryDoors,
  ...plateauDoors,
  ...portBouetDoors,
  ...songonDoors,
  ...treichvilleDoors,
  ...yopougonDoors,
] as PadaDoorNumber[];

function cleanWayName(name: string): string {
  return (name || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(avenue|rue|boulevard|boulevar|av\.|bd)\s+/i, '')
    .replace(/[^a-z0-9]/gi, '');
}

// Pre-built index maps for instant O(1) searches
const DOORS_BY_WAY_ID = new Map<string, PadaDoorNumber[]>();
const DOORS_BY_COMMUNE = new Map<string, PadaDoorNumber[]>();
const DOORS_BY_CLEAN_NAME = new Map<string, PadaDoorNumber[]>();

PADA_DOOR_NUMBERS.forEach(door => {
  // Way ID
  const wayId = door.id_voie.toUpperCase();
  let listId = DOORS_BY_WAY_ID.get(wayId);
  if (!listId) {
    listId = [];
    DOORS_BY_WAY_ID.set(wayId, listId);
  }
  listId.push(door);

  // Commune
  const normCom = normalizeCommuneName(door.commune).toLowerCase();
  let listCom = DOORS_BY_COMMUNE.get(normCom);
  if (!listCom) {
    listCom = [];
    DOORS_BY_COMMUNE.set(normCom, listCom);
  }
  listCom.push(door);

  // Clean Name
  const clean = cleanWayName(door.voie);
  if (clean) {
    let listClean = DOORS_BY_CLEAN_NAME.get(clean);
    if (!listClean) {
      listClean = [];
      DOORS_BY_CLEAN_NAME.set(clean, listClean);
    }
    listClean.push(door);
  }
});

/**
 * Returns all door numbers for a given commune with fast O(1) index
 */
export function getDoorNumbersByCommune(commune: string): PadaDoorNumber[] {
  const norm = normalizeCommuneName(commune).toLowerCase();
  return DOORS_BY_COMMUNE.get(norm) || PADA_COMMUNE_DOORS_REGISTRY[normalizeCommuneName(commune)] || [];
}

/**
 * Returns all door numbers for a given way ID or way name with fast lookup
 */
export function getDoorNumbersByWay(wayIdOrName: string): PadaDoorNumber[] {
  const q = wayIdOrName.trim().toUpperCase();
  if (DOORS_BY_WAY_ID.has(q)) {
    return DOORS_BY_WAY_ID.get(q)!;
  }
  const clean = cleanWayName(wayIdOrName);
  if (clean && DOORS_BY_CLEAN_NAME.has(clean)) {
    return DOORS_BY_CLEAN_NAME.get(clean)!;
  }
  return PADA_DOOR_NUMBERS.filter(d => d.id_voie.toLowerCase() === wayIdOrName.toLowerCase() || d.voie.toLowerCase().includes(wayIdOrName.toLowerCase()));
}

/**
 * Ultra-fast lookup for closest door matching
 */
export function getDoorsByWayFast(wayId: string, wayNom: string): PadaDoorNumber[] {
  if (wayId) {
    const list = DOORS_BY_WAY_ID.get(wayId.toUpperCase());
    if (list && list.length > 0) return list;
  }
  const clean = cleanWayName(wayNom);
  if (clean) {
    const list = DOORS_BY_CLEAN_NAME.get(clean);
    if (list && list.length > 0) return list;
  }
  return [];
}

/**
 * Normalize commune name variations
 */
export function normalizeCommuneName(commune: string): string {
  const c = commune.trim().toLowerCase();
  if (c.includes('cocody')) return 'Cocody';
  if (c.includes('abobo')) return 'Abobo';
  if (c.includes('adjam') || c.includes('adjame')) return 'Adjamé';
  if (c.includes('att') || c.includes('attecoube')) return 'Attécoubé';
  if (c.includes('bingerville')) return 'Bingerville';
  if (c.includes('koumassi')) return 'Koumassi';
  if (c.includes('marcory')) return 'Marcory';
  if (c.includes('plateau')) return 'Plateau';
  if (c.includes('port') || c.includes('bouet') || c.includes('bouët')) return 'Port-Bouët';
  if (c.includes('songon')) return 'Songon';
  if (c.includes('treich') || c.includes('treichville')) return 'Treichville';
  if (c.includes('yopougon')) return 'Yopougon';
  if (c.includes('anyama')) return 'Anyama';
  return commune;
}
