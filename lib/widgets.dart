import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import 'api.dart';
import 'data.dart';

const kFont = 'BlackHanSans';
const kBlue = Color(0xFF0056B3);
const kSky = Color(0xFF00A0E9);
const kBg = Color(0xFFF0F7FF);

TextStyle hanSans(
  double size, {
  Color color = Colors.white,
  double spacing = -0.5,
  double? height,
}) => TextStyle(
  fontFamily: kFont,
  fontSize: size,
  color: color,
  letterSpacing: spacing,
  height: height,
);

/// CSS `word-break: keep-all`: glue the letters of each word so Korean only wraps at spaces.
String keepAll(String text) =>
    text.split(' ').map((w) => w.split('').join('⁠')).join(' ');

/// Label whose leading "← " / trailing " →" become icons (Black Han Sans has no arrow glyphs).
Widget arrowLabel(String label, TextStyle style) {
  final back = label.startsWith('← '), next = label.endsWith(' →');
  final text = label.replaceFirst('← ', '').replaceFirst(' →', '');
  final icon = Icon(
    back ? Icons.arrow_back_rounded : Icons.arrow_forward_rounded,
    size: style.fontSize! * 1.1,
    color: style.color,
  );
  return Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      if (back) ...[icon, const SizedBox(width: 4)],
      Text(text, style: style),
      if (next) ...[const SizedBox(width: 4), icon],
    ],
  );
}

/// Text painted with the brand gradient (CSS background-clip: text).
class GradientText extends StatelessWidget {
  const GradientText(this.text, {super.key, required this.style});
  final String text;
  final TextStyle style;

  @override
  Widget build(BuildContext context) => ShaderMask(
    blendMode: BlendMode.srcIn,
    shaderCallback: primaryGradient.createShader,
    child: Text(text, style: style),
  );
}

/// Scales down slightly while pressed, like the React onTouchStart/onTouchEnd handlers.
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.onTap,
    required this.child,
    this.scale = 0.97,
  });
  final VoidCallback onTap;
  final Widget child;
  final double scale;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  void _set(bool v) => setState(() => _down = v);

  @override
  Widget build(BuildContext context) => GestureDetector(
    behavior: HitTestBehavior.opaque,
    onTapDown: (_) => _set(true),
    onTapUp: (_) => _set(false),
    onTapCancel: () => _set(false),
    onTap: widget.onTap,
    child: AnimatedScale(
      scale: _down ? widget.scale : 1,
      duration: const Duration(milliseconds: 150),
      child: widget.child,
    ),
  );
}

/// Voice guide on/off for the whole app: while on, every page reads its guide out loud as it opens.
final voiceOn = ValueNotifier(false);

// One engine for the whole app so pages never talk over each other.
final _tts = FlutterTts()
  ..setLanguage('ko-KR')
  ..setSpeechRate(0.45); // flutter_tts 0.5 ≈ normal speed; web used 0.9

/// Top bar with the logo and, when [voiceMessage] is set, the voice guide toggle.
class Header extends StatefulWidget {
  const Header({super.key, this.voiceMessage});
  final String? voiceMessage;

  @override
  State<Header> createState() => _HeaderState();
}

class _HeaderState extends State<Header> {
  @override
  void initState() {
    super.initState();
    // After the frame: the previous page's dispose() (which stops its speech) runs first.
    WidgetsBinding.instance.addPostFrameCallback((_) => _speakIfOn());
  }

  @override
  void didUpdateWidget(Header old) {
    super.didUpdateWidget(old);
    // e.g. next lecture step
    if (old.voiceMessage != widget.voiceMessage) _speakIfOn();
  }

  @override
  void dispose() {
    if (widget.voiceMessage != null) _tts.stop();
    super.dispose();
  }

  void _speakIfOn() {
    if (mounted && voiceOn.value && widget.voiceMessage != null) {
      _tts.speak(widget.voiceMessage!);
    }
  }

