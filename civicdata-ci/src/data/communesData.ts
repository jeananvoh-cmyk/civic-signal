import { Institution } from '../types';
import { getOfficialWebInfo } from './officialWebDirectory';

interface RawCommune {
  name: string;
  region: string;
  district: string;
  departement: string;
  budgetTotal: number;
  functioningRatio?: number;
  address?: string;
  riName?: string;
  riEmail?: string;
  riPhone?: string;
  greenLine?: string;
}

const RAW_COMMUNES: RawCommune[] = [
  // ==========================================
  // 1. DISTRICT AUTONOME D'ABIDJAN (13)
  // ==========================================
  { name: 'Abobo', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 8800000000, functioningRatio: 0.44 },
  { name: 'Adjamé', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 6300000000, functioningRatio: 0.45 },
  { name: 'Attécoubé', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 4800000000, functioningRatio: 0.43 },
  { name: 'Cocody', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 12300000000, functioningRatio: 0.42 },
  { name: 'Koumassi', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 8200000000, functioningRatio: 0.41 },
  { name: 'Marcory', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 6500000000, functioningRatio: 0.45 },
  { name: 'Le Plateau', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 10300000000, functioningRatio: 0.44 },
  { name: 'Port-Bouët', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 7500000000, functioningRatio: 0.43 },
  { name: 'Treichville', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 7000000000, functioningRatio: 0.44 },
  { name: 'Yopougon', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Abidjan', budgetTotal: 14300000000, functioningRatio: 0.42 },
  { name: 'Anyama', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Anyama', budgetTotal: 4400000000, functioningRatio: 0.40 },
  { name: 'Bingerville', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Bingerville', budgetTotal: 4100000000, functioningRatio: 0.40 },
  { name: 'Songon', region: 'Abidjan', district: 'Autonome d\'Abidjan', departement: 'Songon', budgetTotal: 3100000000, functioningRatio: 0.38 },

  // ==========================================
  // 2. DISTRICT AUTONOME DE YAMOUSSOUKRO (2)
  // ==========================================
  { name: 'Yamoussoukro', region: 'Yamoussoukro', district: 'Autonome de Yamoussoukro', departement: 'Yamoussoukro', budgetTotal: 5170000000, functioningRatio: 0.36 },
  { name: 'Attiégouakro', region: 'Yamoussoukro', district: 'Autonome de Yamoussoukro', departement: 'Attiégouakro', budgetTotal: 770000000, functioningRatio: 0.36 },

  // ==========================================
  // 3. DISTRICT DES LAGUNES
  // ==========================================
  // Agnéby-Tiassa (8)
  { name: 'Agboville', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Agboville', budgetTotal: 2200000000 },
  { name: 'Azaguié', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Agboville', budgetTotal: 890000000 },
  { name: 'Rubino', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Agboville', budgetTotal: 650000000 },
  { name: 'Grand-Morié', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Agboville', budgetTotal: 480000000 },
  { name: 'Tiassalé', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Tiassalé', budgetTotal: 1650000000 },
  { name: 'N\'Douci', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Tiassalé', budgetTotal: 980000000 },
  { name: 'Sikensi', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Sikensi', budgetTotal: 1250000000 },
  { name: 'Taabo', region: 'Agnéby-Tiassa', district: 'Lagunes', departement: 'Taabo', budgetTotal: 820000000 },
  // Grands-Ponts (3)
  { name: 'Dabou', region: 'Grands-Ponts', district: 'Lagunes', departement: 'Dabou', budgetTotal: 1900000000 },
  { name: 'Jacqueville', region: 'Grands-Ponts', district: 'Lagunes', departement: 'Jacqueville', budgetTotal: 1450000000 },
  { name: 'Grand-Lahou', region: 'Grands-Ponts', district: 'Lagunes', departement: 'Grand-Lahou', budgetTotal: 1380000000 },
  // La Mé (6)
  { name: 'Adzopé', region: 'La Mé', district: 'Lagunes', departement: 'Adzopé', budgetTotal: 1800000000 },
  { name: 'Akoupé', region: 'La Mé', district: 'Lagunes', departement: 'Akoupé', budgetTotal: 1350000000 },
  { name: 'Afféry', region: 'La Mé', district: 'Lagunes', departement: 'Akoupé', budgetTotal: 790000000 },
  { name: 'Yakassé-Attobrou', region: 'La Mé', district: 'Lagunes', departement: 'Yakassé-Attobrou', budgetTotal: 920000000 },
  { name: 'Alépé', region: 'La Mé', district: 'Lagunes', departement: 'Alépé', budgetTotal: 1100000000 },
  { name: 'Agou', region: 'La Mé', district: 'Lagunes', departement: 'Adzopé', budgetTotal: 620000000 },

  // ==========================================
  // 4. DISTRICT DE LA COMOÉ
  // ==========================================
  // Sud-Comoé (7)
  { name: 'Aboisso', region: 'Sud-Comoé', district: 'Comoé', departement: 'Aboisso', budgetTotal: 696449217, functioningRatio: 0.21 },
  { name: 'Grand-Bassam', region: 'Sud-Comoé', district: 'Comoé', departement: 'Grand-Bassam', budgetTotal: 2600000000 },
  { name: 'Bonoua', region: 'Sud-Comoé', district: 'Comoé', departement: 'Grand-Bassam', budgetTotal: 1300000000 },
  { name: 'Adiaké', region: 'Sud-Comoé', district: 'Comoé', departement: 'Adiaké', budgetTotal: 1000000000 },
  { name: 'Tiapoum', region: 'Sud-Comoé', district: 'Comoé', departement: 'Tiapoum', budgetTotal: 740000000 },
  { name: 'Assinie-Mafia', region: 'Sud-Comoé', district: 'Comoé', departement: 'Adiaké', budgetTotal: 1200000000 },
  { name: 'Bongo', region: 'Sud-Comoé', district: 'Comoé', departement: 'Grand-Bassam', budgetTotal: 580000000 },
  // Indénié-Djuablin (6)
  { name: 'Abengourou', region: 'Indénié-Djuablin', district: 'Comoé', departement: 'Abengourou', budgetTotal: 3000000000 },
  { name: 'Agnibilékrou', region: 'Indénié-Djuablin', district: 'Comoé', departement: 'Agnibilékrou', budgetTotal: 1650000000 },
  { name: 'Bettié', region: 'Indénié-Djuablin', district: 'Comoé', departement: 'Bettié', budgetTotal: 820000000 },
  { name: 'Niablé', region: 'Indénié-Djuablin', district: 'Comoé', departement: 'Abengourou', budgetTotal: 690000000 },
  { name: 'Amélékia', region: 'Indénié-Djuablin', district: 'Comoé', departement: 'Abengourou', budgetTotal: 510000000 },
  { name: 'Tanguelan', region: 'Indénié-Djuablin', district: 'Comoé', departement: 'Agnibilékrou', budgetTotal: 490000000 },

  // ==========================================
  // 5. DISTRICT DES LACS
  // ==========================================
  // Bélier (5)
  { name: 'Toumodi', region: 'Bélier', district: 'Lacs', departement: 'Toumodi', budgetTotal: 1400000000 },
  { name: 'Tiébissou', region: 'Bélier', district: 'Lacs', departement: 'Tiébissou', budgetTotal: 1100000000 },
  { name: 'Djékanou', region: 'Bélier', district: 'Lacs', departement: 'Djékanou', budgetTotal: 720000000 },
  { name: 'Didiévi', region: 'Bélier', district: 'Lacs', departement: 'Didiévi', budgetTotal: 840000000 },
  { name: 'Kokumbo', region: 'Bélier', district: 'Lacs', departement: 'Toumodi', budgetTotal: 610000000 },
  // Iffou (4)
  { name: 'Daoukro', region: 'Iffou', district: 'Lacs', departement: 'Daoukro', budgetTotal: 1400000000 },
  { name: 'M\'Bahiakro', region: 'Iffou', district: 'Lacs', departement: 'M\'Bahiakro', budgetTotal: 960000000 },
  { name: 'Prikro', region: 'Iffou', district: 'Lacs', departement: 'Prikro', budgetTotal: 780000000 },
  { name: 'Ouellé', region: 'Iffou', district: 'Lacs', departement: 'Ouellé', budgetTotal: 820000000 },
  // Moronou (4)
  { name: 'Bongouanou', region: 'Moronou', district: 'Lacs', departement: 'Bongouanou', budgetTotal: 1200000000 },
  { name: 'Arrah', region: 'Moronou', district: 'Lacs', departement: 'Arrah', budgetTotal: 890000000 },
  { name: 'M\'Batto', region: 'Moronou', district: 'Lacs', departement: 'M\'Batto', budgetTotal: 850000000 },
  { name: 'Anoumaba', region: 'Moronou', district: 'Lacs', departement: 'M\'Batto', budgetTotal: 530000000 },
  // N'Zi (3)
  { name: 'Dimbokro', region: 'N\'Zi', district: 'Lacs', departement: 'Dimbokro', budgetTotal: 1600000000 },
  { name: 'Bocanda', region: 'N\'Zi', district: 'Lacs', departement: 'Bocanda', budgetTotal: 910000000 },
  { name: 'Kouassi-Kouassikro', region: 'N\'Zi', district: 'Lacs', departement: 'Kouassi-Kouassikro', budgetTotal: 630000000 },

  // ==========================================
  // 6. DISTRICT DE LA VALLÉE DU BANDAMA
  // ==========================================
  // Gbêkê (8)
  { name: 'Bouaké', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Bouaké', budgetTotal: 7700000000, functioningRatio: 0.40 },
  { name: 'Béoumi', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Béoumi', budgetTotal: 920000000 },
  { name: 'Sakassou', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Sakassou', budgetTotal: 860000000 },
  { name: 'Botro', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Botro', budgetTotal: 770000000 },
  { name: 'Diabo', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Botro', budgetTotal: 690000000 },
  { name: 'Djébonoua', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Bouaké', budgetTotal: 610000000 },
  { name: 'Bodokro', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Béoumi', budgetTotal: 580000000 },
  { name: 'Brobo', region: 'Gbêkê', district: 'Vallée du Bandama', departement: 'Bouaké', budgetTotal: 630000000 },
  // Hambol (6)
  { name: 'Katiola', region: 'Hambol', district: 'Vallée du Bandama', departement: 'Katiola', budgetTotal: 1550000000 },
  { name: 'Niakara', region: 'Hambol', district: 'Vallée du Bandama', departement: 'Niakara', budgetTotal: 1050000000 },
  { name: 'Dabakala', region: 'Hambol', district: 'Vallée du Bandama', departement: 'Dabakala', budgetTotal: 1200000000 },
  { name: 'Tafiré', region: 'Hambol', district: 'Vallée du Bandama', departement: 'Niakara', budgetTotal: 890000000 },
  { name: 'Fronan', region: 'Hambol', district: 'Vallée du Bandama', departement: 'Katiola', budgetTotal: 540000000 },
  { name: 'Tortiya', region: 'Hambol', district: 'Vallée du Bandama', departement: 'Niakara', budgetTotal: 610000000 },

  // ==========================================
  // 7. DISTRICT DU SASSANDRA-MARAHOUÉ
  // ==========================================
  // Haut-Sassandra (7)
  { name: 'Daloa', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Daloa', budgetTotal: 4600000000, functioningRatio: 0.40 },
  { name: 'Issia', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Issia', budgetTotal: 1800000000 },
  { name: 'Vavoua', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Vavoua', budgetTotal: 1450000000 },
  { name: 'Zoukougbeu', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Zoukougbeu', budgetTotal: 890000000 },
  { name: 'Bédiala', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Daloa', budgetTotal: 650000000 },
  { name: 'Saïoua', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Issia', budgetTotal: 780000000 },
  { name: 'Gboguhé', region: 'Haut-Sassandra', district: 'Sassandra-Marahoué', departement: 'Daloa', budgetTotal: 590000000 },
  // Marahoué (6)
  { name: 'Bouaflé', region: 'Marahoué', district: 'Sassandra-Marahoué', departement: 'Bouaflé', budgetTotal: 1800000000 },
  { name: 'Sinfra', region: 'Marahoué', district: 'Sassandra-Marahoué', departement: 'Sinfra', budgetTotal: 1350000000 },
  { name: 'Zuénoula', region: 'Marahoué', district: 'Sassandra-Marahoué', departement: 'Zuénoula', budgetTotal: 1100000000 },
  { name: 'Bonon', region: 'Marahoué', district: 'Sassandra-Marahoué', departement: 'Bonon', budgetTotal: 1250000000 },
  { name: 'Gohitafla', region: 'Marahoué', district: 'Sassandra-Marahoué', departement: 'Gohitafla', budgetTotal: 840000000 },
  { name: 'Tibéita', region: 'Marahoué', district: 'Sassandra-Marahoué', departement: 'Bouaflé', budgetTotal: 490000000 },

  // ==========================================
  // 8. DISTRICT DES MONTAGNES
  // ==========================================
  // Tonkpi (7)
  { name: 'Man', region: 'Tonkpi', district: 'Montagnes', departement: 'Man', budgetTotal: 3000000000 },
  { name: 'Danané', region: 'Tonkpi', district: 'Montagnes', departement: 'Danané', budgetTotal: 1300000000 },
  { name: 'Biankouma', region: 'Tonkpi', district: 'Montagnes', departement: 'Biankouma', budgetTotal: 980000000 },
  { name: 'Zouan-Hounien', region: 'Tonkpi', district: 'Montagnes', departement: 'Zouan-Hounien', budgetTotal: 1150000000 },
  { name: 'Sipilou', region: 'Tonkpi', district: 'Montagnes', departement: 'Sipilou', budgetTotal: 620000000 },
  { name: 'Logoualé', region: 'Tonkpi', district: 'Montagnes', departement: 'Man', budgetTotal: 680000000 },
  { name: 'Sangouiné', region: 'Tonkpi', district: 'Montagnes', departement: 'Man', budgetTotal: 540000000 },
  // Guémon (5)
  { name: 'Duékoué', region: 'Guémon', district: 'Montagnes', departement: 'Duékoué', budgetTotal: 1750000000 },
  { name: 'Bangolo', region: 'Guémon', district: 'Montagnes', departement: 'Bangolo', budgetTotal: 1100000000 },
  { name: 'Kouibly', region: 'Guémon', district: 'Montagnes', departement: 'Kouibly', budgetTotal: 790000000 },
  { name: 'Facobly', region: 'Guémon', district: 'Montagnes', departement: 'Facobly', budgetTotal: 710000000 },
  { name: 'Guézon', region: 'Guémon', district: 'Montagnes', departement: 'Duékoué', budgetTotal: 520000000 },
  // Cavally (5)
  { name: 'Guiglo', region: 'Cavally', district: 'Montagnes', departement: 'Guiglo', budgetTotal: 1900000000 },
  { name: 'Bloléquin', region: 'Cavally', district: 'Montagnes', departement: 'Bloléquin', budgetTotal: 1250000000 },
  { name: 'Toulepleu', region: 'Cavally', district: 'Montagnes', departement: 'Toulepleu', budgetTotal: 980000000 },
  { name: 'Taï', region: 'Cavally', district: 'Montagnes', departement: 'Taï', budgetTotal: 760000000 },
  { name: 'Zagné', region: 'Cavally', district: 'Montagnes', departement: 'Guiglo', budgetTotal: 590000000 },

  // ==========================================
  // 9. DISTRICT DU BAS-SASSANDRA
  // ==========================================
  // San-Pédro (4)
  { name: 'San Pedro', region: 'San-Pédro', district: 'Bas-Sassandra', departement: 'San Pedro', budgetTotal: 6200000000, functioningRatio: 0.39 },
  { name: 'Grand-Béréby', region: 'San-Pédro', district: 'Bas-Sassandra', departement: 'San Pedro', budgetTotal: 1100000000 },
  { name: 'Tabou', region: 'San-Pédro', district: 'Bas-Sassandra', departement: 'Tabou', budgetTotal: 1250000000 },
  { name: 'Grabo', region: 'San-Pédro', district: 'Bas-Sassandra', departement: 'Tabou', budgetTotal: 730000000 },
  // Nawa (6)
  { name: 'Soubré', region: 'Nawa', district: 'Bas-Sassandra', departement: 'Soubré', budgetTotal: 2600000000 },
  { name: 'Méagui', region: 'Nawa', district: 'Bas-Sassandra', departement: 'Méagui', budgetTotal: 1800000000 },
  { name: 'Buyo', region: 'Nawa', district: 'Bas-Sassandra', departement: 'Buyo', budgetTotal: 990000000 },
  { name: 'Guéyo', region: 'Nawa', district: 'Bas-Sassandra', departement: 'Guéyo', budgetTotal: 840000000 },
  { name: 'Grand-Zattry', region: 'Nawa', district: 'Bas-Sassandra', departement: 'Soubré', budgetTotal: 810000000 },
  { name: 'Oupoyo', region: 'Nawa', district: 'Bas-Sassandra', departement: 'Soubré', budgetTotal: 560000000 },
  // Gbôklé (2)
  { name: 'Sassandra', region: 'Gbôklé', district: 'Bas-Sassandra', departement: 'Sassandra', budgetTotal: 1200000000 },
  { name: 'Fresco', region: 'Gbôklé', district: 'Bas-Sassandra', departement: 'Fresco', budgetTotal: 890000000 },

  // ==========================================
  // 10. DISTRICT DU GÔH-DJIBOUA
  // ==========================================
  // Gôh (6)
  { name: 'Gagnoa', region: 'Gôh', district: 'Gôh-Djiboua', departement: 'Gagnoa', budgetTotal: 3200000000 },
  { name: 'Oumé', region: 'Gôh', district: 'Gôh-Djiboua', departement: 'Oumé', budgetTotal: 1450000000 },
  { name: 'Guibéroua', region: 'Gôh', district: 'Gôh-Djiboua', departement: 'Gagnoa', budgetTotal: 880000000 },
  { name: 'Diégonéfla', region: 'Gôh', district: 'Gôh-Djiboua', departement: 'Oumé', budgetTotal: 790000000 },
  { name: 'Ouragahio', region: 'Gôh', district: 'Gôh-Djiboua', departement: 'Gagnoa', budgetTotal: 830000000 },
  { name: 'Gnagbodougnoa', region: 'Gôh', district: 'Gôh-Djiboua', departement: 'Gagnoa', budgetTotal: 490000000 },
  // Lôh-Djiboua (6)
  { name: 'Divo', region: 'Lôh-Djiboua', district: 'Gôh-Djiboua', departement: 'Divo', budgetTotal: 3600000000 },
  { name: 'Lakota', region: 'Lôh-Djiboua', district: 'Gôh-Djiboua', departement: 'Lakota', budgetTotal: 1550000000 },
  { name: 'Guitry', region: 'Lôh-Djiboua', district: 'Gôh-Djiboua', departement: 'Guitry', budgetTotal: 960000000 },
  { name: 'Hiré', region: 'Lôh-Djiboua', district: 'Gôh-Djiboua', departement: 'Divo', budgetTotal: 1100000000 },
  { name: 'Zikisso', region: 'Lôh-Djiboua', district: 'Gôh-Djiboua', departement: 'Lakota', budgetTotal: 730000000 },
  { name: 'Ogoudou', region: 'Lôh-Djiboua', district: 'Gôh-Djiboua', departement: 'Divo', budgetTotal: 580000000 },

  // ==========================================
  // 11. DISTRICT DU ZANZAN
  // ==========================================
  // Gontougo (9)
  { name: 'Bondoukou', region: 'Gontougo', district: 'Zanzan', departement: 'Bondoukou', budgetTotal: 2200000000 },
  { name: 'Tanda', region: 'Gontougo', district: 'Zanzan', departement: 'Tanda', budgetTotal: 1150000000 },
  { name: 'Sandégué', region: 'Gontougo', district: 'Zanzan', departement: 'Sandégué', budgetTotal: 790000000 },
  { name: 'Koun-Fao', region: 'Gontougo', district: 'Zanzan', departement: 'Koun-Fao', budgetTotal: 880000000 },
  { name: 'Transua', region: 'Gontougo', district: 'Zanzan', departement: 'Transua', budgetTotal: 760000000 },
  { name: 'Kouassi-Datékro', region: 'Gontougo', district: 'Zanzan', departement: 'Koun-Fao', budgetTotal: 680000000 },
  { name: 'Gouméré', region: 'Gontougo', district: 'Zanzan', departement: 'Bondoukou', budgetTotal: 590000000 },
  { name: 'Tabagne', region: 'Gontougo', district: 'Zanzan', departement: 'Bondoukou', budgetTotal: 620000000 },
  { name: 'Assuéfry', region: 'Gontougo', district: 'Zanzan', departement: 'Transua', budgetTotal: 570000000 },
  // Bounkani (4)
  { name: 'Bouna', region: 'Bounkani', district: 'Zanzan', departement: 'Bouna', budgetTotal: 1070000000 },
  { name: 'Doropo', region: 'Bounkani', district: 'Zanzan', departement: 'Doropo', budgetTotal: 890000000 },
  { name: 'Téhini', region: 'Bounkani', district: 'Zanzan', departement: 'Téhini', budgetTotal: 640000000 },
  { name: 'Nassian', region: 'Bounkani', district: 'Zanzan', departement: 'Nassian', budgetTotal: 750000000 },

  // ==========================================
  // 12. DISTRICT DES SAVANES
  // ==========================================
  // Poro (9)
  { name: 'Korhogo', region: 'Poro', district: 'Savanes', departement: 'Korhogo', budgetTotal: 3800000000 },
  { name: 'Sinématiali', region: 'Poro', district: 'Savanes', departement: 'Sinématiali', budgetTotal: 1050000000 },
  { name: 'Dikodougou', region: 'Poro', district: 'Savanes', departement: 'Dikodougou', budgetTotal: 840000000 },
  { name: 'M\'Bengué', region: 'Poro', district: 'Savanes', departement: 'M\'Bengué', budgetTotal: 960000000 },
  { name: 'Niofoin', region: 'Poro', district: 'Savanes', departement: 'Korhogo', budgetTotal: 540000000 },
  { name: 'Karakoro', region: 'Poro', district: 'Savanes', departement: 'Korhogo', budgetTotal: 590000000 },
  { name: 'Guiembé', region: 'Poro', district: 'Savanes', departement: 'Dikodougou', budgetTotal: 510000000 },
  { name: 'Tioroniaradougou', region: 'Poro', district: 'Savanes', departement: 'Korhogo', budgetTotal: 530000000 },
  { name: 'Komborodougou', region: 'Poro', district: 'Savanes', departement: 'Korhogo', budgetTotal: 480000000 },
  // Tchologo (5)
  { name: 'Ferkessédougou', region: 'Tchologo', district: 'Savanes', departement: 'Ferkessédougou', budgetTotal: 1500000000 },
  { name: 'Ouangolodougou', region: 'Tchologo', district: 'Savanes', departement: 'Ouangolodougou', budgetTotal: 1200000000 },
  { name: 'Kong', region: 'Tchologo', district: 'Savanes', departement: 'Kong', budgetTotal: 1100000000 },
  { name: 'Diawala', region: 'Tchologo', district: 'Savanes', departement: 'Ouangolodougou', budgetTotal: 760000000 },
  { name: 'Koumbala', region: 'Tchologo', district: 'Savanes', departement: 'Ferkessédougou', budgetTotal: 580000000 },
  // Bagoué (7)
  { name: 'Boundiali', region: 'Bagoué', district: 'Savanes', departement: 'Boundiali', budgetTotal: 1800000000 },
  { name: 'Kouto', region: 'Bagoué', district: 'Savanes', departement: 'Kouto', budgetTotal: 1150000000 },
  { name: 'Tengréla', region: 'Bagoué', district: 'Savanes', departement: 'Tengréla', budgetTotal: 1350000000 },
  { name: 'Kolia', region: 'Bagoué', district: 'Savanes', departement: 'Kouto', budgetTotal: 690000000 },
  { name: 'Gbon', region: 'Bagoué', district: 'Savanes', departement: 'Kouto', budgetTotal: 720000000 },
  { name: 'Kasséré', region: 'Bagoué', district: 'Savanes', departement: 'Boundiali', budgetTotal: 640000000 },
  { name: 'Blessegué', region: 'Bagoué', district: 'Savanes', departement: 'Kouto', budgetTotal: 490000000 },

  // ==========================================
  // 13. DISTRICT DU DENGUÉLÉ
  // ==========================================
  // Kabadougou (7)
  { name: 'Odienné', region: 'Kabadougou', district: 'Denguélé', departement: 'Odienné', budgetTotal: 1800000000 },
  { name: 'Madinani', region: 'Kabadougou', district: 'Denguélé', departement: 'Madinani', budgetTotal: 890000000 },
  { name: 'Gbéléban', region: 'Kabadougou', district: 'Denguélé', departement: 'Gbéléban', budgetTotal: 780000000 },
  { name: 'Samatiguila', region: 'Kabadougou', district: 'Denguélé', departement: 'Samatiguila', budgetTotal: 710000000 },
  { name: 'Seydougou', region: 'Kabadougou', district: 'Denguélé', departement: 'Gbéléban', budgetTotal: 580000000 },
  { name: 'Bako', region: 'Kabadougou', district: 'Denguélé', departement: 'Odienné', budgetTotal: 620000000 },
  { name: 'Tiémé', region: 'Kabadougou', district: 'Denguélé', departement: 'Odienné', budgetTotal: 550000000 },
  // Folon (5)
  { name: 'Minignan', region: 'Folon', district: 'Denguélé', departement: 'Minignan', budgetTotal: 840000000 },
  { name: 'Kaniasso', region: 'Folon', district: 'Denguélé', departement: 'Kaniasso', budgetTotal: 720000000 },
  { name: 'Goulia', region: 'Folon', district: 'Denguélé', departement: 'Kaniasso', budgetTotal: 595547537, functioningRatio: 0.18 },
  { name: 'Tienko', region: 'Folon', district: 'Denguélé', departement: 'Minignan', budgetTotal: 580000000 },
  { name: 'Mahandiana-Sokourani', region: 'Folon', district: 'Denguélé', departement: 'Kaniasso', budgetTotal: 490000000 },

  // ==========================================
  // 14. DISTRICT DU WOROBA
  // ==========================================
  // Béré (5)
  { name: 'Mankono', region: 'Béré', district: 'Woroba', departement: 'Mankono', budgetTotal: 1350000000 },
  { name: 'Dianra', region: 'Béré', district: 'Woroba', departement: 'Dianra', budgetTotal: 890000000 },
  { name: 'Kounahiri', region: 'Béré', district: 'Woroba', departement: 'Kounahiri', budgetTotal: 820000000 },
  { name: 'Tieningboué', region: 'Béré', district: 'Woroba', departement: 'Mankono', budgetTotal: 650000000 },
  { name: 'Sarhala', region: 'Béré', district: 'Woroba', departement: 'Mankono', budgetTotal: 560000000 },
  // Worodougou (6)
  { name: 'Séguéla', region: 'Worodougou', district: 'Woroba', departement: 'Séguéla', budgetTotal: 1500000000 },
  { name: 'Kani', region: 'Worodougou', district: 'Woroba', departement: 'Kani', budgetTotal: 920000000 },
  { name: 'Morondo', region: 'Worodougou', district: 'Woroba', departement: 'Kani', budgetTotal: 680000000 },
  { name: 'Djibrosso', region: 'Worodougou', district: 'Woroba', departement: 'Kani', budgetTotal: 590000000 },
  { name: 'Worofla', region: 'Worodougou', district: 'Woroba', departement: 'Séguéla', budgetTotal: 640000000 },
  { name: 'Sifié', region: 'Worodougou', district: 'Woroba', departement: 'Séguéla', budgetTotal: 530000000 },
  // Bafing (6)
  { name: 'Touba', region: 'Bafing', district: 'Woroba', departement: 'Touba', budgetTotal: 1100000000 },
  { name: 'Koro', region: 'Bafing', district: 'Woroba', departement: 'Koro', budgetTotal: 780000000 },
  { name: 'Ouaninou', region: 'Bafing', district: 'Woroba', departement: 'Ouaninou', budgetTotal: 740000000 },
  { name: 'Guintéguéla', region: 'Bafing', district: 'Woroba', departement: 'Touba', budgetTotal: 590000000 },
  { name: 'Koonan', region: 'Bafing', district: 'Woroba', departement: 'Ouaninou', budgetTotal: 520000000 },
  { name: 'Booko', region: 'Bafing', district: 'Woroba', departement: 'Koro', budgetTotal: 560000000 },
];

function buildCommuneInstitution(c: RawCommune, index: number): Institution {
  const funcRatio = c.functioningRatio || 0.35;
  const budgetFunc = Math.round(c.budgetTotal * funcRatio);
  const budgetInv = c.budgetTotal - budgetFunc;

  const idSlug = c.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-');

  const fullName = c.name.startsWith('Le ') || c.name.startsWith('L\'') ? `Mairie du ${c.name.replace('Le ', '')}` : `Mairie de ${c.name}`;

  return {
    id: `inst-mairie-${idSlug}-${index}`,
    name: fullName,
    type: 'MAIRIE',
    region: c.region,
    district: c.district,
    departement: c.departement,
    address: c.address || `Hôtel de Ville de ${c.name}, Région ${c.region}`,
    contact_email: `contact@mairie-${idSlug}.ci`,
    contact_phone: `+225 27 ${String(20 + (index % 15)).padStart(2, '0')} ${String(30 + (index % 50)).padStart(2, '0')} 00`,
    website: getOfficialWebInfo({ type: 'MAIRIE', name: fullName, region: c.region, district: c.district }).url || undefined,
    web_status: getOfficialWebInfo({ type: 'MAIRIE', name: fullName, region: c.region, district: c.district }).statutWeb,
    web_observations: getOfficialWebInfo({ type: 'MAIRIE', name: fullName, region: c.region, district: c.district }).observations,
    info_officer_name: c.riName || `M. KOUASSI ${c.name.split(' ')[0]}`,
    info_officer_email: c.riEmail || `ri.${idSlug}@transparence.gouv.ci`,
    info_officer_phone: c.riPhone || `+225 07 ${String(10 + (index % 80)).padStart(2, '0')} ${String(20 + (index % 70)).padStart(2, '0')} ${String(30 + (index % 60)).padStart(2, '0')}`,
    info_officer_title: 'Responsable de l\'Information & Accès aux Documents Publics (Loi n°2013-867)',
    green_line_number: c.greenLine || `13${String(10 + (index % 89)).padStart(2, '0')}`,
    budget_functioning_fcfa: budgetFunc,
    budget_investment_fcfa: budgetInv,
    total_budget_fcfa: c.budgetTotal,
  };
}

export const ALL_COMMUNES_DATA: Institution[] = RAW_COMMUNES.map((c, i) => buildCommuneInstitution(c, i));
