import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/theme/app_theme.dart';

class SignaLogoWidget extends StatelessWidget {
  final double size;
  final bool showSlogan;

  const SignaLogoWidget({
    super.key,
    this.size = 36.0,
    this.showSlogan = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 📍 Emblem : Pin Green with Crown Accent & 4 Services
        Container(
          width: size,
          height: size * 1.1,
          decoration: BoxDecoration(
            color: AppTheme.primaryDarkTeal,
            borderRadius: BorderRadius.circular(size * 0.35),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryTeal.withValues(alpha: 0.3),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
            border: Border.all(color: Colors.white, width: 1.5),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Golden citizens crown top indicator
              Positioned(
                top: 2,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(LucideIcons.users, size: 10, color: AppTheme.amberAccent),
                  ],
                ),
              ),
              // Center service icon
              const Icon(LucideIcons.zap, size: 16, color: Colors.white),
            ],
          ),
        ),
        const SizedBox(width: 10),

        // 🔤 SIGNA.ci Text & Slogan
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
                      fontSize: size * 0.55,
                      fontWeight: FontWeight.extrabold,
                      color: isDark ? Colors.white : AppTheme.textPrimaryLight,
                      letterSpacing: -0.5,
                    ),
                  ),
                  TextSpan(
                    text: '.ci',
                    style: GoogleFonts.outfit(
                      fontSize: size * 0.55,
                      fontWeight: FontWeight.extrabold,
                      color: AppTheme.secondaryEmerald,
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
                  fontSize: 8,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.grey[400] : AppTheme.primaryDarkTeal,
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
