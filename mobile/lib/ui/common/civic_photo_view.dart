import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/supabase_constants.dart';
import '../../core/utils/report_display_utils.dart';

class CivicPhotoView extends StatefulWidget {
  final String? photoPath;
  final List<dynamic>? photoPaths;
  final dynamic reportDate;
  final double? aspectRatio;
  final double? height;
  final double? width;
  final BorderRadius? borderRadius;
  final BoxFit fit;

  const CivicPhotoView({
    super.key,
    this.photoPath,
    this.photoPaths,
    this.reportDate,
    this.aspectRatio = 16 / 10,
    this.height,
    this.width,
    this.borderRadius,
    this.fit = BoxFit.cover,
  });

  @override
  State<CivicPhotoView> createState() => _CivicPhotoViewState();
}

class _CivicPhotoViewState extends State<CivicPhotoView> {
  final Map<String, String> _resolvedUrls = {};
  bool _isLoading = true;
  int _currentIndex = 0;
  List<String> _effectivePaths = [];

  @override
  void initState() {
    super.initState();
    _initAndResolve();
  }

  @override
  void didUpdateWidget(covariant CivicPhotoView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.photoPath != widget.photoPath || oldWidget.photoPaths != widget.photoPaths) {
      _initAndResolve();
    }
  }

  void _initAndResolve() {
    _effectivePaths = [];
    if (widget.photoPaths != null && widget.photoPaths!.isNotEmpty) {
      for (final p in widget.photoPaths!) {
        if (p is String && p.trim().isNotEmpty) {
          _effectivePaths.add(p.trim());
        }
      }
    } else if (widget.photoPath != null && widget.photoPath!.trim().isNotEmpty) {
      _effectivePaths.add(widget.photoPath!.trim());
    }

    if (_effectivePaths.isEmpty) {
      setState(() => _isLoading = false);
      return;
    }

    _resolveAllUrls();
  }

  Future<void> _resolveAllUrls() async {
    setState(() => _isLoading = true);
    for (final path in _effectivePaths) {
      if (_resolvedUrls.containsKey(path)) continue;

      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        _resolvedUrls[path] = path;
      } else {
        try {
          final res = await Supabase.instance.client.storage
              .from(SupabaseConstants.photoBucket)
              .createSignedUrl(path, 7200);
          _resolvedUrls[path] = res;
        } catch (_) {
          final publicUrl = Supabase.instance.client.storage
              .from(SupabaseConstants.photoBucket)
              .getPublicUrl(path);
          _resolvedUrls[path] = publicUrl;
        }
      }
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _openFullscreen(BuildContext context, int initialIndex) {
    Navigator.push(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _PhotoLightboxScreen(
          urls: _effectivePaths.map((p) => _resolvedUrls[p] ?? '').where((u) => u.isNotEmpty).toList(),
          initialIndex: initialIndex,
          reportDate: widget.reportDate,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_effectivePaths.isEmpty) {
      return const SizedBox.shrink();
    }

    final radius = widget.borderRadius ?? BorderRadius.circular(12);

    if (_isLoading) {
      return AspectRatio(
        aspectRatio: widget.aspectRatio ?? (16 / 10),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: radius,
          ),
          child: const Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF0D9488)),
            ),
          ),
        ),
      );
    }

    // ── Single Photo (Responsive Edge-to-Edge with Cover & Zoom Icon) ──
    if (_effectivePaths.length == 1) {
      final url = _resolvedUrls[_effectivePaths[0]];
      if (url == null || url.isEmpty) return const SizedBox.shrink();

      return ClipRRect(
        borderRadius: radius,
        child: AspectRatio(
          aspectRatio: widget.aspectRatio ?? (16 / 10),
          child: Stack(
            fit: StackFit.expand,
            children: [
              GestureDetector(
                onTap: () => _openFullscreen(context, 0),
                child: Image.network(
                  url,
                  fit: widget.fit,
                  errorBuilder: (_, __, ___) => _buildFallback(),
                ),
              ),
              // Zoom Hint Button (1:1 Web)
              Positioned(
                right: 8,
                bottom: 8,
                child: GestureDetector(
                  onTap: () => _openFullscreen(context, 0),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withAlpha(140),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.maximize2, color: Colors.white, size: 13),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // ── 2 Photos: Side-by-Side Responsive Grid (1:1 with Web PhotoGallery.tsx) ──
    if (_effectivePaths.length == 2) {
      final url0 = _resolvedUrls[_effectivePaths[0]];
      final url1 = _resolvedUrls[_effectivePaths[1]];

      return ClipRRect(
        borderRadius: radius,
        child: AspectRatio(
          aspectRatio: widget.aspectRatio ?? (16 / 10),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _openFullscreen(context, 0),
                  child: Image.network(
                    url0 ?? '',
                    fit: BoxFit.cover,
                    height: double.infinity,
                    errorBuilder: (_, __, ___) => _buildFallback(),
                  ),
                ),
              ),
              const SizedBox(width: 2),
              Expanded(
                child: GestureDetector(
                  onTap: () => _openFullscreen(context, 1),
                  child: Image.network(
                    url1 ?? '',
                    fit: BoxFit.cover,
                    height: double.infinity,
                    errorBuilder: (_, __, ___) => _buildFallback(),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // ── 3+ Photos: Responsive Carousel with Dot Navigation (1:1 with Web) ──
    return ClipRRect(
      borderRadius: radius,
      child: AspectRatio(
        aspectRatio: widget.aspectRatio ?? (16 / 10),
        child: Stack(
          children: [
            PageView.builder(
              itemCount: _effectivePaths.length,
              onPageChanged: (idx) => setState(() => _currentIndex = idx),
              itemBuilder: (ctx, idx) {
                final url = _resolvedUrls[_effectivePaths[idx]];
                if (url == null || url.isEmpty) return _buildFallback();
                return GestureDetector(
                  onTap: () => _openFullscreen(context, idx),
                  child: Image.network(
                    url,
                    fit: widget.fit,
                    width: double.infinity,
                    height: double.infinity,
                    errorBuilder: (_, __, ___) => _buildFallback(),
                  ),
                );
              },
            ),
            // Page Indicator badge (Top Right 1:1 Web)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(160),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${_currentIndex + 1}/${_effectivePaths.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            // Dots indicator (Bottom Center 1:1 Web)
            Positioned(
              bottom: 8,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_effectivePaths.length, (i) {
                  final active = i == _currentIndex;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 2.5),
                    width: active ? 16 : 5,
                    height: 5,
                    decoration: BoxDecoration(
                      color: active ? Colors.white : Colors.white.withAlpha(120),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallback() {
    return Container(
      color: const Color(0xFFF1F5F9),
      child: const Center(
        child: Icon(LucideIcons.imageOff, color: Color(0xFF94A3B8), size: 28),
      ),
    );
  }
}

class _PhotoLightboxScreen extends StatefulWidget {
  final List<String> urls;
  final int initialIndex;
  final dynamic reportDate;

  const _PhotoLightboxScreen({
    required this.urls,
    required this.initialIndex,
    this.reportDate,
  });

  @override
  State<_PhotoLightboxScreen> createState() => _PhotoLightboxScreenState();
}

class _PhotoLightboxScreenState extends State<_PhotoLightboxScreen> {
  late PageController _controller;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          'Photo ${_currentIndex + 1} / ${widget.urls.length}',
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.urls.length,
            onPageChanged: (i) => setState(() => _currentIndex = i),
            itemBuilder: (ctx, i) {
              return Center(
                child: InteractiveViewer(
                  panEnabled: true,
                  minScale: 0.8,
                  maxScale: 4.0,
                  child: Image.network(
                    widget.urls[i],
                    fit: BoxFit.contain,
                  ),
                ),
              );
            },
          ),
          // Exact date/time pill matching web PhotoGallery.tsx 1:1
          if (widget.reportDate != null)
            Builder(builder: (_) {
              final dateStr = ReportDisplayUtils.formatReportDateTime(widget.reportDate);
              if (dateStr.isEmpty) return const SizedBox.shrink();
              return Positioned(
                left: 14,
                bottom: 24,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
                  decoration: BoxDecoration(
                    color: Colors.black.withAlpha(160),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withAlpha(40)),
                  ),
                  child: Text(
                    dateStr,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}
