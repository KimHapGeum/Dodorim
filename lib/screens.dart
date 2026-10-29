import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import 'api.dart';

import 'data.dart';
import 'widgets.dart';

/// Start screen: "두드림" pops up one letter at a time from below, the word growing from the centre.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.onDone});

  /// Called once the word has fully appeared and been on screen for a moment.
  final VoidCallback onDone;

  static const word = '두드림';

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final _c =
      AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1800),
      )..addStatusListener((s) {
        // Keep the finished word on screen a little before moving on.
        if (s == AnimationStatus.completed) _hold();
      });
  Timer? _timer;
  bool _started = false;

  void _hold() =>
      _timer = Timer(const Duration(milliseconds: 1300), widget.onDone);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    // Respect the system "remove animations" setting.
    if (MediaQuery.disableAnimationsOf(context)) {
      _c.value = 1; // reports "completed" → _hold()
    } else {
      // Count from the first frame actually on screen: on a slow start the system launch
      // screen covers the app for a while, and the letters would pop up unseen behind it.
      // (3 s cap in case that signal never comes, e.g. in widget tests.)
      Future.any([
        WidgetsBinding.instance.waitUntilFirstFrameRasterized,
        Future<void>.delayed(const Duration(seconds: 3)),
      ]).then((_) {
        if (mounted) {
          _timer = Timer(const Duration(milliseconds: 500), _c.forward);
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  // Letter i runs during its own slice of the timeline, each one starting 0.2 later.
  Animation<double> _part(int i, double from, double to, Curve curve) {
    final start = 0.15 + i * 0.2;
    return CurvedAnimation(
      parent: _c,
      curve: Interval(start + 0.45 * from, start + 0.45 * to, curve: curve),
    );
  }

  /// The word as a row; [letter] draws one character. Both layers below use the same
  /// animation, so the outline and the gradient fill stay exactly on top of each other.
  Widget _row(Widget Function(String ch) letter) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (final (i, ch) in SplashScreen.word.characters.indexed)
        AnimatedBuilder(
          animation: _c,
          builder: (_, child) {
            final width = _part(
              i,
              0,
              0.6,
              Curves.easeOutCubic,
            ).value; // room opens up → word stays centred
            final rise = _part(
              i,
              0,
              1,
              Curves.easeOutBack,
            ).value; // overshoots a little: the "bounce"
            final fade = _part(i, 0, 0.3, Curves.easeOut).value;
            return Align(
              widthFactor: width,
              child: Opacity(
                opacity: fade,
                child: Transform.translate(
                  offset: Offset(0, (1 - rise) * 80),
                  child: child,
                ),
              ),
            );
          },
          child: letter(ch),
        ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final size = (MediaQuery.sizeOf(context).width * 0.22).clamp(72.0, 108.0);
    final style = hanSans(size, spacing: -1.5, height: 1);
    final glow = CurvedAnimation(
      parent: _c,
      curve: const Interval(0, 0.5, curve: Curves.easeOut),
    );
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(-0.35, -1),
          end: Alignment(0.35, 1),
          colors: [
            Color(0xFFB8E4F9),
            Color(0xFF7ECEF4),
            Color(0xFF3AB0E8),
            Color(0xFF0E8FD6),
          ],
          stops: [0, 0.3, 0.65, 1],
        ),
      ),
      alignment: Alignment.center,
      child: Stack(
        alignment: Alignment.center,
        children: [
          FadeTransition(
            opacity: glow,
            child: ScaleTransition(
              scale: Tween(begin: 0.6, end: 1.0).animate(glow),
              child: Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      Colors.white.withValues(alpha: 0.45),
                      Colors.white.withValues(alpha: 0),
                    ],
                    stops: const [0, 0.7],
                  ),
                ),
              ),
            ),
          ),
          // Shadow + 1px black outline underneath, gradient fill (across the whole word) on top.
          _row(
            (ch) => Text(
              ch,
              style: style.copyWith(
                foreground: Paint()
                  ..style = PaintingStyle.stroke
                  ..strokeWidth = 2
                  ..color = Colors.black,
                shadows: const [
                  Shadow(
                    color: Color(0x38003C82),
                    offset: Offset(2, 4),
                    blurRadius: 8,
                  ),
                ],
              ),
            ),
          ),
          ShaderMask(
            blendMode: BlendMode.srcIn,
            shaderCallback: primaryGradient.createShader,
            child: _row((ch) => Text(ch, style: style)),
          ),
        ],
      ),
    );
  }
}

