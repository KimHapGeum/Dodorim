import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'api.dart';
import 'widgets.dart';

/// 체험하기: the website's experience hall (6 practice machines + 알아보기/자유롭게 해보기),
/// shown as-is so it always matches the web. Leaving #/experience (its "← 홈으로"
/// button or the logo) closes the screen and returns to the app's main page.
class ExperiencePage extends StatefulWidget {
  const ExperiencePage({super.key, required this.onExit});
  final VoidCallback onExit;

  static const url = '$apiBaseUrl/#/experience';

  @override
  State<ExperiencePage> createState() => _ExperiencePageState();
}

class _ExperiencePageState extends State<ExperiencePage> {
  late final WebViewController _web;
  bool _loading = true, _failed = false, _left = false;

  @override
  void initState() {
    super.initState();
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(kBg)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (e) {
            if (e.isForMainFrame != false && mounted) {
              setState(() => _failed = true);
            }
          },
          // The web app is a HashRouter, so going home is a hash change, not a page load.
          onUrlChange: (c) {
            final url = c.url;
            if (url != null && !url.contains('#/experience') && !_left) {
              _left = true;
              widget.onExit();
            }
          },
        ),
      );
    // The guide's "소리로 안내 듣기" plays server audio after a fetch, which Android would otherwise block.
    final platform = _web.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
    }
    _web.loadRequest(Uri.parse(ExperiencePage.url));
  }

  void _retry() {
    setState(() {
      _failed = false;
      _loading = true;
    });
    _web.loadRequest(Uri.parse(ExperiencePage.url));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kBg,
    body: SafeArea(
      child: _failed
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    keepAll('체험하기를 불러오지 못했습니다.\n인터넷 연결을 확인해 주세요.'),
                    textAlign: TextAlign.center,
                    style: hanSans(20, color: kBlue, height: 1.5),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(onPressed: _retry, child: const Text('다시 시도')),
                  TextButton(
                    onPressed: widget.onExit,
                    child: const Text('메뉴로 돌아가기'),
                  ),
                ],
              ),
            )
          : Stack(
              children: [
                WebViewWidget(controller: _web),
                if (_loading)
                  const Center(child: CircularProgressIndicator(color: kSky)),
              ],
            ),
    ),
  );
}
