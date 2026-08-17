/// 📍 Peintre Vectoriel Officiel SIGNA.ci (Modèle 1 FixMyStreet Civic Tech) :
/// Disque plein Vert Émeraude + Anneau blanc + Clef de réparation blanche 45°
class SignaLogoPainter extends CustomPainter {
  final bool isDark;

  SignaLogoPainter({this.isDark = false});

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 100.0;
    canvas.save();
    canvas.scale(scale, scale);

    // 1. Fond Disque Plein Vert Émeraude Civique
    final diskPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF10B981), Color(0xFF059669)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(const Rect.fromLTWH(2, 2, 96, 96))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(const Offset(50, 50), 48, diskPaint);

    // 2. Anneau Blanc Intérieur
    final ringPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7.0
      ..strokeCap = StrokeCap.round;

    // Arc blanc ouvert
    canvas.drawArc(
      const Rect.fromLTWH(13, 13, 74, 74),
      -2.7,
      5.3,
      false,
      ringPaint,
    );

    // 3. Clef à molette diagonale blanche à 45°
    canvas.save();
    canvas.translate(50, 50);
    canvas.rotate(-0.785398); // -45 degrés
    canvas.translate(-50, -50);

    final whiteFill = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    // Manche de la clef avec trou à la base
    final handlePath = Path()
      ..addRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(44, 44, 12, 34), const Radius.circular(6)));
    
    // Petit trou au bout du manche
    final holePath = Path()
      ..addOval(const Rect.fromLTWH(47.5, 68, 5, 5));
    
    final handleWithHole = Path.combine(PathOperation.difference, handlePath, holePath);
    canvas.drawPath(handleWithHole, whiteFill);

    // Tête de clef ouverte
    final headPath = Path();
    headPath.moveTo(50, 16);
    headPath.cubicTo(37, 16, 28, 25, 28, 37);
    headPath.cubicTo(28, 43, 31.5, 48, 36.5, 51);
    headPath.lineTo(63.5, 51);
    headPath.cubicTo(68.5, 48, 72, 43, 72, 37);
    headPath.cubicTo(72, 25, 63, 16, 50, 16);
    headPath.close();

    // Mâchoire ouverte en C
    headPath.moveTo(50, 24);
    headPath.cubicTo(54, 24, 57.5, 26.5, 59, 30);
    headPath.lineTo(41, 30);
    headPath.cubicTo(42.5, 26.5, 46, 24, 50, 24);
    headPath.close();
    headPath.fillType = PathFillType.evenOdd;

    canvas.drawPath(headPath, whiteFill);
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
        // 🟢 Isotype Modèle 1 Vectoriel (Rendu pur 0ms, 100% visible jour & nuit)
        CustomPaint(
          size: Size(size, size),
          painter: SignaLogoPainter(isDark: isDarkMode),
        ),
        const SizedBox(width: 9),
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
