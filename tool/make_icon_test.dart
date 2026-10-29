// Draws the app icon images (assets/icon/*.png) with the app's own font and colours.
// Re-run after changing the design, then regenerate the platform icons:
//   flutter test tool/make_icon_test.dart
//   dart run flutter_launcher_icons
import 'dart:io';
import 'dart:ui' as ui;

import 'package:dodorim_app/data.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _size = 1024.0;

// Same look as the start screen: sky gradient, white glow, blue gradient "두드림" with a dark outline.
Widget _background() => Container(
  decoration: const BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment(-0.35, -1),
      end: Alignment(0.35, 1),
      colors: [Color(0xFFB8E4F9), Color(0xFF7ECEF4), Color(0xFF3AB0E8), Color(0xFF0E8FD6)],
      stops: [0, 0.3, 0.65, 1],
    ),
  ),
  alignment: Alignment.center,
  child: Container(
    width: _size * 0.9,
    height: _size * 0.9,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: RadialGradient(
        colors: [Colors.white.withValues(alpha: 0.5), Colors.white.withValues(alpha: 0)],
        stops: const [0, 0.7],
      ),
    ),
  ),
);

/// [width]: how much of the icon the word spans (Android adaptive icons crop to the middle ~66%).
Widget _word(double width) {
  final style = TextStyle(fontFamily: 'BlackHanSans', fontSize: _size * width / 3, letterSpacing: -_size * 0.006, height: 1);
  return Center(
    child: Stack(
      children: [
        Text(
          '두드림',
          style: style.copyWith(
            foreground: Paint()
              ..style = PaintingStyle.stroke
              ..strokeWidth = _size * 0.008
              ..color = const Color(0xFF0A2642),
            shadows: const [Shadow(color: Color(0x55003C82), offset: Offset(0, 12), blurRadius: 24)],
          ),
        ),
        ShaderMask(
          blendMode: BlendMode.srcIn,
          shaderCallback: primaryGradient.createShader,
          child: Text('두드림', style: style),
        ),
      ],
    ),
  );
}

Future<void> _save(WidgetTester tester, Widget art, String path) async {
  final key = GlobalKey();
  await tester.pumpWidget(
    Directionality(
      textDirection: TextDirection.ltr,
      // Material gives the text a clean default style (no debug underline).
      child: Material(
        type: MaterialType.transparency,
        child: Center(
          child: RepaintBoundary(key: key, child: SizedBox.square(dimension: _size, child: art)),
        ),
      ),
    ),
  );
  await tester.runAsync(() async {
    final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage();
    final png = await image.toByteData(format: ui.ImageByteFormat.png);
    File(path)
      ..createSync(recursive: true)
      ..writeAsBytesSync(png!.buffer.asUint8List());
  });
}

void main() {
  testWidgets('draw app icon images', (tester) async {
    tester.view.physicalSize = const Size(_size, _size);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.runAsync(() async {
      final font = FontLoader('BlackHanSans')..addFont(rootBundle.load('assets/fonts/BlackHanSans-Regular.ttf'));
      await font.load();
    });

    // iOS and older Android: one square picture.
    await _save(tester, Stack(fit: StackFit.expand, children: [_background(), _word(0.86)]), 'assets/icon/icon.png');
    // Android 8+: background and word as separate layers. Launchers show roughly the middle 2/3;
    // 0.72 lets the word nearly fill that (a round mask may just touch its outer corners).
    await _save(tester, _background(), 'assets/icon/background.png');
    await _save(tester, _word(0.72), 'assets/icon/foreground.png');
  });
}
