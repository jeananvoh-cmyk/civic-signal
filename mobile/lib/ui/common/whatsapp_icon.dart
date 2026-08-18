import 'package:flutter/material.dart';

/// Official WhatsApp Logo Widget for Flutter
class WhatsAppIcon extends StatelessWidget {
  final double size;

  const WhatsAppIcon({super.key, this.size = 24});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _WhatsAppPainter(),
    );
  }
}

class _WhatsAppPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;

    // Green Background Circle
    final Paint circlePaint = Paint()
      ..color = const Color(0xFF25D366)
      ..isAntiAlias = true
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(w / 2, w / 2), w / 2, circlePaint);

    // Inner Speech Bubble + Phone icon path (White)
    final Paint whitePaint = Paint()
      ..color = Colors.white
      ..isAntiAlias = true
      ..style = PaintingStyle.fill;

    final double scale = w / 24.0;
    canvas.save();
    canvas.scale(scale, scale);

    // Official WhatsApp vector path scaled from 24x24 viewBox
    final Path path = Path();
    path.moveTo(17.472, 14.382);
    path.cubicTo(17.175, 14.233, 15.714, 13.515, 15.442, 13.415);
    path.cubicTo(15.169, 13.316, 14.971, 13.267, 14.772, 13.565);
    path.cubicTo(14.575, 13.862, 14.005, 14.531, 13.832, 14.729);
    path.cubicTo(13.659, 14.928, 13.485, 14.952, 13.188, 14.804);
    path.cubicTo(12.891, 14.654, 11.933, 14.341, 10.798, 13.329);
    path.cubicTo(9.915, 12.541, 9.318, 11.568, 9.145, 11.27);
    path.cubicTo(8.972, 10.973, 9.127, 10.812, 9.275, 10.664);
    path.cubicTo(9.409, 10.531, 9.573, 10.317, 9.721, 10.144);
    path.cubicTo(9.87, 9.97, 9.919, 9.846, 10.019, 9.647);
    path.cubicTo(10.118, 9.449, 10.069, 9.276, 9.994, 9.127);
    path.cubicTo(9.919, 8.978, 9.325, 7.515, 9.078, 6.92);
    path.cubicTo(8.836, 6.341, 8.591, 6.42, 8.409, 6.41);
    path.cubicTo(8.236, 6.402, 8.038, 6.4, 7.839, 6.4);
    path.cubicTo(7.641, 6.4, 7.319, 6.474, 7.047, 6.772);
    path.cubicTo(6.775, 7.069, 6.008, 7.788, 6.008, 9.251);
    path.cubicTo(6.008, 10.713, 7.073, 12.126, 7.221, 12.325);
    path.cubicTo(7.37, 12.523, 9.417, 15.725, 12.398, 17.012);
    path.cubicTo(13.107, 17.318, 13.66, 17.501, 14.092, 17.637);
    path.cubicTo(14.804, 17.864, 15.452, 17.832, 15.963, 17.755);
    path.cubicTo(16.534, 17.67, 17.721, 17.036, 17.969, 16.342);
    path.cubicTo(18.217, 15.648, 18.217, 15.053, 18.142, 14.929);
    path.cubicTo(18.068, 14.805, 17.87, 14.731, 17.572, 14.582);
    path.moveTo(12.151, 22.085);
    path.cubicTo(10.378, 22.085, 8.65, 21.619, 7.12, 20.707);
    path.lineTo(6.759, 20.493);
    path.lineTo(3.018, 21.475);
    path.lineTo(4.016, 17.827);
    path.lineTo(3.781, 17.453);
    path.cubicTo(2.78, 15.861, 2.25, 14.017, 2.251, 12.125);
    path.cubicTo(2.252, 6.675, 6.687, 2.241, 12.139, 2.241);
    path.cubicTo(14.779, 2.241, 17.261, 3.271, 19.127, 5.139);
    path.cubicTo(20.993, 7.007, 22.02, 9.493, 22.017, 12.139);
    path.cubicTo(22.014, 17.589, 17.58, 22.085, 12.151, 22.085);

    canvas.drawPath(path, whitePaint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
