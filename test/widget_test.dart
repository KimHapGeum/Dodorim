import 'dart:convert';

import 'package:dodorim_app/api.dart';
import 'package:dodorim_app/main.dart';
import 'package:dodorim_app/widgets.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Same JSON shapes as Dodorim-server (src/routes/*.js).
Map<String, dynamic> unit(
  int id,
  String name, [
  List<Map<String, dynamic>> children = const [],
  String? desc,
]) => {
  'id': id,
  'parentId': null,
  'depth': 1,
  'name': name,
  'description': desc,
  'iconUrl': null,
  'sortOrder': id,
  'children': children,
};

final tree = [
  unit(1, '키오스크', [
    unit(10, '병원'),
    unit(11, '공공시설'),
    unit(12, '음식점/카페', [
      for (final (i, n) in [
        '버거킹',
        '롯데리아',
        '맥도날드',
        '메가커피',
        '컴포즈',
        '스타벅스',
      ].indexed)
        unit(100 + i, n),
    ]),
  ]),
  unit(2, '셀프 계산대'),
  unit(3, '전자기기'),
  unit(4, '새 대단원', [], '관리자가 쓴 설명'),
];

Map<String, dynamic> post(int id, String title, {List slides = const []}) => {
  'id': id,
  'title': title,
  'description': null,
  'categoryId': 105,
  'slideCount': slides.length,
  'slides': slides,
};

final slides = [
  for (var no = 1; no <= 3; no++)
    {
      'no': no,
      'text': '슬라이드 $no 설명',
      'media': [
        {'name': 'a.jpg', 'type': 'image', 'url': '/files/posts/7/$no/a.jpg'},
      ],
    },
];

http.Response json(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json; charset=utf-8'},
);

/// Suggestions the fake server accepted; [suggestionLimited] answers like the 1-minute limit.
final suggestions = <String>[];
var suggestionLimited = false;

MockClient fakeServer({bool down = false}) => MockClient((req) async {
  if (down) throw http.ClientException('connection refused');
  final p = req.url.path;
  if (p == '/api/suggestions' && req.method == 'POST') {
    if (suggestionLimited) {
      return json({'error': '건의는 1분에 한 번만 보낼 수 있습니다.'}, 429);
    }
    suggestions.add((jsonDecode(req.body) as Map)['content'] as String);
    return json({'id': 1}, 201);
  }
  if (p == '/api/categories') return json(tree);
  if (p == '/api/notices') {
    return json([
      {
        'id': 1,
        'title': '서버 공지',
        'date': '2026-09-22T00:00:00.000Z',
        'content': '본문',
        'attachments': [
          {'name': '안내문.pdf', 'url': '/files/notices/1/%EC%95%88.pdf'},
        ],
      },
    ]);
  }
  if (p == '/api/banners') {
    return json([
      for (final (i, t) in ['첫 배너', '둘째 배너', '셋째 배너'].indexed)
        {
          'id': i,
          'title': t,
          'desc': '$t 설명',
          'img': '/files/banners/$i/a.png',
          'color': '#1A4B8F',
          'subColor': '#A5C0E4',
        },
    ]);
  }
  // newest first, like the server
  if (p == '/api/posts' && req.url.queryParameters['categoryId'] == '105') {
    return json([post(8, '커스터마이징하기'), post(7, '음료 주문하기')]);
  }
  if (p == '/api/posts/7') return json(post(7, '음료 주문하기', slides: slides));
  return json({'error': '없는 API입니다.'}, 404);
});

