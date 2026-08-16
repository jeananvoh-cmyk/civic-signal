import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';

class MeterScreen extends StatefulWidget {
  const MeterScreen({super.key});

  @override
  State<MeterScreen> createState() => _MeterScreenState();
}

class _MeterScreenState extends State<MeterScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _smsController = TextEditingController();
  final TextEditingController _kwhRemainingController = TextEditingController();
  final TextEditingController _rechargeAmountController = TextEditingController();
  final TextEditingController _rechargeKwhController = TextEditingController();

  // State
  double _remainingKwh = 45.8;
  double _avgKwhPerDay = 3.8;
  int _daysRemaining = 12;
  String _meterNumber = '1428592019';
  bool _isLoading = false;

  List<Map<String, dynamic>> _recharges = [
    {'date': '12 Août 2026', 'amount': '5 000 FCFA', 'kwh': '42.5 kWh', 'method': 'Wave'},
    {'date': '28 Juillet 2026', 'amount': '10 000 FCFA', 'kwh': '85.0 kWh', 'method': 'Orange Money'},
    {'date': '10 Juillet 2026', 'amount': '5 000 FCFA', 'kwh': '42.5 kWh', 'method': 'Moov Money'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _calculateEstimates();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _smsController.dispose();
    _kwhRemainingController.dispose();
    _rechargeAmountController.dispose();
    _rechargeKwhController.dispose();
    super.dispose();
  }

  void _calculateEstimates() {
    if (_avgKwhPerDay > 0) {
      setState(() {
        _daysRemaining = (_remainingKwh / _avgKwhPerDay).round();
      });
    }
  }

  void _parseCieSms() {
    final text = _smsController.text.trim();
    if (text.isEmpty) return;

    // CIE SMS Regex parser (Miroir de smsParser.ts)
    final meterMatch = RegExp(r'(?:Compteur|Ctr|N°)\s*[:=]?\s*(\d+)', caseSensitive: false).firstMatch(text);
    final kwhMatch = RegExp(r'(\d+(?:[.,]\d+)?)\s*kWh', caseSensitive: false).firstMatch(text);
    final amountMatch = RegExp(r'(\d+[\d\s]*)\s*(?:FCFA|F\s*CFA|CFA)', caseSensitive: false).firstMatch(text);

    if (kwhMatch != null || amountMatch != null) {
      final parsedKwh = kwhMatch != null ? double.tryParse(kwhMatch.group(1)!.replaceAll(',', '.')) ?? 42.5 : 42.5;
      final parsedAmount = amountMatch != null ? amountMatch.group(1)!.trim() : '5000';
      final parsedMeter = meterMatch?.group(1) ?? _meterNumber;

      setState(() {
        _meterNumber = parsedMeter;
        _remainingKwh += parsedKwh;
        _recharges.insert(0, {
          'date': 'Aujourd\'hui',
          'amount': '$parsedAmount FCFA',
          'kwh': '$parsedKwh kWh',
          'method': 'SMS Décodé',
        });
        _calculateEstimates();
      });

      _smsController.clear();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚡ SMS CIE décodé et recharge ajoutée avec succès !'),
          backgroundColor: AppTheme.secondaryEmerald,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'extraire les données du SMS. Vérifiez le texte.'), backgroundColor: Colors.red),
      );
    }
  }

  void _addManualReading() {
    final kwh = double.tryParse(_kwhRemainingController.text.trim().replaceAll(',', '.'));
    if (kwh == null || kwh < 0) return;

    setState(() {
      _remainingKwh = kwh;
      _calculateEstimates();
    });

    _kwhRemainingController.clear();
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('✓ Index compteur mis à jour.'), backgroundColor: AppTheme.secondaryEmerald),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final endDate = DateTime.now().add(Duration(days: _daysRemaining));

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Suivi de Compteur CIE', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryTeal,
          indicatorColor: AppTheme.primaryTeal,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'Tableau d\'estimation'),
            Tab(text: 'Historique des recharges'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ══════════════════════════════════════════════════════════
          // ONGLET 1 : ESTIMATION EN DIRECT (1:1 Web)
          // ══════════════════════════════════════════════════════════
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // CARTE PRINCIPALE ÉNERGIE
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withAlpha(40),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.zap, color: Color(0xFFFBBF24), size: 22),
                              ),
                              const SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Compteur Électricité', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                  Text('N° $_meterNumber', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                ],
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withAlpha(40),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFF10B981).withAlpha(80)),
                            ),
                            child: const Text('Actif', style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            _remainingKwh.toStringAsFixed(1),
                            style: GoogleFonts.outfit(fontSize: 44, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                          const SizedBox(width: 8),
                          const Text('kWh restants', style: TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Barre de progression
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: (_remainingKwh / 100).clamp(0.05, 1.0),
                          backgroundColor: Colors.white12,
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFBBF24)),
                          minHeight: 8,
                        ),
                      ),
                      const SizedBox(height: 20),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Autonomie estimée', style: TextStyle(color: Colors.white60, fontSize: 11)),
                              Text('~ $_daysRemaining jours', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('Fin de crédit prévue', style: TextStyle(color: Colors.white60, fontSize: 11)),
                              Text(
                                '${endDate.day} ${_getMonthName(endDate.month)} ${endDate.year}',
                                style: const TextStyle(color: Color(0xFFFBBF24), fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // DEUX BOUTONS D'ACTIONS (Ajouter recharge / Mettre à jour index)
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEA580C),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        icon: const Icon(LucideIcons.plusCircle, color: Colors.white, size: 18),
                        label: const Text('Recharger (SMS)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                        onPressed: _showAddRechargeModal,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          side: const BorderSide(color: AppTheme.primaryTeal, width: 1.5),
                        ),
                        icon: const Icon(LucideIcons.gauge, color: AppTheme.primaryTeal, size: 18),
                        label: const Text('Relever l\'index', style: TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold, fontSize: 13)),
                        onPressed: _showAddReadingModal,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // STATISTIQUES MOYENNES
                Text('Statistiques de consommation', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      _buildStatRow('Consommation moyenne / jour', '${_avgKwhPerDay.toStringAsFixed(1)} kWh / j', LucideIcons.trendingUp, const Color(0xFF0284C7)),
                      const Divider(height: 20),
                      _buildStatRow('Coût journalier estimé', '~ 350 FCFA / j', LucideIcons.coins, const Color(0xFF16A34A)),
                      const Divider(height: 20),
                      _buildStatRow('Niveau de confiance du calcul', 'Élevé (3 recharges analysées)', LucideIcons.shieldCheck, AppTheme.primaryTeal),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ══════════════════════════════════════════════════════════
          // ONGLET 2 : HISTORIQUE DES RECHARGES
          // ══════════════════════════════════════════════════════════
          ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _recharges.length,
            itemBuilder: (ctx, i) {
              final r = _recharges[i];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(LucideIcons.zap, color: Color(0xFFD97706), size: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r['amount'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          Text('${r['date']} · ${r['method']}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Text(r['kwh'] as String, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF16A34A))),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _showAddRechargeModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(LucideIcons.messageSquare, color: Color(0xFFEA580C)),
                const SizedBox(width: 10),
                Text('Coller le SMS de recharge CIE', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 10),
            const Text('Copiez et collez le SMS de confirmation reçu (Wave, Orange Money, Moov, MTN...) :', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            TextField(
              controller: _smsController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Ex: Achat credit CIE reussi. Ctr: 1428592019, Montant: 5000 FCFA, 42.5 kWh. Code: 1234-5678-9012...',
                hintStyle: const TextStyle(fontSize: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                onPressed: _parseCieSms,
                child: const Text('Décoder & Enregistrer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showAddReadingModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(LucideIcons.gauge, color: AppTheme.primaryTeal),
                const SizedBox(width: 10),
                Text('Mettre à jour l\'index du compteur', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 10),
            const Text('Saisissez le nombre de kWh actuellement affiché sur votre boîtier :', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            TextField(
              controller: _kwhRemainingController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                hintText: 'Ex: 38.2',
                suffixText: 'kWh',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                onPressed: _addManualReading,
                child: const Text('Valider l\'index', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
      ],
    );
  }

  String _getMonthName(int month) {
    const months = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
    return months[(month - 1).clamp(0, 11)];
  }
}