class MainPage extends StatefulWidget {
  const MainPage({
    super.key,
    required this.onEducationStart,
    required this.onPractice,
  });
  final VoidCallback onEducationStart;
  final VoidCallback onPractice; // 체험하기

  @override
  State<MainPage> createState() => _MainPageState();
}

class _MainPageState extends State<MainPage> {
  // Built-in content until the server answers; kept if the server has none or is unreachable (same as the web).
  List<PromoBanner> _banners = defaultBanners;
  List<Notice> _notices = defaultNotices;
  late int _current; // index into _banners
  late PageController _slider;
  Timer? _autoplay;

  @override
  void initState() {
    super.initState();
    _startAtCenter();
    _load();
  }

  // Like the web: start on the middle banner, side banners peek in on both sides.
  // The page list is endless (page % count), so swiping and autoplay never hit an end.
  void _startAtCenter() {
    _current = ((_banners.length - 1) / 2).round();
    final start = _banners.length > 1 ? _banners.length * 1000 + _current : 0;
    _slider = PageController(initialPage: start, viewportFraction: 0.9);
    _restartAutoplay();
  }

  // Next banner every 3 seconds; the count restarts after each change so a swipe gets its full 3 seconds.
  void _restartAutoplay() {
    _autoplay?.cancel();
    if (_banners.length < 2) return;
    _autoplay = Timer.periodic(const Duration(seconds: 3), (_) {
      if (_slider.hasClients) {
        _slider.nextPage(
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  Future<void> _load() async {
    try {
      final (banners, notices) = await (fetchBanners(), fetchNotices()).wait;
      if (!mounted) return;
      setState(() {
        if (notices.isNotEmpty) _notices = notices;
        if (banners.isNotEmpty) {
          _banners = banners;
          _slider.dispose();
          _startAtCenter();
        }
      });
    } catch (_) {
      // Offline: keep the built-in banners/notice.
    }
  }

  @override
  void dispose() {
    _autoplay?.cancel();
    _slider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final slide = _banners[_current];
    return PageScaffold(
      body: LayoutBuilder(
        builder: (context, box) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: box.maxHeight),
            child: IntrinsicHeight(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Thin strip in the current banner's color, under the header.
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 500),
                    height: 5,
                    color: Color(slide.color),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: _notice(Color(slide.color)),
                  ),
                  _banner(),
                  // Title, description and the 3 tip cards sit centred in the space between the banner and the buttons.
                  const Spacer(),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          keepAll(slide.title),
                          textAlign: TextAlign.center,
                          style: hanSans(
                            32,
                            color: const Color(0xFF1A1A1A),
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          keepAll(slide.desc),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 18,
                            height: 1.6,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF444444),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: _cards(),
                  ),
                  const SizedBox(height: 20),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _bigButton(
                          '교육 시작하기',
                          color: slide.color,
                          onTap: widget.onEducationStart,
                        ),
                        const SizedBox(height: 12),
                        _bigButton(
                          '체험하기',
                          color: slide.subColor,
                          onTap: widget.onPractice,
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 28 + MediaQuery.paddingOf(context).bottom),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Takes the current banner's colour, like the 교육 시작하기 button.
  Widget _notice(Color color) => GestureDetector(
    onTap: () => showDialog(
      context: context,
      barrierColor: const Color(0x800A2642),
      builder: (_) => NoticeDialog(notices: _notices),
    ),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      constraints: const BoxConstraints(minHeight: 46),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Color.alphaBlend(color.withValues(alpha: 0.07), Colors.white),
        border: Border.all(color: color.withValues(alpha: 0.35), width: 1.5),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.12),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(7),
            ),
            child: const Text(
              '공지',
              style: TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _notices.first.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF365675),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 500),
            style: TextStyle(
              color: color,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
            child: const Text('›'),
          ),
        ],
      ),
    ),
  );

  Widget _banner() {
    final width = MediaQuery.sizeOf(context).width;
    // Taller than the 1200×450 pictures (8:3), so they fill the box and lose a little at the sides.
    final slideHeight = width * 0.9 / 2.2;
    final count = _banners.length;

    return Container(
      color: const Color(0xFFEDF1F7),
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: SizedBox(
        height: slideHeight + 16,
        child: NotificationListener<ScrollNotification>(
          // Hold still while the user is swiping; resume afterwards.
          onNotification: (n) {
            if (n is ScrollStartNotification && n.dragDetails != null) {
              _autoplay?.cancel();
            }
            if (n is ScrollEndNotification) _restartAutoplay();
            return false;
          },
          child: PageView.builder(
            key: ObjectKey(_banners),
            controller: _slider,
            itemCount: count > 1 ? null : count,
            onPageChanged: (page) => setState(() => _current = page % count),
            itemBuilder: (_, page) {
              final i = page % count;
              final active = i == _current;
              return AnimatedOpacity(
                duration: const Duration(milliseconds: 600),
                opacity: active ? 1 : 0.3,
                child: AnimatedScale(
                  duration: const Duration(milliseconds: 600),
                  scale: active ? 1 : 0.95,
                  child: Container(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 8,
                    ),
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x1A000000),
                          blurRadius: 20,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: _bannerImage(_banners[i]),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  // Server banners are URLs, the built-in ones are app assets. No picture → banner color.
  Widget _bannerImage(PromoBanner b) {
    final fallback = ColoredBox(color: Color(b.subColor));
    final img = b.image;
    if (img == null) return fallback;
    return img.startsWith('assets/')
        ? Image.asset(img, fit: BoxFit.cover)
        : Image.network(
            img,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => fallback,
          );
  }

  Widget _cards() => IntrinsicHeight(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, text) in const [
          '천천히 눌러도 괜찮아요',
          '뒤에 사람 신경 쓰지 마세요',
          '언제든 도움을 요청하세요',
        ].indexed) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: const Color(0xFFF1F3F5)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0D000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Text(
                keepAll(text),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF777777),
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ],
    ),
  );

  Widget _bigButton(
    String label, {
    required int color,
    required VoidCallback onTap,
  }) => Pressable(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 500),
      padding: const EdgeInsets.symmetric(vertical: 20),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Color(color),
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A000000),
            blurRadius: 15,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Text(label, style: hanSans(24)),
    ),
  );
}