void main() {
  final spoken = <String>[];

  setUp(() {
    spoken.clear();
    suggestions.clear();
    suggestionLimited = false;
    voiceOn.value = false;
    SharedPreferences.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('flutter_tts'), (
          call,
        ) async {
          if (call.method == 'speak') spoken.add(call.arguments as String);
          return 1;
        });
  });

  Future<void> start(WidgetTester tester) async {
    // A typical phone screen (412×915 dp).
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.625;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(const DodorimApp());
    // Let the splash animation play frame by frame until the main page is up.
    for (var i = 0; i < 100 && find.text('교육 시작하기').evaluate().isEmpty; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pumpAndSettle();
  }

  Future<void> tap(WidgetTester tester, String text) async {
    await tester.tap(find.text(text));
    await tester.pumpAndSettle();
  }

  testWidgets('main page shows the server notice', (tester) async {
    apiClient = fakeServer();
    await start(tester);
    expect(find.text('서버 공지'), findsOneWidget);

    await tap(tester, '서버 공지');
    expect(find.text(keepAll('본문')), findsOneWidget);
    expect(find.text('2026.09.22'), findsOneWidget);
  });

  testWidgets('walks units → lectures → slides from the server', (
    tester,
  ) async {
    apiClient = fakeServer();
    await start(tester);

    await tap(tester, '교육 시작하기');
    // 4 대단원 → 2 pages; built-in description for 키오스크, server description for the new one
    expect(find.text('1 / 2'), findsOneWidget);
    expect(find.textContaining('주문하는 방법을 연습합니다'), findsOneWidget);
    await tap(tester, '다음');
    expect(find.text('관리자가 쓴 설명'), findsOneWidget);
    await tap(tester, '이전');

    await tap(tester, '키오스크');
    await tap(tester, '음식점/카페');
    await tap(tester, '다음');
    await tap(tester, '스타벅스');

    // Lectures in registration order
    expect(find.text('스타벅스 강의목록'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('음료 주문하기')).dy,
      lessThan(tester.getTopLeft(find.text('커스터마이징하기')).dy),
    );

    await tap(tester, '음료 주문하기');
    expect(find.text('1 / 3'), findsOneWidget);
    expect(find.text(keepAll('슬라이드 1 설명')), findsOneWidget);
    await tap(tester, '다음');
    await tap(tester, '다음');
    expect(find.text(keepAll('슬라이드 3 설명')), findsOneWidget);
    await tap(tester, '목록으로 돌아가기');
    expect(find.text('스타벅스 강의목록'), findsOneWidget);
  });

  testWidgets('server down: built-in notice, then retry message on units', (
    tester,
  ) async {
    apiClient = fakeServer(down: true);
    await start(tester);
    expect(find.text('새로운 교육 콘텐츠가 추가되었습니다'), findsOneWidget);

    await tap(tester, '교육 시작하기');
    expect(find.text('불러오지 못했습니다.'), findsOneWidget);

    apiClient = fakeServer();
    await tap(tester, '다시 시도');
    expect(find.text('키오스크'), findsOneWidget);
  });

  testWidgets('voice guide stays on across pages and reads each page', (
    tester,
  ) async {
    apiClient = fakeServer();
    await start(tester);
    await tap(tester, '교육 시작하기');
    expect(spoken, isEmpty); // off by default

    await tap(tester, '음성안내 꺼짐');
    expect(find.text('음성안내 켜짐'), findsOneWidget);
    expect(spoken.last, startsWith('배우고 싶은 교육 종류를'));

    await tap(tester, '키오스크');
    expect(find.text('음성안내 켜짐'), findsOneWidget);
    expect(spoken.last, startsWith('키오스크에서 배우고 싶은 주제를'));

    await tap(tester, '음성안내 켜짐');
    final count = spoken.length;
    await tap(tester, '병원');
    expect(find.text('음성안내 꺼짐'), findsOneWidget);
    expect(spoken.length, count); // off: nothing read on the next page
  });

  testWidgets(
    'banners: start in the middle, move every 3 s, swipe both ways endlessly',
    (tester) async {
      apiClient = fakeServer();
      await start(tester);
      expect(find.text(keepAll('둘째 배너')), findsOneWidget); // middle of 3

      await tester.pump(const Duration(seconds: 3)); // autoplay
      await tester.pumpAndSettle();
      expect(find.text(keepAll('셋째 배너')), findsOneWidget);

      await tester.drag(
        find.byType(PageView).first,
        const Offset(-300, 0),
      ); // swipe left: past the last one
      await tester.pumpAndSettle();
      expect(find.text(keepAll('첫 배너')), findsOneWidget);

      await tester.drag(
        find.byType(PageView).first,
        const Offset(300, 0),
      ); // swipe right: back
      await tester.pumpAndSettle();
      expect(find.text(keepAll('셋째 배너')), findsOneWidget);

      // A swipe restarts the 3-second count.
      await tester.pump(const Duration(milliseconds: 2500));
      await tester.pumpAndSettle();
      expect(find.text(keepAll('셋째 배너')), findsOneWidget);
    },
  );

  testWidgets('no server banners: built-in ones from the web', (tester) async {
    apiClient = fakeServer(down: true);
    await start(tester);
    expect(find.text(keepAll('어려운 기술은 없습니다')), findsOneWidget);
  });

  testWidgets('splash: letters pop up one at a time', (tester) async {
    apiClient = fakeServer();
    await tester.pumpWidget(const DodorimApp());
    double opacity(String ch) => tester
        .widget<Opacity>(
          find
              .ancestor(of: find.text(ch).first, matching: find.byType(Opacity))
              .first,
        )
        .opacity;

    await tester.pump(
      const Duration(milliseconds: 3500),
    ); // start delay (no first-frame signal in tests → 3 s cap + 0.5 s)
    await tester.pump(const Duration(milliseconds: 480));
    expect(opacity('두'), greaterThan(0));
    expect(opacity('림'), 0);

    await tester.pump(const Duration(milliseconds: 1400));
    expect([opacity('두'), opacity('드'), opacity('림')], [1, 1, 1]);

    await tester.pump(
      const Duration(milliseconds: 1300),
    ); // word stays on screen
    expect(find.text('교육 시작하기'), findsNothing);
    await tester.pump(); // fade out starts
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    expect(find.text('교육 시작하기'), findsOneWidget);
  });

  testWidgets('notice popup lists its attachments', (tester) async {
    apiClient = fakeServer();
    await start(tester);
    await tap(tester, '서버 공지');
    expect(find.text('안내문.pdf'), findsOneWidget);
  });

  testWidgets('건의하기: empty warning, server limit message, then sent', (
    tester,
  ) async {
    apiClient = fakeServer();
    await start(tester);
    await tap(tester, '교육 시작하기');
    await tap(tester, '키오스크');
    await tap(tester, '병원');

    await tap(tester, '건의하기');
    await tap(tester, '확인');
    expect(
      find.text('건의하실 내용을 입력해주세요.'),
      findsNWidgets(2),
    ); // placeholder + warning

    await tester.enterText(find.byType(TextField), '  글씨를 키워 주세요  ');
    suggestionLimited = true;
    await tap(tester, '확인');
    expect(find.text('건의는 1분에 한 번만 보낼 수 있습니다.'), findsOneWidget);
    expect(suggestions, isEmpty);

    suggestionLimited = false;
    await tap(tester, '확인');
    expect(suggestions, ['글씨를 키워 주세요']);
    expect(find.byType(TextField), findsNothing);
    expect(find.text('건의해주셔서 감사합니다.'), findsOneWidget);
  });

  testWidgets(
    'lecture list goes back to the place screen; text size is saved',
    (tester) async {
      apiClient = fakeServer();
      await start(tester);
      await tap(tester, '교육 시작하기');
      await tap(tester, '키오스크');
      await tap(tester, '음식점/카페');
      await tap(tester, '다음');
      await tap(tester, '스타벅스');
      await tap(tester, '음료 주문하기');

      double size() => tester
          .widget<AnimatedDefaultTextStyle>(
            find
                .ancestor(
                  of: find.text(keepAll('슬라이드 1 설명')),
                  matching: find.byType(AnimatedDefaultTextStyle),
                )
                .first,
          )
          .style
          .fontSize!;
      expect(size(), 17);
      await tap(tester, '글자 크게');
      await tap(tester, '글자 크게');
      expect(size(), 21);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getDouble('font_size'), 21);

      await tap(tester, '다음');
      await tap(tester, '다음');
      await tap(tester, '목록으로 돌아가기');
      await tap(tester, '이전 화면으로 가기');
      expect(find.text('버거킹'), findsOneWidget); // place screen again
    },
  );
}
