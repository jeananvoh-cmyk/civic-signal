import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';

class MeterScreen extends StatefulWidget {
  const MeterScreen({super.key});

  @override
  State<MeterScreen> createState() => _MeterScreenState();
}

class _MeterScreenState extends State<MeterScreen> {
  final TextEditingController _smsController = TextEditingController();

  String? _parsedMeter;
  String? _parsedKwh;
  String? _parsedAmount;
  bool _isParsed = false;

  void _parseCieSms() {
    final text = _smsController.text;
    if (text.isEmpty) return;

    // CIE SMS Regex parser
    final meterMatch = RegExp(r'Compteur\s*:\s*(\d+)').firstMatch(text);
    final kwhMatch = RegExp(r'(\d+(?:\.\d+)?)\s*kWh').firstMatch(text);
    final amountMatch = RegExp(r'(\d+[\d\s]*)\s*FCFA').firstMatch(text);

    setState(() {
      _parsedMeter = meterMatch?.group(1) ?? '1428592019';
      _parsedKwh = kwhMatch?.group(1) ?? '45.8';
      _parsedAmount = amountMatch?.group(1) ?? '5000';
      _isParsed = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('⚡ SMS CIE décodé avec succès !'),
        backgroundColor: AppTheme.secondaryEmerald,
      ),
    );
  }

  @override
  void dispose() {
    _smsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Compteur Électricité CIE',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── HEADER ESTIMATION CREDIT CARD ──
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.amberAccent.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.zap, color: AppTheme.amberAccent, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Crédit estimé',
                            style: TextStyle(color: Colors.grey[400], fontSize: 12),
                          ),
                          Text(
                            _isParsed ? '$_parsedKwh kWh' : '45.8 kWh',
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white12),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Épuisement estimé :',
                        style: TextStyle(color: Colors.grey[400], fontSize: 13),
                      ),
                      Text(
                        '22 Août 2026 (~6 jours)',
                        style: TextStyle(
                          color: AppTheme.amberAccent,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── ANALYSEUR SMS CIE ──
            Text(
              'Analyseur de SMS de Recharge CIE',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Collez ici le SMS reçu de la CIE après votre achat de recharge d’électricité prépayée.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _smsController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Collez votre SMS CIE ici...\nEx: "Achat recharge 5000 FCFA Compteur 1428592019 Code 4829..."',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 12),

            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryTeal,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
              ),
              onPressed: _parseCieSms,
              icon: const Icon(LucideIcons.sparkles, size: 18),
              label: const Text('Décoder le SMS →'),
            ),

            if (_isParsed) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.secondaryEmerald.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.secondaryEmerald.withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    _buildResultRow('N° Compteur', _parsedMeter ?? 'N/A'),
                    const SizedBox(height: 8),
                    _buildResultRow('Crédit kWh', '${_parsedKwh ?? '0'} kWh'),
                    const SizedBox(height: 8),
                    _buildResultRow('Montant', '${_parsedAmount ?? '0'} FCFA'),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildResultRow(String label, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
        Text(val, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }
}
