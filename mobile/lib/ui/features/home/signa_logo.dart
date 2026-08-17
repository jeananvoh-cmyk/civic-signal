import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// 📍 Peintre Vectoriel Officiel SIGNA-CI :
/// Balise Pin + Monogramme "S" central + 2 Ondes d'alerte solaires
class SignaLogoPainter extends CustomPainter {
  final bool isDark;

  SignaLogoPainter({this.isDark = false});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 100.0;
    canvas.save();
    canvas.scale(scale, scale);

    // 1. Dégradé Vert Émeraude -> Cyan Azur pour le Pin & "S"
    final pinPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF10B981), Color(0xFF0D9488), Color(0xFF0284C7)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(const Rect.fromLTWH(15, 10, 70, 85))
      ..style = PaintingStyle.fill;

    final pinPath = Path();
    // Contour extérieur du Pin de géolocalisation
    pinPath.moveTo(50, 12);
    pinPath.cubicTo(32, 12, 18, 26, 18, 44);
    pinPath.cubicTo(18, 64, 42, 86, 48, 91.5);
    pinPath.cubicTo(49.2, 92.5, 50.8, 92.5, 52, 91.5);
    pinPath.cubicTo(58, 86, 82, 64, 82, 44);
    pinPath.cubicTo(82, 26, 68, 12, 50, 12);
    pinPath.close();

    // Courbe intérieure formant le monogramme "S" de SIGNA
    pinPath.moveTo(50, 24);
    pinPath.cubicTo(59, 24, 67, 31, 67, 40);
    pinPath.cubicTo(67, 44, 64, 48, 60, 50);
    pinPath.cubicTo(54, 53, 44, 54, 44, 59);
    pinPath.cubicTo(44, 62, 47, 64, 51, 64);
    pinPath.cubicTo(56, 64, 61, 61, 63, 58);
    pinPath.lineTo(69, 63);
    pinPath.cubicTo(65, 69, 58, 72, 50, 72);
    pinPath.cubicTo(40, 72, 34, 66, 34, 58);
    pinPath.cubicTo(34, 50, 42, 47, 48, 44);
    pinPath.cubicTo(54, 42, 57, 40, 57, 37);
    pinPath.cubicTo(57, 33, 53, 31, 49, 31);
    pinPath.cubicTo(44, 31, 40, 34, 38, 38);
    pinPath.lineTo(31, 34);
    pinPath.cubicTo(34, 28, 42, 24, 50, 24);
    pinPath.close();

    pinPath.fillType = PathFillType.evenOdd;
    canvas.drawPath(pinPath, pinPaint);

    // 2. Dégradé Or Ambré Solaire pour les 2 Ondes de Signal
    final wavePaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFF59E0B), Color(0xFFEA580C)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(const Rect.fromLTWH(60, 15, 40, 60))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5.0
      ..strokeCap = StrokeCap.round;

    // Onde 1 (Intérieure)
    final wave1 = Path();
    wave1.moveTo(72, 26);
    wave1.cubicTo(78, 31, 82, 38, 82, 46);
    wave1.cubicTo(82, 54, 78, 61, 72, 66);
    canvas.drawPath(wave1, wavePaint);

    // Onde 2 (Extérieure)
    final wave2 = Path();
    wave2.moveTo(83, 18);
    wave2.cubicTo(91, 25, 96, 35, 96, 46);
    wave2.cubicTo(96, 57, 91, 67, 83, 74);
    canvas.drawPath(wave2, wavePaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class SignaLogoWidget extends StatelessWidget {
  final double size;
  final bool showSlogan;
  final bool? isDark;
  final Color? textColor;

  const SignaLogoWidget({
    super.key,
    this.size = 36.0,
    this.showSlogan = true,
    this.isDark,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    // Détection du mode sombre avec fallback sur le paramètre forcé
    final isDarkMode = isDark ?? (Theme.of(context).brightness == Brightness.dark);

    final titleColor = textColor ?? (isDarkMode ? Colors.white : const Color(0xFF0F172A));
    final dotCiColor = isDarkMode ? const Color(0xFF34D399) : const Color(0xFF059669);
    final sloganColor = isDarkMode ? const Color(0xFF94A3B8) : const Color(0xFF065F46);

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // 📍 Isotype Vectoriel Pur (100% identique au Web)
        CustomPaint(
          size: Size(size, size),
          painter: SignaLogoPainter(isDark: isDarkMode),
        ),
        const SizedBox(width: 8),

        // 🔤 Typographie SIGNA.ci & Slogan
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: 'SIGNA',
                    style: GoogleFonts.outfit(
                      fontSize: size * 0.52,
                      fontWeight: FontWeight.w900,
                      color: titleColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  TextSpan(
                    text: '.ci',
                    style: GoogleFonts.outfit(
                      fontSize: size * 0.52,
                      fontWeight: FontWeight.w900,
                      color: dotCiColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
            if (showSlogan) ...[
              const SizedBox(height: 1),
              Text(
                'SIGNALER. SUIVRE. RÉPARER.',
                style: GoogleFonts.inter(
                  fontSize: (size * 0.22).clamp(7.5, 11.0),
                  fontWeight: FontWeight.w800,
                  color: sloganColor,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
