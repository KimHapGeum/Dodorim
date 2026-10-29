import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import 'api.dart';

LinearGradient grad(int a, int b) => LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(a), Color(b)],
);

final primaryGradient = grad(0xFF0056B3, 0xFF00A0E9);

// Shown until the server answers, and kept when the server has no banners/notices.
const defaultBanners = [
  // Same as Dodorim-react src/data/defaults.js DEFAULT_BANNERS.
  PromoBanner(
    image: 'assets/banners/banner_kiosk.png',
    color: 0xFF7DB249,
    subColor: 0xFFAFD485,
    title: '내 손안의 작은 키오스크',
    desc:
        '카페 주문부터 병원 접수까지 실제와 똑같은 화면으로 연습하고\n세상 밖으로 당당하게 나아가세요. 반복 연습이 자신감이 됩니다.',
  ),
  PromoBanner(
    image: 'assets/banners/banner_tech.png',
    color: 0xFF1A4B8F,
    subColor: 0xFFA5C0E4,
    title: '어려운 기술은 없습니다',
    desc: '단지 익숙하지 않을 뿐입니다. 두드림이 친절한 길잡이가 되어드릴게요.\n실수해도 괜찮으니 여기서 마음껏 연습해 보세요.',
  ),
  PromoBanner(
    image: 'assets/banners/banner_world.png',
    color: 0xFFE67E22,
    subColor: 0xFFF6C777,
    title: '당당하게 세상과 소통하기',
    desc: '디지털로 세상과 더 넓게 연결되기를 바랍니다.\n여러분의 당당한 자립을 위해 두드림이 끝까지 함께하겠습니다.',
  ),
];

const defaultNotices = [
  Notice(
    '새로운 교육 콘텐츠가 추가되었습니다',
    '2025.03.08',
    '두드림에서 더 다양한 디지털 기기 사용법을 연습하실 수 있도록 새로운 교육 콘텐츠를 준비했습니다. 교육 시작하기를 눌러 천천히 따라 해보세요.',
  ),
];

final subTopicColors = [
  grad(0xFF0056B3, 0xFF00A0E9),
  grad(0xFF0077C8, 0xFF29B6F6),
  grad(0xFF00838F, 0xFF26C6DA),
  grad(0xFF1565C0, 0xFF42A5F5),
  grad(0xFF006494, 0xFF0096C7),
  grad(0xFF023E8A, 0xFF0077B6),
];

/// Default look of the built-in units, keyed by the unit name used on the server
/// (Dodorim-react src/data/places.js MAIN_LOOK / MID_LOOK / SUB_LOOK).
/// The server's own description / uploaded icon wins over these; units added by an admin
/// without an icon fall back to a generic icon.
class Look {
  const Look({this.icon, this.image, this.desc = ''});
  final FaIconData? icon; // Font Awesome icon (대단원·중단원)
  final String? image; // asset picture (소단원)
  final String
  desc; // '\n' marks the intended line break, as in the React cards
}

const _img = 'assets/units';

const Map<String, Look> unitLooks = {
  // 대단원
  '키오스크': Look(
    icon: FontAwesomeIcons.display,
    desc: '식당과 카페에서 당당하게!\n주문하는 방법을 연습합니다.',
  ),
  '셀프 계산대': Look(
    icon: FontAwesomeIcons.barcode,
    desc: '마트나 편의점에서 직접\n바코드를 찍고 결제해 봅니다.',
  ),
  '전자기기': Look(
    icon: FontAwesomeIcons.mobileButton,
    desc: '스마트폰 기본 사용법부터\n은행 ATM기기까지 알아봅니다.',
  ),
  // 중단원
  '병원': Look(
    icon: FontAwesomeIcons.hospitalUser,
    desc: '접수부터 수납, 처방전 발행까지\n병원 업무를 연습합니다.',
  ),
  '공공시설': Look(
    icon: FontAwesomeIcons.landmark,
    desc: '주민등록등본 등 각종 서류를\n무인발급기에서 뽑아봅니다.',
  ),
  '음식점/카페': Look(
    icon: FontAwesomeIcons.utensils,
    desc: '메뉴 선택부터 결제까지!\n주문 과정을 직접 연습합니다.',
  ),
  '대형 매장': Look(
    icon: FontAwesomeIcons.cartFlatbedSuitcase,
    desc: '마트나 쇼핑몰에서 많은 물건을\n차근차근 계산하는 법을 배웁니다.',
  ),
  '무인 매장': Look(
    icon: FontAwesomeIcons.basketShopping,
    desc: '편의점이나 무인 가게에서\n간편하게 결제하는 법을 연습합니다.',
  ),
  '휴대폰': Look(
    icon: FontAwesomeIcons.mobileScreenButton,
    desc: '전화, 문자, 앱 설치 등\n기본적인 휴대폰 사용법을 익힙니다.',
  ),
  'ATM': Look(
    icon: FontAwesomeIcons.moneyBillTransfer,
    desc: '은행 무인기기에서 입금,\n출금, 송금하는 법을 연습합니다.',
  ),
  // 소단원
  '동네병원': Look(image: '$_img/clinic.png'),
  '종합병원': Look(image: '$_img/general_hospital.jpg'),
  '민원/발급': Look(image: '$_img/civil.jpg'),
  '기차역': Look(image: '$_img/train.jpg'),
  '공항': Look(image: '$_img/airport.jpg'),
  '영화관': Look(image: '$_img/cinema.jpg'),
  '버거킹': Look(image: '$_img/burgerking.jpg'),
  '롯데리아': Look(image: '$_img/lotteria.jpg'),
  '맥도날드': Look(image: '$_img/mcdonalds.jpg'),
  '메가커피': Look(image: '$_img/megacoffee.jpg'),
  '컴포즈': Look(image: '$_img/compose.jpg'),
  '스타벅스': Look(image: '$_img/starbucks.jpg'),
  '다이소': Look(
    image: '$_img/daiso.jpg',
    desc: '다양한 생활용품을 골라 담고\n바코드를 직접 찍으며 결제합니다.',
  ),
  '홈플러스': Look(
    image: '$_img/homeplus.jpg',
    desc: '대형 마트 카트 가득 담은 물건의\n수량을 확인하며 차근차근 배웁니다.',
  ),
  '아이스크림': Look(
    image: '$_img/icecream.jpg',
    desc: '달콤한 간식을 직접 고르고\n키오스크 화면에서 손쉽게 결제합니다.',
  ),
  '무인편의점': Look(
    image: '$_img/convenience.jpg',
    desc: '늦은 시간에도 당황하지 않고\n필요한 물건을 스스로 계산해봅니다.',
  ),
  '전화/문자하기': Look(
    image: '$_img/phone.png',
    desc: '가족, 친구들과 자유롭게 연락하는\n전화 걸기와 문자 사용법을 배웁니다.',
  ),
  'KB 국민은행': Look(
    image: '$_img/kb.png',
    desc: '국민은행의 노란색 화면을 보며\n현금 출금과 입금, 송금을 연습합니다.',
  ),
  'NH 농협은행': Look(
    image: '$_img/nh.png',
    desc: '농협은행의 초록색 화면을 보며\n차근차근 돈을 보내고 확인해봅니다.',
  ),
};