class Tag extends StatelessWidget {
  const Tag(this.text, {super.key, this.onGradient = false});
  final String text;
  final bool onGradient;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      gradient: onGradient ? null : primaryGradient,
      color: onGradient ? Colors.white.withValues(alpha: 0.2) : null,
      borderRadius: BorderRadius.circular(7),
    ),
    child: Text(
      text,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 12,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

/// Newest notice first; other notices are listed underneath and can be opened in place.
class NoticeDialog extends StatefulWidget {
  const NoticeDialog({super.key, required this.notices});
  final List<Notice> notices;

  @override
  State<NoticeDialog> createState() => _NoticeDialogState();
}

class _NoticeDialogState extends State<NoticeDialog> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    final n = widget.notices[_selected];
    return Dialog(
      insetPadding: const EdgeInsets.all(24),
      backgroundColor: Colors.white,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
              decoration: BoxDecoration(gradient: primaryGradient),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Tag('공지사항', onGradient: true),
                  const SizedBox(height: 10),
                  Text(
                    keepAll(n.title),
                    style: hanSans(23, spacing: -0.4, height: 1.35),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(22, 22, 22, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      keepAll(n.content),
                      style: const TextStyle(
                        color: Color(0xFF34516D),
                        fontSize: 16,
                        height: 1.8,
                      ),
                    ),
                    for (final a in n.attachments)
                      InkWell(
                        onTap: () => launchUrl(
                          Uri.parse(a.url),
                          mode: LaunchMode.externalApplication,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.attach_file_rounded,
                                size: 18,
                                color: kBlue,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  a.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    color: kBlue,
                                    fontWeight: FontWeight.w600,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 18),
                    Text(
                      n.date,
                      style: const TextStyle(
                        color: Color(0xFF8AA0B5),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (widget.notices.length > 1) ...[
                      const SizedBox(height: 18),
                      const Divider(height: 1),
                      for (final (i, other) in widget.notices.indexed)
                        if (i != _selected)
                          InkWell(
                            onTap: () => setState(() => _selected = i),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      other.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF365675),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    other.date,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF8AA0B5),
                                    ),
                                  ),
                                  const Icon(
                                    Icons.chevron_right_rounded,
                                    color: Color(0xFF7AA6CA),
                                  ),
                                ],
                              ),
                            ),
                          ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 8, 22, 22),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.all(15),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    gradient: primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('확인', style: hanSans(17, spacing: -0.3)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Education, topic and sub-topic screens: gradient tiles, [perPage] at a time.
/// More than [perPage] items → swipeable pages with 이전/다음 buttons.
class TileListPage extends StatefulWidget {
  const TileListPage({
    super.key,
    required this.items,
    required this.voiceMessage,
    required this.backLabel,
    required this.onBack,
    required this.onSelect,
    this.suggestion = false,
  });
  final List<Unit> items;
  final String voiceMessage, backLabel;
  final bool suggestion; // 건의하기 button (place-selection screen, like the web)
  final VoidCallback onBack;
  final ValueChanged<Unit> onSelect;

  static const perPage = 3;

  @override
  State<TileListPage> createState() => _TileListPageState();
}

class _TileListPageState extends State<TileListPage> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _goTo(int page) => _controller.animateToPage(
    page,
    duration: const Duration(milliseconds: 300),
    curve: Curves.easeOut,
  );

  @override
  Widget build(BuildContext context) {
    const per = TileListPage.perPage;
    final items = widget.items;
    final pageCount = (items.length / per).ceil();
    final paged = pageCount > 1;

    Widget column(int page) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Paged screens keep all 3 slots so tiles stay the same size on a short last page.
          for (var slot = 0; slot < (paged ? per : items.length); slot++) ...[
            if (slot > 0) const SizedBox(height: 16),
            Expanded(
              child: page * per + slot < items.length
                  ? CategoryTile(
                      unit: items[page * per + slot],
                      gradient:
                          subTopicColors[(page * per + slot) %
                              subTopicColors.length],
                      onTap: () => widget.onSelect(items[page * per + slot]),
                    )
                  : const SizedBox(),
            ),
          ],
        ],
      ),
    );

    return PageScaffold(
      voiceMessage: widget.voiceMessage,
      body: Padding(
        padding: const EdgeInsets.only(top: 20),
        child: items.isEmpty
            ? Center(
                child: Text(
                  '아직 등록된 단원이 없습니다.',
                  style: hanSans(22, color: kBlue),
                ),
              )
            : paged
            ? PageView.builder(
                controller: _controller,
                itemCount: pageCount,
                onPageChanged: (p) => setState(() => _page = p),
                itemBuilder: (_, p) => column(p),
              )
            : column(0),
      ),
      bottom: Column(
        children: [
          if (paged)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: _PageButton(
                      label: '← 이전',
                      onTap: _page > 0 ? () => _goTo(_page - 1) : null,
                    ),
                  ),
                  SizedBox(
                    width: 80,
                    child: Text(
                      '${_page + 1} / $pageCount',
                      textAlign: TextAlign.center,
                      style: hanSans(18, color: kBlue, spacing: 0),
                    ),
                  ),
                  Expanded(
                    child: _PageButton(
                      label: '다음 →',
                      onTap: _page < pageCount - 1
                          ? () => _goTo(_page + 1)
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          if (widget.suggestion)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: _PageButton(
                label: '건의하기',
                onTap: () => showDialog(
                  context: context,
                  barrierColor: const Color(0x800A2642),
                  builder: (_) => const SuggestionDialog(),
                ),
              ),
            ),
          BottomBackButton(label: widget.backLabel, onTap: widget.onBack),
        ],
      ),
    );
  }
}