  void _toggle() {
    voiceOn.value = !voiceOn.value;
    voiceOn.value ? _speakIfOn() : _tts.stop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        MediaQuery.paddingOf(context).top + 16,
        20,
        16,
      ),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.92),
        border: Border(bottom: BorderSide(color: kSky.withValues(alpha: 0.12))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GradientText('두드림', style: hanSans(36, spacing: -1, height: 1)),
          if (widget.voiceMessage != null)
            ValueListenableBuilder<bool>(
              valueListenable: voiceOn,
              builder: (context, on, _) => Semantics(
                button: true,
                toggled: on,
                child: GestureDetector(
                  onTap: _toggle,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      gradient: on ? primaryGradient : null,
                      color: on ? null : kSky.withValues(alpha: 0.08),
                      border: Border.all(
                        color: on
                            ? Colors.transparent
                            : kSky.withValues(alpha: 0.25),
                        width: 1.5,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          on
                              ? Icons.volume_up_rounded
                              : Icons.volume_off_rounded,
                          size: 18,
                          color: on ? Colors.white : kBlue,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          on ? '음성안내 켜짐' : '음성안내 꺼짐',
                          style: hanSans(
                            15,
                            color: on ? Colors.white : kBlue,
                            spacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class BottomBackButton extends StatelessWidget {
  const BottomBackButton({super.key, required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      16,
      0,
      16,
      24 + MediaQuery.paddingOf(context).bottom,
    ),
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: kSky, width: 2),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: kBlue.withValues(alpha: 0.1),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: arrowLabel(label, hanSans(17, color: kBlue, spacing: -0.3)),
      ),
    ),
  );
}

/// Big gradient tile: icon or picture, name and (optional) description.
/// Picture: icon uploaded on the server > built-in look (by name) > generic icon. Same order as the web.
class CategoryTile extends StatelessWidget {
  const CategoryTile({
    super.key,
    required this.unit,
    required this.gradient,
    required this.onTap,
  });
  final Unit unit;
  final Gradient gradient;
  final VoidCallback onTap;

  Look? get _look => unitLooks[unit.name];
  String get _desc =>
      unit.description.isNotEmpty ? unit.description : _look?.desc ?? '';

  @override
  Widget build(BuildContext context) => Pressable(
    onTap: onTap,
    child: Container(
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: kBlue.withValues(alpha: 0.22),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(12),
      child: Center(
        // Shrinks the whole card content on short screens instead of overflowing.
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Column(
            children: [
              _visual(),
              const SizedBox(height: 12),
              Text(unit.name, style: hanSans(28)),
              if (_desc.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  _desc,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.45,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    ),
  );

  Widget _visual() {
    final picture = unit.iconUrl != null
        ? Image.network(
            unit.iconUrl!,
            fit: BoxFit.contain,
            cacheWidth: 400,
            errorBuilder: (_, _, _) => const SizedBox(),
          )
        : _look?.image != null
        ? Image.asset(_look!.image!, fit: BoxFit.contain, cacheWidth: 400)
        : null;
    if (picture != null) {
      // Pictures are logos/photos with their own backgrounds, so frame them on white.
      return Container(
        width: 132,
        height: 84,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: picture,
        ),
      );
    }
    return Container(
      width: 84,
      height: 84,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        shape: BoxShape.circle,
      ),
      child: FaIcon(
        _look?.icon ?? FontAwesomeIcons.shapes,
        size: 40,
        color: Colors.white,
      ),
    );
  }
}

/// Page skeleton shared by every screen after the splash.
class PageScaffold extends StatelessWidget {
  const PageScaffold({
    super.key,
    this.voiceMessage,
    required this.body,
    this.bottom,
  });
  final String? voiceMessage;
  final Widget body;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kBg,
    body: Column(
      children: [
        Header(voiceMessage: voiceMessage),
        Expanded(child: body),
        ?bottom,
      ],
    ),
  );
}

/// Runs [load] and shows a spinner, an error with a retry button, or [builder]'s result.
/// [wrap] puts the spinner/error inside a page (header, back button) when [builder] returns a whole page.
class Loader<T> extends StatefulWidget {
  const Loader({
    super.key,
    required this.load,
    required this.builder,
    this.wrap,
  });
  final Future<T> Function() load;
  final Widget Function(T data) builder;
  final Widget Function(Widget child)? wrap;

  @override
  State<Loader<T>> createState() => _LoaderState<T>();
}

class _LoaderState<T> extends State<Loader<T>> {
  late Future<T> _future = widget.load();

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
    future: _future,
    builder: (context, snap) {
      if (snap.hasData) return widget.builder(snap.data as T);
      final wrap = widget.wrap ?? (w) => w;
      if (snap.hasError) {
        return wrap(
          Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('불러오지 못했습니다.', style: hanSans(22, color: kBlue)),
                  const SizedBox(height: 8),
                  Text(
                    '인터넷 연결을 확인해 주세요.\n(${snap.error.toString().replaceFirst('Exception: ', '')})',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.6,
                      color: Color(0xFF4A6080),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => setState(() {
                      _future = widget.load();
                    }),
                    style: FilledButton.styleFrom(backgroundColor: kBlue),
                    child: Text('다시 시도', style: hanSans(17, spacing: -0.3)),
                  ),
                ],
              ),
            ),
          ),
        );
      }
      return wrap(const Center(child: CircularProgressIndicator(color: kSky)));
    },
  );
}
