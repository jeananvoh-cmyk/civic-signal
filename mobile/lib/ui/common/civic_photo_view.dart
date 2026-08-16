import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/supabase_constants.dart';

class CivicPhotoView extends StatefulWidget {
  final String? photoPath;
  final List<dynamic>? photoPaths;
  final double height;
  final double? width;
  final BorderRadius? borderRadius;
  final BoxFit fit;

  const CivicPhotoView({
    super.key,
    this.photoPath,
    this.photoPaths,
    this.height = 200,
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
          // 1. Try signed URL first
          final res = await Supabase.instance.client.storage
              .from(SupabaseConstants.photoBucket)
              .createSignedUrl(path, 7200);
          _resolvedUrls[path] = res;
        } catch (_) {
          // 2. Fallback to public URL
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
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_effectivePaths.isEmpty) {
      return const SizedBox.shrink();
    }

    final radius = widget.borderRadius ?? BorderRadius.circular(14);

    if (_isLoading) {
      return Container(
        height: widget.height,
        width: widget.width ?? double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: radius,
        ),
        child: const Center(
          child: SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: Color(0xFF0284C7)),
          ),
        ),
      );
    }

    if (_effectivePaths.length == 1) {
      final url = _resolvedUrls[_effectivePaths[0]];
      if (url == null || url.isEmpty) return const SizedBox.shrink();

      return ClipRRect(
        borderRadius: radius,
        child: Stack(
          children: [
            GestureDetector(
              onTap: () => _openFullscreen(context, 0),
              child: Image.network(
                url,
                height: widget.height,
                width: widget.width ?? double.infinity,
                fit: widget.fit,
                errorBuilder: (_, __, ___) => _buildFallback(),
              ),
            ),
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
                  child: const Icon(LucideIcons.maximize2, color: Colors.white, size: 14),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Carousel for multiple photos
    return ClipRRect(
      borderRadius: radius,
      child: SizedBox(
        height: widget.height,
        width: widget.width ?? double.infinity,
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
                    height: widget.height,
                    width: widget.width ?? double.infinity,
                    fit: widget.fit,
                    errorBuilder: (_, __, ___) => _buildFallback(),
                  ),
                );
              },
            ),
            // Page Indicator badge
            Positioned(
              right: 10,
              bottom: 10,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(160),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_currentIndex + 1}/${_effectivePaths.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallback() {
    return Container(
      height: widget.height,
      width: widget.width ?? double.infinity,
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

  const _PhotoLightboxScreen({required this.urls, required this.initialIndex});

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
      body: PageView.builder(
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
    );
  }
}