/// 건의하기: content only (no name), up to 500 characters. The server takes one per minute
/// per IP; its message is shown and the text is kept, so nothing typed is lost.
class SuggestionDialog extends StatefulWidget {
  const SuggestionDialog({super.key});

  @override
  State<SuggestionDialog> createState() => _SuggestionDialogState();
}

class _SuggestionDialogState extends State<SuggestionDialog> {
  final _text = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final value = _text.text.trim();
    if (value.isEmpty) {
      setState(() => _error = '건의하실 내용을 입력해주세요.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await sendSuggestion(value);
    } catch (e) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = e is Exception && e.toString().startsWith('Exception: ')
              ? e.toString().substring('Exception: '.length)
              : '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.';
        });
      }
      return;
    }
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);
    messenger.showSnackBar(const SnackBar(content: Text('건의해주셔서 감사합니다.')));
  }

  @override
  Widget build(BuildContext context) => Dialog(
    insetPadding: const EdgeInsets.all(24),
    backgroundColor: Colors.white,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('건의하기', style: hanSans(24, color: kBlue)),
          const SizedBox(height: 8),
          Text(
            keepAll('두드림에 바라는 점이나 불편한 점을 자유롭게 작성해주세요.'),
            style: const TextStyle(fontSize: 15, color: Color(0xFF4A6080)),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _text,
            autofocus: true,
            maxLength: 500,
            minLines: 5,
            maxLines: 8,
            style: const TextStyle(fontSize: 17),
            decoration: const InputDecoration(
              hintText: '건의하실 내용을 입력해주세요.',
              border: OutlineInputBorder(),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                _error!,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFFD63031),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.all(14),
                  ),
                  child: const Text('취소', style: TextStyle(fontSize: 17)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _sending ? null : _submit,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.all(14),
                  ),
                  child: Text(
                    _sending ? '보내는 중...' : '확인',
                    style: const TextStyle(fontSize: 17),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

/// Filled page-turn button; greyed out when [onTap] is null.
class _PageButton extends StatelessWidget {
  const _PageButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: enabled ? primaryGradient : null,
          color: enabled ? null : const Color(0xFFDCE7F2),
          borderRadius: BorderRadius.circular(14),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: kBlue.withValues(alpha: 0.25),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: arrowLabel(
          label,
          hanSans(
            19,
            color: enabled ? Colors.white : const Color(0xFF9DB3C8),
            spacing: -0.3,
          ),
        ),
      ),
    );
  }
}

