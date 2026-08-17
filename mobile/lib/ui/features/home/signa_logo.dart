import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// 📍 Peintre Vectoriel Officiel SIGNA.ci :
/// Disque plein Vert Émeraude + Anneau blanc ouvert en C + Clé mécanique de réparation à +45°
class SignaLogoPainter extends CustomPainter {
  final bool isDark;

  SignaLogoPainter({this.isDark = false});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 100.0;
    canvas.save();
    canvas.scale(scale, scale);

    // 1. Fond Disque Plein Vert Émeraude
    final diskPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF10B981), Color(0xFF059669)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(const Rect.fromLTWH(2, 2, 96, 96))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(const Offset(50, 50), 47.5, diskPaint);

    // 2. Arc Blanc Intérieur ouvert à droite (forme en C)
    final ringPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7.5
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      const Rect.fromLTWH(17, 17, 66, 66),
      0.75, // Commence en bas à droite
      4.78, // Fait le tour vers le haut à droite
      false,
      ringPaint,
    );

    // 3. Clé mécanique de réparation diagonale blanche orientée à +45°
    canvas.save();
    canvas.translate(50, 50);
    canvas.rotate(0.785398); // +45 degrés (tête en haut à droite, manche en bas à gauche)
    canvas.translate(-50, -50);

    final whiteFill = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    final wrenchPath = Path();
    
    // Contour extérieur de la clé (tête ouverte + manche)
    wrenchPath.moveTo(44, 42);
    wrenchPath.cubicTo(34, 37, 30, 29, 32, 15);
    wrenchPath.cubicTo(32.5, 13, 35.5, 13, 38, 14.5);
    wrenchPath.lineTo(43, 24);
    wrenchPath.cubicTo(44.5, 27, 47, 29, 50, 29);
    wrenchPath.cubicTo(53, 29, 55.5, 27, 57, 24);
    wrenchPath.lineTo(62, 14.5);
    wrenchPath.cubicTo(64.5, 13, 67.5, 13, 68, 15);
    wrenchPath.cubicTo(70, 29, 66, 37, 56, 42);
    wrenchPath.lineTo(56, 74);
    wrenchPath.cubicTo(56, 78, 53.3, 81, 50, 81);
    wrenchPath.cubicTo(46.7, 81, 44, 78, 44, 74);
    wrenchPath.close();

    // Trou circulaire au bout du manche
    final holePath = Path()
      ..addOval(const Rect.fromLTWH(46.5, 71, 7, 7));

    final fullWrench = Path.combine(PathOperation.difference, wrenchPath, holePath);
    canvas.drawPath(fullWrench, whiteFill);

    canvas.restore();
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
    this.size = 38.0,
    this.showSlogan = false,
    this.isDark,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDarkMode = isDark ?? (Theme.of(context).brightness == Brightness.dark);
    final titleColor = textColor ?? (isDarkMode ? Colors.white : const Color(0xFF0F172A));

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // 🟢 Isotype Officiel Vectoriel
        CustomPaint(
          size: Size(size, size),
          painter: SignaLogoPainter(isDark: isDarkMode),
        ),
        const SizedBox(width: 9),
        // 🔤 Nom de marque SIGNA.ci horizontal (À CÔTÉ)
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
                  color: const Color(0xFF10B981),
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
