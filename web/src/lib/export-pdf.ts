import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ───── types (mirrors AdminStatsPage) ───── */
interface CommuneStat { commune: string; couleur: string; actifs: number; resolus: number; total: number; population: number }
interface CommuneServiceStat { commune: string; population: number; electricite_actifs: number; electricite_resolus: number; electricite_total: number; eau_actifs: number; eau_resolus: number; eau_total: number; mairie_actifs: number; mairie_resolus: number; mairie_total: number; electricite_verified: number; eau_verified: number; mairie_verified: number }
interface VulnerableStat { commune: string; total_actifs: number; total_impacted: number; total_babies: number; total_pregnant: number; total_elderly: number }
interface DurationStat { commune: string; avg_duration_minutes: number; total_resolved: number; total_active: number; longest_duration_minutes: number; service_type: string }

/* ───── colours ───── */
const PRIMARY: [number, number, number] = [245, 124, 0]; // orange brand
const DARK: [number, number, number] = [30, 30, 30];
const GREY: [number, number, number] = [120, 120, 120];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [248, 248, 248];
const RED: [number, number, number] = [220, 50, 50];
const GREEN: [number, number, number] = [34, 139, 34];

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/* ───── main ───── */
export async function exportPDF(
  stats: CommuneStat[],
  serviceStats: CommuneServiceStat[],
  vulnStats: VulnerableStat[],
  durationStats: DurationStat[],
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  const dateStr = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });

  // Totals
  const totalSig = stats.reduce((s, c) => s + c.total, 0);
  const totalAct = stats.reduce((s, c) => s + c.actifs, 0);
  const totalRes = stats.reduce((s, c) => s + c.resolus, 0);
  const totalPop = stats.reduce((s, c) => s + c.population, 0);
  const totalVuln = vulnStats.reduce((s, v) => s + v.total_babies + v.total_pregnant + v.total_elderly, 0);

  /* ─── helper: ensure space ─── */
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      addFooter();
      doc.addPage();
      y = 15;
    }
  };

  /* ─── footer ─── */
  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`SIGNA-CI — Rapport Partenarial & Données Territoriales — ${dateStr}`, margin, pageH - 8);
    doc.text(`Page ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
  };

  /* ═══════════════════════════════════════════
     PAGE 1 — COVER
  ═══════════════════════════════════════════ */
  // Orange header band
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 55, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...WHITE);
  doc.text("SIGNA-CI", margin, 25);

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport Statistiques & Suivi Territoriale PADA — Partenaires Institutionnels", margin, 35);

  doc.setFontSize(10);
  doc.text(`Généré le ${dateStr}`, margin, 46);

  // Subtitle area
  y = 70;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Plateforme citoyenne de suivi des coupures", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text("Électricité · Eau · Voirie & Infrastructures — Abidjan, Côte d'Ivoire", margin, y);

  // KPI boxes on cover
  y += 20;
  const boxW = (contentW - 12) / 4;
  const boxes = [
    { label: "Signalements", value: String(totalSig), color: DARK },
    { label: "Actifs", value: String(totalAct), color: PRIMARY },
    { label: `Résolus (${pct(totalRes, totalSig)}%)`, value: String(totalRes), color: GREEN },
    { label: "Vulnérables", value: String(totalVuln), color: RED },
  ];

  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, boxW, 28, 3, 3, "F");
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, boxW, 28, 3, 3, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...b.color);
    doc.text(b.value, x + boxW / 2, y + 13, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(b.label, x + boxW / 2, y + 22, { align: "center" });
  });

  y += 38;

  // Coverage info
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(`${stats.length} communes couvertes · ${(totalPop / 1000).toFixed(0)}k habitants`, margin, y);

  // Separator
  y += 12;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Methodology note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  const methodNote = [
    "Méthodologie : Les données sont collectées via la plateforme citoyenne YALO YA COURANT.",
    "Chaque signalement est soumis à un mécanisme de vérification communautaire (corroboration par les voisins).",
    "Le niveau d'urgence est calculé automatiquement en fonction de la présence de personnes vulnérables.",
    "1 signalement = 1 ménage impacté. Les données de populations vulnérables sont déclaratives.",
  ];
  methodNote.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });

  addFooter();

  /* ═══════════════════════════════════════════
     PAGE 2 — STATISTIQUES PAR COMMUNE
  ═══════════════════════════════════════════ */
  doc.addPage();
  y = 15;

  // Section title helper
  const sectionTitle = (title: string, icon?: string) => {
    ensureSpace(18);
    doc.setFillColor(...PRIMARY);
    doc.rect(margin, y, 3, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(`${icon ? icon + " " : ""}${title}`, margin + 6, y + 6);
    y += 14;
  };

  sectionTitle("Statistiques par commune");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Commune", "Population", "Total", "Actifs", "Résolus", "Résolution %", "Part %"]],
    body: [
      ...[...stats].sort((a, b) => b.total - a.total).map(c => [
        c.commune,
        c.population.toLocaleString("fr-FR"),
        c.total,
        c.actifs,
        c.resolus,
        `${pct(c.resolus, c.total)}%`,
        `${pct(c.total, totalSig)}%`,
      ]),
      [{ content: "TOTAL", styles: { fontStyle: "bold" as const } }, totalPop.toLocaleString("fr-FR"), totalSig, totalAct, totalRes, `${pct(totalRes, totalSig)}%`, "100%"],
    ],
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    styles: { cellPadding: 2.5, lineWidth: 0.1, lineColor: [220, 220, 220] },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  /* ═══════════════════════════════════════════
     SECTION — VENTILATION PAR SERVICE
  ═══════════════════════════════════════════ */
  sectionTitle("Ventilation par type de service");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Commune", "⚡ Total", "⚡ Actifs", "⚡ Vérifiés", "💧 Total", "💧 Actifs", "💧 Vérifiés", "🏗 Total", "🏗 Actifs", "🏗 Vérifiés"]],
    body: [...serviceStats].sort((a, b) => (b.electricite_total + b.eau_total + b.mairie_total) - (a.electricite_total + a.eau_total + a.mairie_total)).map(c => [
      c.commune,
      c.electricite_total, c.electricite_actifs, c.electricite_verified,
      c.eau_total, c.eau_actifs, c.eau_verified,
      c.mairie_total, c.mairie_actifs, c.mairie_verified,
    ]),
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    styles: { cellPadding: 2, lineWidth: 0.1, lineColor: [220, 220, 220] },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  /* ═══════════════════════════════════════════
     SECTION — POPULATIONS VULNÉRABLES
  ═══════════════════════════════════════════ */
  ensureSpace(50);
  sectionTitle("Impact sur les populations vulnérables", "❤");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Commune", "Actifs", "Impactés", "Nourrissons", "Enceintes", "Âgés", "Total vuln."]],
    body: [
      ...vulnStats.map(v => [
        v.commune,
        v.total_actifs,
        v.total_impacted,
        v.total_babies,
        v.total_pregnant,
        v.total_elderly,
        v.total_babies + v.total_pregnant + v.total_elderly,
      ]),
      [{
        content: "TOTAL", styles: { fontStyle: "bold" as const },
      },
        vulnStats.reduce((s, v) => s + v.total_actifs, 0),
        vulnStats.reduce((s, v) => s + v.total_impacted, 0),
        vulnStats.reduce((s, v) => s + v.total_babies, 0),
        vulnStats.reduce((s, v) => s + v.total_pregnant, 0),
        vulnStats.reduce((s, v) => s + v.total_elderly, 0),
        totalVuln,
      ],
    ],
    headStyles: { fillColor: [180, 40, 40] as [number, number, number], textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [255, 245, 245] as [number, number, number] },
    styles: { cellPadding: 2.5, lineWidth: 0.1, lineColor: [220, 220, 220] },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  /* ═══════════════════════════════════════════
     SECTION — DURÉES DES COUPURES
  ═══════════════════════════════════════════ */
  ensureSpace(50);
  sectionTitle("Durée moyenne des coupures");

  const durationRows = durationStats
    .filter(d => d.total_resolved > 0 || d.total_active > 0)
    .map(d => [
      d.commune,
      d.service_type === "electricity" ? "Électricité" : "Eau",
      `${Math.round(d.avg_duration_minutes)} min`,
      `${Math.round(d.longest_duration_minutes)} min`,
      d.total_resolved,
      d.total_active,
    ]);

  if (durationRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Commune", "Service", "Durée moy.", "Durée max", "Résolus", "Actifs"]],
      body: durationRows,
      headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: DARK },
      alternateRowStyles: { fillColor: LIGHT_BG },
      styles: { cellPadding: 2.5, lineWidth: 0.1, lineColor: [220, 220, 220] },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  /* ═══════════════════════════════════════════
     SECTION — INDICATEURS CLÉS PARTENAIRES
  ═══════════════════════════════════════════ */
  ensureSpace(60);
  sectionTitle("Indicateurs clés pour partenaires");

  const avgElec = durationStats.filter(d => d.service_type === "electricity" && d.avg_duration_minutes > 0);
  const avgWater = durationStats.filter(d => d.service_type === "water" && d.avg_duration_minutes > 0);
  const globalAvgElec = avgElec.length > 0 ? avgElec.reduce((s, d) => s + d.avg_duration_minutes, 0) / avgElec.length : 0;
  const globalAvgWater = avgWater.length > 0 ? avgWater.reduce((s, d) => s + d.avg_duration_minutes, 0) / avgWater.length : 0;
  const verifiedTotal = serviceStats.reduce((s, c) => s + c.electricite_verified + c.eau_verified + c.mairie_verified, 0);

  const kpis = [
    ["Durée moyenne coupure électricité", `${Math.round(globalAvgElec)} minutes`],
    ["Durée moyenne coupure eau", `${Math.round(globalAvgWater)} minutes`],
    ["Ménages actuellement en coupure", String(totalAct)],
    ["Personnes vulnérables en zone de coupure", String(totalVuln)],
    ["Signalements vérifiés par la communauté", `${verifiedTotal} (${pct(verifiedTotal, totalAct)}%)`],
    ["Taux de résolution global", `${pct(totalRes, totalSig)}%`],
    ["Population totale couverte", `${totalPop.toLocaleString("fr-FR")} habitants`],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Indicateur", "Valeur"]],
    body: kpis,
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 110 }, 1: { fontStyle: "bold", halign: "right" } },
    styles: { cellPadding: 3.5, lineWidth: 0.1, lineColor: [220, 220, 220] },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Confidentiality notice
  ensureSpace(20);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text("DOCUMENT CONFIDENTIEL", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GREY);
  doc.text("Ce rapport est destiné exclusivement aux partenaires institutionnels de YALO YA COURANT. Toute diffusion non autorisée est interdite.", margin + 4, y + 10);

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`YALO YA COURANT — Rapport confidentiel — ${dateStr}`, margin, pageH - 8);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  // Save
  const fileName = `rapport_yalo_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPORTERS SPÉCIALISÉS POUR RAPPORTS INSTITUTIONNELS (MAIRIES, CIE/SODECI, REGULATEURS)
   ══════════════════════════════════════════════════════════════════════════════ */

export interface ReportItem {
  id: string;
  commune: string;
  quartier: string;
  category: string;
  service_type: string;
  description: string;
  verifications: number;
  urgency: string;
  created_at: string;
  pada_formatted_address?: string | null;
  meter_number?: string | null;
  contract_type?: string | null;
  status?: string;
}

/**
 * 🏢 Rapport PDF Hebdomadaire Spécifique Mairie (14 Communes du Grand Abidjan)
 */
export async function exportMunicipalPDF(
  communeName: string,
  reports: ReportItem[],
  population: number = 0,
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  const dateStr = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  const weekLabel = format(new Date(), "'Semaine du' d MMMM yyyy", { locale: fr });

  const totalSig = reports.length;
  const totalActifs = reports.filter((r) => r.status !== "resolved").length;
  const totalResolus = reports.filter((r) => r.status === "resolved").length;
  const totalVerif = reports.reduce((sum, r) => sum + r.verifications, 0);

  // Cover / Header
  doc.setFillColor(22, 163, 74); // Green Municipal accent
  doc.rect(0, 0, pageW, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...WHITE);
  doc.text(`MAIRIE DE ${communeName.toUpperCase()}`, margin, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`SYNTHÈSE HEBDOMADAIRE VOIRIE & INFRASTRUCTURES — ${weekLabel}`, margin, 32);

  doc.setFontSize(9);
  doc.text(`Civic Signal (SIGNA·CI) · Généré le ${dateStr}`, margin, 42);

  y = 65;

  // KPI boxes
  const boxW = (contentW - 12) / 4;
  const boxes = [
    { label: "Voirie Signalée", value: String(totalSig), color: DARK },
    { label: "En cours / Actifs", value: String(totalActifs), color: PRIMARY },
    { label: `Résolus (${pct(totalResolus, totalSig)}%)`, value: String(totalResolus), color: GREEN },
    { label: "Citoyens Demandeurs", value: String(totalVerif), color: DARK },
  ];

  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, boxW, 26, 3, 3, "F");
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, boxW, 26, 3, 3, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...b.color);
    doc.text(b.value, x + boxW / 2, y + 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(b.label, x + boxW / 2, y + 20, { align: "center" });
  });

  y += 36;

  // Table per Quartier
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Points Noirs et Incidents par Quartier", margin, y);
  y += 6;

  const rows = reports.map((r) => [
    r.quartier,
    r.description.substring(0, 50) + (r.description.length > 50 ? "..." : ""),
    r.pada_formatted_address || "—",
    r.urgency === "critical" ? "🔴 Urgent" : r.urgency === "high" ? "🟠 Élevé" : "🟡 Moyen",
    `${r.verifications} citoyen(s)`,
    format(new Date(r.created_at), "dd/MM/yyyy"),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Quartier", "Incident / Description", "Adresse / PADA", "Priorité", "Soutiens", "Date"]],
    body: rows.length > 0 ? rows : [["—", "Aucun incident actif à signaler dans cette commune", "—", "—", "—", "—"]],
    headStyles: { fillColor: [22, 163, 74], textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    theme: "grid",
  });

  // Footer & Save
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`SIGNA·CI — Direction des Services Techniques Mairie de ${communeName}`, margin, pageH - 8);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(`rapport_hebdo_mairie_${communeName.toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/**
 * ⚡💧 Rapport PDF Hebdomadaire Concessionnaires (CIE / SODECI)
 */
export async function exportConcessionnairePDF(
  operator: "CIE" | "SODECI",
  reports: ReportItem[],
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  const isCIE = operator === "CIE";
  const brandColor: [number, number, number] = isCIE ? [245, 158, 11] : [14, 165, 233];
  const serviceLabel = isCIE ? "RÉSEAU ÉLECTRIQUE (CIE)" : "RÉSEAU D'EAU POTABLE (SODECI)";
  const dateStr = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });

  const totalSig = reports.length;
  const totalFoyers = reports.reduce((s, r) => s + r.verifications, 0);
  const criticalSig = reports.filter((r) => r.urgency === "critical" || r.urgency === "high").length;

  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageW, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text(`RAPPORT HEBDOMADAIRE D'INCIDENTS — ${operator}`, margin, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`CONSOLIDÉ ANOMALIES & COUPURES DE RÉSEAU — ${serviceLabel}`, margin, 32);

  doc.setFontSize(9);
  doc.text(`Civic Signal (SIGNA·CI) · Généré le ${dateStr}`, margin, 42);

  y = 65;

  // KPI boxes
  const boxW = (contentW - 9) / 3;
  const boxes = [
    { label: "Coupures / Alertes", value: String(totalSig), color: DARK },
    { label: "Foyers Confirmant", value: String(totalFoyers), color: brandColor },
    { label: "Pannes Priorité P1/P2", value: String(criticalSig), color: RED },
  ];

  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 4);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, boxW, 26, 3, 3, "F");
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(x, y, boxW, 26, 3, 3, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...b.color);
    doc.text(b.value, x + boxW / 2, y + 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(b.label, x + boxW / 2, y + 20, { align: "center" });
  });

  y += 36;

  // Table per Commune & Quartier
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Journal des Interventions Recommandées", margin, y);
  y += 6;

  const rows = reports.map((r) => [
    r.commune,
    r.quartier,
    r.description.substring(0, 45) + (r.description.length > 45 ? "..." : ""),
    r.meter_number ? `Compteur ${r.meter_number}` : "—",
    r.urgency === "critical" ? "🔴 P1 Critique" : "🟠 P2 Élevé",
    `${r.verifications} foyer(s)`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Commune", "Quartier", "Anomalie", "Réf. Compteur", "Urgence", "Foyers"]],
    body: rows.length > 0 ? rows : [["—", "—", "Aucune coupure réseau majeure en cours", "—", "—", "—"]],
    headStyles: { fillColor: brandColor, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    theme: "grid",
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`SIGNA·CI — Direction de la Exploitation ${operator}`, margin, pageH - 8);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(`rapport_hebdo_${operator.toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/**
 * ⚖️ Rapport PDF Hebdomadaire Régulateurs (ANARE-CI / ONEP)
 */
export async function exportRegulatorPDF(
  regulator: "ANARE" | "ONEP",
  reports: ReportItem[],
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  const isANARE = regulator === "ANARE";
  const brandColor: [number, number, number] = isANARE ? [217, 119, 6] : [2, 132, 199];
  const sectorLabel = isANARE ? "SECTEUR ÉLECTRICITÉ (ANARE-CI)" : "SECTEUR EAU POTABLE (ONEP)";
  const dateStr = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });

  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageW, 50, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text(`RAPPORT DE RÉGULATION — ${regulator}`, margin, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`AUDIT DE CONTINUITÉ DE SERVICE & CONFORMITÉ — ${sectorLabel}`, margin, 32);

  doc.setFontSize(9);
  doc.text(`Civic Signal (SIGNA·CI) · Généré le ${dateStr}`, margin, 42);

  y = 65;

  // Audit Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Synthèse de Qualité de Service par Commune", margin, y);
  y += 6;

  // Group by commune
  const communeMap = new Map<string, { total: number; critical: number; verif: number }>();
  for (const r of reports) {
    if (!communeMap.has(r.commune)) {
      communeMap.set(r.commune, { total: 0, critical: 0, verif: 0 });
    }
    const c = communeMap.get(r.commune)!;
    c.total += 1;
    if (r.urgency === "critical" || r.urgency === "high") c.critical += 1;
    c.verif += r.verifications;
  }

  const rows = [...communeMap.entries()].map(([commune, stats]) => [
    commune,
    stats.total,
    stats.critical,
    stats.verif,
    stats.critical > 3 ? "🔴 Vigilance Élevée" : "🟢 Conforme",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Commune", "Alertes Enregistrées", "Incidents Critiques", "Citoyens Impactés", "Évaluation Régulation"]],
    body: rows.length > 0 ? rows : [["Grand Abidjan", "0", "0", "0", "🟢 Continuité de service conforme"]],
    headStyles: { fillColor: brandColor, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    theme: "grid",
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(`SIGNA·CI — Observatoire de Régulation ${regulator}`, margin, pageH - 8);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  doc.save(`rapport_regulation_${regulator.toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