/// Lectures (posts) registered on the server for one 소단원.
class LecturePage extends StatelessWidget {
  const LecturePage({
    super.key,
    required this.sub,
    required this.onBack,
    required this.onSelect,
  });
  final Unit sub;
  final VoidCallback onBack; // to the place-selection screen, like the web
  final ValueChanged<Post> onSelect;

  @override
  Widget build(BuildContext context) => Loader<List<Post>>(
    load: () => fetchPosts(sub.id),
    wrap: (child) => PageScaffold(
      body: child,
      bottom: BottomBackButton(label: '← 이전 화면으로 가기', onTap: onBack),
    ),
    builder: (lectures) => PageScaffold(
      voiceMessage: lectures.isEmpty
          ? '${sub.name}에는 아직 등록된 강의가 없습니다.'
          : '${sub.name} 강의 목록입니다. 원하는 강의를 선택해 주세요. 선택할 수 있는 강의는 ${lectures.map((p) => p.title).join(', ')}입니다.',
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${sub.name} 강의목록', style: hanSans(26, color: kBlue)),
                const SizedBox(height: 6),
                const Text(
                  '원하는 강의를 선택하면 해당 학습 페이지로 즉시 이동합니다.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF4A6080),
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: lectures.isEmpty
                ? Center(
                    child: Text(
                      keepAll('아직 등록된 강의가 없습니다.\n곧 강의가 올라옵니다.'),
                      textAlign: TextAlign.center,
                      style: hanSans(20, color: kBlue, height: 1.5),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                    itemCount: lectures.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => _row(i, lectures[i]),
                  ),
          ),
        ],
      ),
      bottom: BottomBackButton(label: '← 이전 화면으로 가기', onTap: onBack),
    ),
  );

  Widget _row(int i, Post p) => Pressable(
    scale: 0.98,
    onTap: () => onSelect(p),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: kSky.withValues(alpha: 0.18), width: 1.5),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: kBlue.withValues(alpha: 0.07),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('${i + 1}', style: hanSans(18, spacing: 0)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.title,
                  style: hanSans(
                    20,
                    color: const Color(0xFF1A3A5C),
                    spacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                // Same subtitle as the web list.
                Text(
                  p.description.isNotEmpty
                      ? p.description
                      : '슬라이드 ${p.slideCount}장',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF6A84A0),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

/// One lecture from the server: an intro page (description, if any) + its slides.
class LectureViewPage extends StatelessWidget {
  const LectureViewPage({
    super.key,
    required this.postId,
    required this.onGoHome,
    required this.onGoList,
  });
  final int postId;
  final VoidCallback onGoHome, onGoList;

  @override
  Widget build(BuildContext context) => Loader<Post>(
    load: () => fetchPost(postId),
    wrap: (child) => PageScaffold(
      body: child,
      bottom: BottomBackButton(label: '← 목록으로 돌아가기', onTap: onGoList),
    ),
    builder: (post) =>
        _LectureView(post: post, onGoHome: onGoHome, onGoList: onGoList),
  );
}

class _LectureView extends StatefulWidget {
  const _LectureView({
    required this.post,
    required this.onGoHome,
    required this.onGoList,
  });
  final Post post;
  final VoidCallback onGoHome, onGoList;

  @override
  State<_LectureView> createState() => _LectureViewState();
}

class _LectureViewState extends State<_LectureView> {
  late final List<Slide> slides = [
    // Same page order as the web viewer.
    if (widget.post.description.isNotEmpty) Slide(widget.post.description, []),
    ...widget.post.slides,
  ];
  int _step = 0;
  double _fontSize = 17;
  String? _zoomUrl;

  // Text size is kept across lectures and visits (same as the web).
  static const _fontKey = 'font_size';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      final saved = p.getDouble(_fontKey);
      if (saved != null && mounted) setState(() => _fontSize = saved);
    });
  }

  void _changeFont(double by) {
    setState(() => _fontSize = (_fontSize + by).clamp(15, 35));
    SharedPreferences.getInstance().then(
      (p) => p.setDouble(_fontKey, _fontSize),
    );
  }

  Widget _fontButton(String label, IconData icon, double by) => Semantics(
    button: true,
    child: GestureDetector(
      onTap: () => _changeFont(by),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(
          color: kSky.withValues(alpha: 0.08),
          border: Border.all(color: kSky.withValues(alpha: 0.25)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: kBlue),
            const SizedBox(width: 3),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: kBlue,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    ),
  );

  String get _title => widget.post.title;

  @override
  Widget build(BuildContext context) {
    if (slides.isEmpty) {
      return PageScaffold(
        voiceMessage: '$_title. 아직 슬라이드가 등록되지 않은 강의입니다.',
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              keepAll('$_title\n아직 슬라이드가 등록되지 않은 강의입니다.'),
              textAlign: TextAlign.center,
              style: hanSans(20, color: kBlue, height: 1.5),
            ),
          ),
        ),
        bottom: BottomBackButton(label: '← 목록으로 돌아가기', onTap: widget.onGoList),
      );
    }

    final slide = slides[_step];
    final width = MediaQuery.sizeOf(context).width;

    Widget navButton(String label, VoidCallback onTap, {bool filled = false}) =>
        GestureDetector(
          onTap: onTap,
          child: Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: filled ? primaryGradient : null,
              color: filled ? null : Colors.white,
              border: filled ? null : Border.all(color: kSky, width: 2),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: kBlue.withValues(alpha: filled ? 0.3 : 0.12),
                  blurRadius: filled ? 16 : 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: arrowLabel(
                label,
                hanSans(
                  15,
                  color: filled ? Colors.white : kBlue,
                  spacing: -0.3,
                ),
              ),
            ),
          ),
        );

    return Scaffold(
      backgroundColor: kBg,
      body: Stack(
        children: [
          Column(
            children: [
              Header(
                voiceMessage:
                    '$_title, ${_step + 1}단계 안내입니다. ${slide.text.isNotEmpty ? slide.text : ''}',
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 100),
                  child: Column(
                    children: [_media(slide, width), _bodyBox(slide)],
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 24 + MediaQuery.paddingOf(context).bottom,
            child: Row(
              children: [
                Expanded(
                  child: Visibility(
                    visible: _step > 0,
                    maintainSize: true,
                    maintainAnimation: true,
                    maintainState: true,
                    child: navButton('← 이전', () => setState(() => _step--)),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(child: navButton('메뉴로 돌아가기', widget.onGoHome)),
                const SizedBox(width: 6),
                Expanded(
                  child: _step == slides.length - 1
                      ? navButton('목록으로 돌아가기', widget.onGoList, filled: true)
                      : navButton(
                          '다음 →',
                          () => setState(() => _step++),
                          filled: true,
                        ),
                ),
              ],
            ),
          ),
          if (_zoomUrl != null) _zoomOverlay(_zoomUrl!),
        ],
      ),
    );
  }

  Widget _media(Slide slide, double width) {
    final shown = slide.media.where((m) => m.type != 'file').toList();
    return Container(
      height: math.min(width * 0.6, 360),
      margin: const EdgeInsets.only(top: 12, bottom: 10),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFFCCE6F7),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: kBlue.withValues(alpha: 0.13),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (shown.isEmpty)
            // No picture: show the lecture title, like the web placeholder.
            Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  keepAll(_title),
                  textAlign: TextAlign.center,
                  style: hanSans(24, color: kBlue),
                ),
              ),
            )
          else
            // Several pictures/videos sit side by side (same as the web).
            Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  for (final (i, m) in shown.indexed) ...[
                    if (i > 0) const SizedBox(width: 8),
                    Expanded(
                      child: m.type == 'video'
                          ? VideoBox(key: ValueKey(m.url), url: m.url)
                          : GestureDetector(
                              onTap: () => setState(() => _zoomUrl = m.url),
                              child: Image.network(
                                m.url,
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) => const Icon(
                                  Icons.broken_image_outlined,
                                  size: 48,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                    ),
                  ],
                ],
              ),
            ),
          Positioned(
            top: 12,
            right: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black45,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${_step + 1} / ${slides.length}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          if (shown.any((m) => m.type == 'image'))
            Positioned(
              bottom: 10,
              right: 14,
              child: IgnorePointer(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0x59000000),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    '🔍',
                    style: TextStyle(fontSize: 18, height: 1),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _bodyBox(Slide slide) => Container(
    width: double.infinity,
    padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      boxShadow: [
        BoxShadow(
          color: kBlue.withValues(alpha: 0.08),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '$_title · ${_step + 1}단계',
                style: hanSans(19, color: kBlue, spacing: -0.3),
              ),
            ),
            _fontButton('글자 크게', Icons.zoom_in_rounded, 2),
            const SizedBox(width: 6),
            _fontButton('글자 작게', Icons.zoom_out_rounded, -2),
          ],
        ),
        if (slide.text.isNotEmpty) ...[
          const SizedBox(height: 12),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontSize: _fontSize,
              height: 1.9,
              color: const Color(0xFF1A3A5C),
            ),
            child: Text(keepAll(slide.text)),
          ),
        ],
      ],
    ),
  );

  Widget _zoomOverlay(String url) => GestureDetector(
    onTap: () => setState(() => _zoomUrl = null),
    child: Container(
      color: const Color(0xE0000000),
      alignment: Alignment.center,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Center(
            child: FractionallySizedBox(
              widthFactor: 0.96,
              heightFactor: 0.9,
              child: Center(
                child: InteractiveViewer(
                  maxScale: 4,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(url, fit: BoxFit.contain),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 20 + MediaQuery.paddingOf(context).top,
            right: 20,
            child: const Text(
              '✕',
              style: TextStyle(color: Colors.white, fontSize: 28, height: 1),
            ),
          ),
        ],
      ),
    ),
  );
}

/// Slide video: tap to play / pause.
class VideoBox extends StatefulWidget {
  const VideoBox({super.key, required this.url});
  final String url;

  @override
  State<VideoBox> createState() => _VideoBoxState();
}

class _VideoBoxState extends State<VideoBox> {
  late final VideoPlayerController _c =
      VideoPlayerController.networkUrl(Uri.parse(widget.url))..addListener(() {
        if (mounted) setState(() {});
      });
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _c.initialize().catchError((_) {
      if (mounted) setState(() => _failed = true);
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return const Center(
        child: Icon(Icons.videocam_off_outlined, size: 48, color: Colors.white),
      );
    }
    if (!_c.value.isInitialized) {
      return const Center(child: CircularProgressIndicator(color: kSky));
    }
    final playing = _c.value.isPlaying;
    return GestureDetector(
      onTap: () => playing ? _c.pause() : _c.play(),
      child: Center(
        child: AspectRatio(
          aspectRatio: _c.value.aspectRatio,
          child: Stack(
            alignment: Alignment.center,
            children: [
              VideoPlayer(_c),
              if (!playing)
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: const BoxDecoration(
                    color: Colors.black45,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    size: 44,
                    color: Colors.white,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
