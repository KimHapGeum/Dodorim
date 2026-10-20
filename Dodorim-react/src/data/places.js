// 기본 분류(DB 초기 데이터)의 화면 모양: 전용 화면 주소, 아이콘, 그림, 설명.
// 관리자가 새로 만든 분류는 여기에 없으므로 등록한 아이콘 이미지·설명과 공용 화면(/units, /places)을 사용
export const MAIN_LOOK = {
  '키오스크': { route: '/kiosk_edu', icon: 'fa-display', desc: '식당과 카페에서 당당하게!\n주문하는 방법을 연습합니다.' },
  '셀프 계산대': { route: '/self_check', icon: 'fa-barcode', desc: '마트나 편의점에서 직접\n바코드를 찍고 결제해 봅니다.' },
  '전자기기': { route: '/device_edu', icon: 'fa-mobile-button', desc: '스마트폰 기본 사용법부터\n은행 ATM기기까지 알아봅니다.' },
};

// main: 이 대단원 아래 있을 때만 전용 화면 사용 (다른 대단원으로 옮기면 공용 화면 /places)
export const MID_LOOK = {
  '병원': { main: '키오스크', route: '/hospital', icon: 'fa-hospital-user', bg: 'bg-hospital', desc: '접수부터 수납, 처방전 발행까지\n병원 업무를 연습합니다.' },
  '공공시설': { main: '키오스크', route: '/public_edu', icon: 'fa-landmark', bg: 'bg-public', desc: '주민등록등본 등 각종 서류를\n무인발급기에서 뽑아봅니다.' },
  '음식점/카페': { main: '키오스크', route: '/food', icon: 'fa-utensils', bg: 'bg-food', desc: '메뉴 선택부터 결제까지!\n주문 과정을 직접 연습합니다.' },
  '대형 매장': { main: '셀프 계산대', route: '/mart_edu', icon: 'fa-cart-flatbed-suitcase', bg: 'bg-mart', desc: '마트나 쇼핑몰에서 많은 물건을\n차근차근 계산하는 법을 배웁니다.' },
  '무인 매장': { main: '셀프 계산대', route: '/self_store_edu', icon: 'fa-basket-shopping', bg: 'bg-unmanned', desc: '편의점이나 무인 가게에서\n간편하게 결제하는 법을 연습합니다.' },
  '휴대폰': { main: '전자기기', route: '/phone', icon: 'fa-mobile-screen-button', bg: 'bg-phone', desc: '전화, 문자, 앱 설치 등\n기본적인 휴대폰 사용법을 익힙니다.' },
  'ATM': { main: '전자기기', route: '/atm', icon: 'fa-money-bill-transfer', bg: 'bg-atm', desc: '은행 무인기기에서 입금,\n출금, 송금하는 법을 연습합니다.' },
};

export const SUB_LOOK = {
  '동네병원': { img: 'hospital.img/h.png' },
  '종합병원': { img: 'hospital.img/sm.jpg' },
  '민원/발급': { img: 'Public.img/Ma.jpg' },
  '기차역': { img: 'Public.img/ktx.jpg' },
  '공항': { img: 'Public.img/Ai.jpg' },
  '영화관': { img: 'Public.img/tick.jpg' },
  '버거킹': { img: 'Image/bu.jpg' },
  '롯데리아': { img: 'Image/lo.jpg' },
  '맥도날드': { img: 'Image/ma.jpg' },
  '메가커피': { img: 'Image/me.jpg' },
  '컴포즈': { img: 'Image/co.jpg' },
  '스타벅스': { img: 'Image/st.jpg' },
  '다이소': { img: 'big.img/da.jpg', desc: '다양한 생활용품을 골라 담고\n바코드를 직접 찍으며 결제합니다.' },
  '홈플러스': { img: 'big.img/hame.jpg', desc: '대형 마트 카트 가득 담은 물건의\n수량을 확인하며 차근차근 배웁니다.' },
  '아이스크림': { img: 'Unmanned.img/ice.jpg', desc: '달콤한 간식을 직접 고르고\n키오스크 화면에서 손쉽게 결제합니다.' },
  '무인편의점': { img: 'Unmanned.img/emart.jpg', desc: '늦은 시간에도 당황하지 않고\n필요한 물건을 스스로 계산해봅니다.' },
  '전화/문자하기': { img: 'Image/jeonhwa.png', desc: '가족, 친구들과 자유롭게 연락하는\n전화 걸기와 문자 사용법을 배웁니다.' },
  'KB 국민은행': { img: 'Image/kb.png', desc: '국민은행의 노란색 화면을 보며\n현금 출금과 입금, 송금을 연습합니다.' },
  'NH 농협은행': { img: 'Image/nh.png', desc: '농협은행의 초록색 화면을 보며\n차근차근 돈을 보내고 확인해봅니다.' },
};

// 분류를 눌렀을 때 갈 화면
export const mainRoute = (c) => MAIN_LOOK[c.name]?.route || `/units?id=${c.id}`;
export const midRoute = (c, mainName) => (MID_LOOK[c.name]?.main === mainName && MID_LOOK[c.name].route) || `/places?id=${c.id}`;
