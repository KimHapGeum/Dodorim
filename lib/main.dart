import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'experience.dart';
import 'screens.dart';
import 'widgets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 음성 안내 on/off is remembered for the next visit (same as the web).
  final prefs = await SharedPreferences.getInstance();
  voiceOn.value = prefs.getBool('voice') ?? false;
  voiceOn.addListener(() => prefs.setBool('voice', voiceOn.value));
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const DodorimApp());
}

class DodorimApp extends StatelessWidget {
  const DodorimApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: '두드림',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(colorSchemeSeed: kBlue, scaffoldBackgroundColor: kBg),
    home: const AppShell(),
  );
}

enum PageId { main, education, topic, subtopic, lecture, lectureview, kiosk }

/// Mirrors the React App: one state machine instead of a route stack.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  bool _showMain = false;
  bool _fadeOut = false;
  PageId _page = PageId.main;
  Unit? _main, _mid, _sub; // selected 대단원 / 중단원 / 소단원
  int? _postId;

  void _go(PageId p) => setState(() => _page = p);

  // Android back button follows the same targets as the on-screen back buttons.
  PageId? get _backTarget => switch (_page) {
    PageId.main => null,
    PageId.education => PageId.main,
    PageId.topic => PageId.education,
    PageId.subtopic => PageId.topic,
    PageId.lecture => PageId.subtopic,
    PageId.lectureview => PageId.lecture,
    PageId.kiosk => PageId.main,
  };

  @override
  Widget build(BuildContext context) {
    if (!_showMain) {
      return Material(
        color: kBg, // what shows through while the splash fades out
        // The splash says when its animation is done; then fade it out and show the main page.
        child: AnimatedOpacity(
          opacity: _fadeOut ? 0 : 1,
          duration: const Duration(milliseconds: 400),
          onEnd: () => setState(() => _showMain = true),
          child: SplashScreen(onDone: () => setState(() => _fadeOut = true)),
        ),
      );
    }
    return PopScope(
      canPop: _backTarget == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _go(_backTarget!);
      },
      child: KeyedSubtree(key: ValueKey(_page), child: _buildPage()),
    );
  }

  String _list(List<Unit> units) => units.map((u) => u.name).join(', ');

  Widget _buildPage() => switch (_page) {
    PageId.main => MainPage(
      onEducationStart: () => _go(PageId.education),
      onPractice: () => _go(PageId.kiosk),
    ),
    PageId.kiosk => ExperiencePage(onExit: () => _go(PageId.main)),
    // The unit tree is read from the server each time, so admin edits show up right away (same as the web).
    PageId.education => Loader<List<Unit>>(
      load: fetchUnits,
      wrap: (child) => PageScaffold(
        body: child,
        bottom: BottomBackButton(
          label: '← 메뉴로 돌아가기',
          onTap: () => _go(PageId.main),
        ),
      ),
      builder: (mains) => TileListPage(
        items: mains,
        voiceMessage: '배우고 싶은 교육 종류를 선택해 주세요. 선택할 수 있는 교육은 ${_list(mains)}입니다.',
        backLabel: '← 메뉴로 돌아가기',
        onBack: () => _go(PageId.main),
        onSelect: (u) => setState(() {
          _main = u;
          _page = PageId.topic;
        }),
      ),
    ),
    PageId.topic => TileListPage(
      items: _main!.children,
      voiceMessage:
          '${_main!.name}에서 배우고 싶은 주제를 선택해 주세요. 선택할 수 있는 주제는 ${_list(_main!.children)}입니다.',
      backLabel: '← 뒤로 돌아가기',
      onBack: () => _go(PageId.education),
      onSelect: (u) => setState(() {
        _mid = u;
        _page = PageId.subtopic;
      }),
    ),
    PageId.subtopic => TileListPage(
      items: _mid!.children,
      voiceMessage:
          '${_mid!.name}의 세부 항목을 선택해 주세요. 선택할 수 있는 항목은 ${_list(_mid!.children)}입니다.',
      backLabel: '← 뒤로 돌아가기',
      onBack: () => _go(PageId.topic),
      suggestion: true,
      onSelect: (u) => setState(() {
        _sub = u;
        _page = PageId.lecture;
      }),
    ),
    PageId.lecture => LecturePage(
      sub: _sub!,
      onBack: () => _go(PageId.subtopic),
      onSelect: (p) => setState(() {
        _postId = p.id;
        _page = PageId.lectureview;
      }),
    ),
    PageId.lectureview => LectureViewPage(
      postId: _postId!,
      onGoHome: () => _go(PageId.main),
      onGoList: () => _go(PageId.lecture),
    ),
  };
}
