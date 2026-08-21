import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';

class ExifGpsCoordinate {
  final double latitude;
  final double longitude;

  const ExifGpsCoordinate({required this.latitude, required this.longitude});
}

/// Reads GPS coordinates from JPEG/HEIC EXIF metadata in pure Dart.
class ExifGpsReader {
  static Future<ExifGpsCoordinate?> extractGps(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      if (bytes.length < 12) return null;

      // Check JPEG SOI (0xFFD8)
      if (bytes[0] == 0xFF && bytes[1] == 0xD8) {
        return _readJpegExifGps(bytes);
      }
    } catch (_) {}
    return null;
  }

  static ExifGpsCoordinate? _readJpegExifGps(Uint8List bytes) {
    int offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] != 0xFF) break;
      final marker = bytes[offset + 1];
      final length = (bytes[offset + 2] << 8) | bytes[offset + 3];

      // APP1 Marker (0xFFE1) contains EXIF
      if (marker == 0xE1) {
        final exifStart = offset + 4;
        // Verify "Exif\0\0"
        if (exifStart + 6 <= bytes.length &&
            bytes[exifStart] == 0x45 &&
            bytes[exifStart + 1] == 0x78 &&
            bytes[exifStart + 2] == 0x69 &&
            bytes[exifStart + 3] == 0x66 &&
            bytes[exifStart + 4] == 0x00 &&
            bytes[exifStart + 5] == 0x00) {
          final tiffStart = exifStart + 6;
          return _parseTiff(bytes, tiffStart, offset + 2 + length);
        }
      }

      // SOS (0xFFDA) means start of scan, stop looking
      if (marker == 0xDA) break;

      offset += 2 + length;
    }
    return null;
  }

  static ExifGpsCoordinate? _parseTiff(Uint8List bytes, int tiffStart, int maxOffset) {
    if (tiffStart + 8 > maxOffset) return null;

    final isLittleEndian = bytes[tiffStart] == 0x49 && bytes[tiffStart + 1] == 0x49; // "II"
    final isBigEndian = bytes[tiffStart] == 0x4D && bytes[tiffStart + 1] == 0x4D; // "MM"
    if (!isLittleEndian && !isBigEndian) return null;

    int readUint16(int offset) {
      if (offset + 2 > maxOffset) return 0;
      return isLittleEndian
          ? bytes[offset] | (bytes[offset + 1] << 8)
          : (bytes[offset] << 8) | bytes[offset + 1];
    }

    int readUint32(int offset) {
      if (offset + 4 > maxOffset) return 0;
      return isLittleEndian
          ? bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
          : (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    }

    double readRational(int offset) {
      final num = readUint32(offset);
      final den = readUint32(offset + 4);
      if (den == 0) return 0.0;
      return num / den;
    }

    final firstIfdOffset = readUint32(tiffStart + 4);
    if (firstIfdOffset == 0 || tiffStart + firstIfdOffset >= maxOffset) return null;

    int ifdOffset = tiffStart + firstIfdOffset;
    final numEntries = readUint16(ifdOffset);
    ifdOffset += 2;

    int gpsIfdOffset = 0;
    for (int i = 0; i < numEntries; i++) {
      final entryOffset = ifdOffset + (i * 12);
      if (entryOffset + 12 > maxOffset) break;
      final tag = readUint16(entryOffset);
      if (tag == 0x8825) {
        // GPSInfo IFD pointer
        gpsIfdOffset = readUint32(entryOffset + 8);
        break;
      }
    }

    if (gpsIfdOffset == 0 || tiffStart + gpsIfdOffset >= maxOffset) return null;

    int gpsOffset = tiffStart + gpsIfdOffset;
    final numGpsEntries = readUint16(gpsOffset);
    gpsOffset += 2;

    String latRef = 'N';
    String lonRef = 'E';
    double? lat;
    double? lon;

    for (int i = 0; i < numGpsEntries; i++) {
      final entryOffset = gpsOffset + (i * 12);
      if (entryOffset + 12 > maxOffset) break;
      final tag = readUint16(entryOffset);
      final valueOffset = readUint32(entryOffset + 8);

      if (tag == 0x0001) {
        // GPSLatitudeRef
        latRef = String.fromCharCode(bytes[entryOffset + 8]);
      } else if (tag == 0x0002) {
        // GPSLatitude
        final absOffset = tiffStart + valueOffset;
        if (absOffset + 24 <= maxOffset) {
          final deg = readRational(absOffset);
          final min = readRational(absOffset + 8);
          final sec = readRational(absOffset + 16);
          lat = deg + (min / 60.0) + (sec / 3600.0);
        }
      } else if (tag == 0x0003) {
        // GPSLongitudeRef
        lonRef = String.fromCharCode(bytes[entryOffset + 8]);
      } else if (tag == 0x0004) {
        // GPSLongitude
        final absOffset = tiffStart + valueOffset;
        if (absOffset + 24 <= maxOffset) {
          final deg = readRational(absOffset);
          final min = readRational(absOffset + 8);
          final sec = readRational(absOffset + 16);
          lon = deg + (min / 60.0) + (sec / 3600.0);
        }
      }
    }

    if (lat != null && lon != null && (lat != 0.0 || lon != 0.0)) {
      if (latRef.toUpperCase() == 'S') lat = -lat;
      if (lonRef.toUpperCase() == 'W') lon = -lon;
      return ExifGpsCoordinate(latitude: lat, longitude: lon);
    }

    return null;
  }
}
