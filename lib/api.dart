import 'dart:convert';

import 'package:http/http.dart' as http;

/// Dodorim-server address. Set at build time:
///   flutter run --dart-define=API_BASE_URL=http://NAS주소:3000
/// Defaults to the deployed server. For a server on this PC (from the emulator) use http://10.0.2.2:3000.
const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://dodorim.xyz',
);

/// Replaced by a MockClient in tests.
http.Client apiClient = http.Client();

/// Server file paths come back as "/files/..."; make them absolute.
String fileUrl(String path) =>
    path.startsWith('http') ? path : '$apiBaseUrl$path';

Future<dynamic> getJson(String path) async => _decode(
  await apiClient
      .get(Uri.parse('$apiBaseUrl/api$path'))
      .timeout(const Duration(seconds: 10)),
);

Future<dynamic> postJson(String path, Object body) async => _decode(
  await apiClient
      .post(
        Uri.parse('$apiBaseUrl/api$path'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      )
      .timeout(const Duration(seconds: 10)),
);

/// Throws the server's own error message (e.g. the 1-minute suggestion limit).
dynamic _decode(http.Response res) {
  final body = utf8.decode(res.bodyBytes);
  if (res.statusCode < 200 || res.statusCode >= 300) {
    String? message;
    try {
      message = (jsonDecode(body) as Map)['error'] as String?;
    } catch (_) {}
    throw Exception(message ?? '요청에 실패했습니다. (${res.statusCode})');
  }
  return jsonDecode(body);
}

/// 대단원(1) > 중단원(2) > 소단원(3) — GET /api/categories
class Unit {
  Unit.fromJson(Map<String, dynamic> j)
    : id = j['id'] as int,
      name = j['name'] as String,
      description = (j['description'] as String?) ?? '',
      iconUrl = j['iconUrl'] == null ? null : fileUrl(j['iconUrl'] as String),
      children = [
        for (final c in (j['children'] as List? ?? const []))
          Unit.fromJson(c as Map<String, dynamic>),
      ];
  final int id;
  final String name, description;
  final String? iconUrl;
  final List<Unit> children;
}

Future<List<Unit>> fetchUnits() async => [
  for (final c in await getJson('/categories') as List)
    Unit.fromJson(c as Map<String, dynamic>),
];

/// 강의 — GET /api/posts?categoryId= (list) and /api/posts/:id (with slides)
class Post {
  Post.fromJson(Map<String, dynamic> j)
    : id = j['id'] as int,
      title = j['title'] as String,
      description = (j['description'] as String?) ?? '',
      slideCount = (j['slideCount'] as int?) ?? 0,
      slides = [
        for (final s in (j['slides'] as List? ?? const []))
          Slide.fromJson(s as Map<String, dynamic>),
      ];
  final int id;
  final String title, description;
  final int slideCount;
  final List<Slide> slides;
}

class Media {
  const Media(this.type, this.url);
  final String type; // 'image' | 'video' | 'file'
  final String url;
}

class Slide {
  Slide(this.text, this.media);
  Slide.fromJson(Map<String, dynamic> j)
    : text = (j['text'] as String?) ?? '',
      media = [
        for (final m in (j['media'] as List? ?? const []))
          Media(m['type'] as String, fileUrl(m['url'] as String)),
      ];
  final String text;
  final List<Media> media;
}

/// The server lists newest first; reversed so 1, 2, 3 follow registration order, like the web.
Future<List<Post>> fetchPosts(int categoryId) async => [
  for (final p
      in (await getJson('/posts?categoryId=$categoryId') as List).reversed)
    Post.fromJson(p as Map<String, dynamic>),
];

Future<Post> fetchPost(int id) async =>
    Post.fromJson(await getJson('/posts/$id') as Map<String, dynamic>);

class Notice {
  const Notice(
    this.title,
    this.date,
    this.content, [
    this.attachments = const [],
  ]);
  final String title, date, content;
  final List<Attachment> attachments;
}

class Attachment {
  const Attachment(this.name, this.url);
  final String name, url;
}

class PromoBanner {
  const PromoBanner({
    required this.title,
    required this.desc,
    this.image,
    required this.color,
    required this.subColor,
  });
  final String title, desc;
  final String? image; // server URL, or an asset path for the built-in banners
  final int color, subColor; // ARGB
}

int _hex(Object? v, int fallback) {
  final s = (v as String? ?? '').replaceFirst('#', '');
  return s.length == 6 ? int.tryParse('FF$s', radix: 16) ?? fallback : fallback;
}

/// "2026-09-22..." → "2026.09.22" (same as the web)
String _displayDate(Object? d) => (d as String? ?? '')
    .padRight(10)
    .substring(0, 10)
    .trim()
    .replaceAll('-', '.');

Future<List<Notice>> fetchNotices() async => [
  for (final n in await getJson('/notices') as List)
    Notice(
      n['title'] as String,
      _displayDate(n['date']),
      (n['content'] as String?) ?? '',
      [
        for (final a in (n['attachments'] as List? ?? const []))
          Attachment(a['name'] as String, fileUrl(a['url'] as String)),
      ],
    ),
];

/// 건의하기 — POST /api/suggestions (content only, 500 chars, once a minute per IP)
Future<void> sendSuggestion(String content) =>
    postJson('/suggestions', {'content': content});

Future<List<PromoBanner>> fetchBanners() async => [
  for (final b in await getJson('/banners') as List)
    PromoBanner(
      title: b['title'] as String,
      desc: (b['desc'] as String?) ?? '',
      image: b['img'] == null ? null : fileUrl(b['img'] as String),
      color: _hex(b['color'], 0xFF0056B3),
      subColor: _hex(b['subColor'], 0xFFA5C0E4),
    ),
];
