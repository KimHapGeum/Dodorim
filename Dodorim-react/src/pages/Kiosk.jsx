import { useState } from 'react';
import usePage from '../usePage';
import useTimers from '../useTimers';
import '../styles/kiosk.css';
import { alert } from '../dialog';
import { clickable } from '../a11y';

const INITIAL_MENU = {
  '추천메뉴': [
    { id: 1, name: '불고기버거 세트', price: 7100, img: '🍔🍟' },
    { id: 2, name: '더블패티버거 세트', price: 9100, img: '🍔🥤' },
    { id: 3, name: '오리지널치킨', price: 14200, img: '🍗' },
    { id: 4, name: '양념감자', price: 2200, img: '🍟' },
  ],
  '버거': [{ id: 7, name: '불고기버거 단품', price: 4500, img: '🍔' }],
  '음료': [{ id: 9, name: '콜라', price: 1800, img: '🥤' }],
};

const won = (n) => `${n.toLocaleString()}원`;
const show = { display: 'flex' };

export default function Kiosk() {
  usePage('kiosk', 'DoDream 키오스크 - 터치 스크린 및 예외 처리 추가판');
  const later = useTimers();
  const [splash, setSplash] = useState(true);
  const [category, setCategory] = useState('추천메뉴');
  const [cart, setCart] = useState([]);
  // 'empty' | 'detail' | 'orderType' | 'payType' | 'card' | 'receiptAsk' | 'success' | null
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null); // { item, count }
  const [cardShown, setCardShown] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderNum, setOrderNum] = useState(0);
  const [receipt, setReceipt] = useState('none'); // 'none' | 'printed' | 'taken'

  const totalCount = cart.reduce((s, i) => s + i.count, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.count, 0);

  const submitToCart = () => {
    const { item, count } = detail;
    setCart((c) => (c.some((i) => i.id === item.id)
      ? c.map((i) => (i.id === item.id ? { ...i, count: i.count + count } : i))
      : [...c, { ...item, count }]));
    setModal(null);
  };

  const goToCardInsert = () => {
    setModal('card');
    setCardShown(true);
    setProcessing(false);
  };

  const startCardInsertAnimation = () => {
    if (processing) return;
    setProcessing(true);
    later(() => {
      setOrderNum(Math.floor(Math.random() * 900) + 100);
      setModal('receiptAsk');
    }, 1800);
  };

  const handleReceiptChoice = (wantPrint) => {
    setModal('success');
    if (wantPrint) setReceipt('printed');
  };

  const takeReceipt = () => {
    setReceipt('taken');
    later(async () => {
      await alert(`주문번호 ${orderNum}번 영수증을 정상 수령했습니다!`);
      resetAll();
    }, 300);
  };

  const resetAll = () => {
    setCart([]);
    setModal(null);
    setSplash(true); // 초기 진입 화면(스플래시) 다시 활성화
    setCardShown(false);
    setProcessing(false);
    setReceipt('none');
  };

  return (
    <div className="kiosk-frame">
      <div className="screen">

        {splash && (
          <div className="welcome-splash-screen" {...clickable(() => setSplash(false))}>
            <div className="splash-logo">🍔🍟🥤</div>
            <div className="splash-title">DoDream 버거 맛집</div>
            <div className="splash-sub">화면을 터치해 주세요</div>
          </div>
        )}

        <div className="header-bar">
          <div></div>
          <button className="exit-btn" onClick={resetAll}>나가기 ↩</button>
        </div>

        <div className="main-body">
          <div className="sidebar">
            {Object.keys(INITIAL_MENU).map((cat) => (
              <button key={cat} className={`cat-btn ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>
          <div className="menu-grid">
            {INITIAL_MENU[category].map((item) => (
              <div key={item.id} className="menu-item" {...clickable(() => { setDetail({ item, count: 1 }); setModal('detail'); })}>
                <div className="menu-img">{item.img}</div>
                <div className="menu-name">{item.name}</div>
                <div className="menu-price">{won(item.price)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-summary-bar">
          <div>주문내역</div>
          <div>수량 <span style={{ color: '#d63031', fontWeight: 'bold' }}>{totalCount}</span> 개</div>
          <div>금액</div>
          <div style={{ color: '#d63031', fontWeight: 'bold' }}>{won(totalPrice)}</div>
        </div>

        <div className="cart-container">
          {cart.length === 0 ? <div className="empty-cart-text">선택한 메뉴가 없습니다.</div> : cart.map((item) => (
            <div key={item.id} className="cart-item-row">
              <span>{item.name} ({item.count}개)</span>
              <div>
                <span>{won(item.price * item.count)}</span>
                <button className="cart-delete-btn" onClick={() => setCart(cart.filter((i) => i.id !== item.id))}>❌</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bottom-button-group">
          <button className="grey-btn">&lt; 이전</button>
          <button className="yellow-btn">쿠폰교환권</button>
          <button className="white-btn" onClick={() => setCart([])}>취소하기</button>
          {/* 장바구니가 비어 있으면 경고 팝업, 담겨 있으면 포장 선택 */}
          <button className="red-btn" onClick={() => setModal(cart.length === 0 ? 'empty' : 'orderType')}>결제하기</button>
        </div>

        {modal === 'empty' && (
          <div className="modal-overlay" style={show}>
            <div className="pop-modal">
              <div className="pop-header warning">주문 오류 예외 알림</div>
              <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                <span style={{ fontSize: '45px' }}>⚠️</span>
                <h3 style={{ margin: '15px 0 5px 0', color: '#2d3436' }}>선택된 메뉴가 없습니다!</h3>
                <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>원하는 메뉴를 먼저 선택한 뒤,<br />장바구니에 담고 결제해 주세요.</p>
              </div>
              <button className="modal-close-btn" style={{ backgroundColor: '#f39c12', color: 'white', border: 'none' }} onClick={() => setModal(null)}>확인 (주문으로 돌아가기)</button>
            </div>
          </div>
        )}

        {modal === 'detail' && (
          <div className="modal-overlay" style={show}>
            <div className="detail-modal">
              <div className="detail-img">{detail.item.img}</div>
              <h3 style={{ fontSize: '22px', margin: '10px 0' }}>{detail.item.name}</h3>
              <div className="detail-divider"></div>
              <div className="counter-row">
                <span>{detail.item.name}</span>
                <span style={{ fontWeight: 'bold', color: '#d32f2f' }}>{won(detail.item.price)}</span>
                <div className="counter-box">
                  <button className="count-btn" onClick={() => setDetail({ ...detail, count: Math.max(1, detail.count - 1) })}>-</button>
                  <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{detail.count}</span>
                  <button className="count-btn" onClick={() => setDetail({ ...detail, count: detail.count + 1 })}>+</button>
                </div>
              </div>
              <div className="detail-total-row">
                <span>합계</span>
                <span style={{ color: '#d32f2f', fontSize: '24px', fontWeight: 'bold' }}>{won(detail.item.price * detail.count)}</span>
              </div>
              <button className="modal-submit-btn" onClick={submitToCart}>담기</button>
            </div>
          </div>
        )}

        {modal === 'orderType' && (
          <div className="modal-overlay" style={show}>
            <div className="pop-modal">
              <div className="pop-header">포장을 선택하세요.</div>
              <div className="pop-body">
                <div className="choice-box" {...clickable(() => setModal('payType'))}>
                  <span style={{ fontSize: '50px' }}>🛍️</span>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginTop: '10px' }}>포장</div>
                </div>
                <div className="choice-box" {...clickable(() => setModal('payType'))}>
                  <span style={{ fontSize: '50px' }}>🏪</span>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginTop: '10px' }}>매장</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>취소</button>
            </div>
          </div>
        )}

        {modal === 'payType' && (
          <div className="modal-overlay" style={show}>
            <div className="pop-modal">
              <div className="pop-header">결제수단을 선택하세요.</div>
              <div className="grid-body">
                <button className="grid-method-btn" onClick={goToCardInsert}>신용/체크카드</button>
                {['모바일/바코드', 'K.PAY', '현금결제'].map((m) => (
                  <button key={m} className="grid-method-btn" onClick={() => alert('신용카드 실습 모듈을 선택해주세요!')}>{m}</button>
                ))}
              </div>
              <button className="modal-close-btn" onClick={() => setModal(null)}>뒤로가기</button>
            </div>
          </div>
        )}

        {modal === 'card' && (
          <div className="modal-overlay" style={show}>
            <div className="pop-modal">
              <div className="pop-header">신용/체크 카드 결제</div>
              <div style={{ padding: '15px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', margin: '5px 0', fontWeight: 'bold', color: '#2d3436' }}>[안내] 아래 카드 단말기 버튼을 조작하세요</p>
                <p style={{ fontSize: '13px', color: '#0984e3', fontWeight: 'bold', margin: '10px 0', background: '#e1f5fe', padding: '8px', borderRadius: '6px' }}>👇 리더기에 꽂혀있는 "세로형 신용카드"를 누르면 위로 빨려 들어갑니다!</p>

                <div className="inner-slot-graphic">
                  <span>{processing ? '카드를 흡입했습니다. IC칩 승인 중...' : '카드 투입을 기다리는 중...'}</span>
                  <div className="loading-spinner" style={processing ? { display: 'block' } : undefined}></div>
                </div>
                {!processing && (
                  <button className="modal-close-btn" onClick={() => { setModal(null); setCardShown(false); }}>결제 취소</button>
                )}
              </div>
            </div>
          </div>
        )}

        {modal === 'receiptAsk' && (
          <div className="modal-overlay" style={show}>
            <div className="pop-modal">
              <div className="pop-header">영수증 출력 선택</div>
              <div style={{ padding: '20px 10px 5px 10px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#2d3436', fontSize: '18px' }}>영수증을 출력하시겠습니까?</h3>
                <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>출력 안 함을 선택해도 주문 번호가 부여됩니다.</p>
              </div>
              <div className="pop-body">
                <div className="choice-box" {...clickable(() => handleReceiptChoice(true))}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '5px', color: '#2ecc71' }}>예 (출력함)</div>
                </div>
                <div className="choice-box" {...clickable(() => handleReceiptChoice(false))}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '5px', color: '#e74c3c' }}>아니오 (출력안함)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {modal === 'success' && (
          <div className="modal-overlay" style={show}>
            <div className="pop-modal" style={{ textAlign: 'center', padding: '25px 15px' }}>
              <h2 style={{ color: '#2ecc71', margin: '10px 0 5px 0' }}>주문 및 결제 완료!</h2>
              <p style={{ fontSize: '13px', color: '#7f8c8d', margin: 0 }}>
                {receipt !== 'none' ? '영수증과 하단 배출구의 종이를 꼭 챙겨가세요!' : '카운터 전광판에서 번호가 호출될 때까지 대기하세요.'}
              </p>

              <div style={{ background: '#f8f9fa', border: '2px solid #dfe6e9', borderRadius: '12px', margin: '20px 0', padding: '10px' }}>
                <span style={{ fontSize: '12px', color: '#636e72', fontWeight: 'bold' }}>나의 주문번호</span>
                <div className="big-order-number">{orderNum}</div>
              </div>

              <button style={{ width: '100%', height: '45px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={resetAll}>처음화면으로 (완료)</button>
            </div>
          </div>
        )}
      </div>

      <div className="hardware-container">
        <div className="hardware-left">
          <div className="receipt-printer-box">
            <div className="receipt-slot-line"></div>
            <div
              className={`moving-receipt-paper ${receipt !== 'none' ? 'print-animation' : ''}`}
              style={receipt === 'taken' ? { transition: 'top 0.5s ease, opacity 0.3s', opacity: 0 } : undefined}
              {...(receipt === 'printed' ? clickable(takeReceipt) : { onClick: takeReceipt })}
              aria-label="영수증 가져가기"
            >
              {receipt !== 'none' && (
                <div className="receipt-content-area">
                  <div className="receipt-title-txt">영수증 (실습용)</div>
                  <div style={{ fontSize: '6px', marginBottom: '5px', color: '#555' }}>주문번호 : [ {orderNum}번 ]</div>
                  <div style={{ borderBottom: '1px dashed #ddd', marginBottom: '4px' }}></div>
                  {cart.map((item) => (
                    <div key={item.id} className="receipt-item-line">
                      <span>{item.name} x{item.count}</span>
                      <span>{won(item.price * item.count)}</span>
                    </div>
                  ))}
                  <div className="receipt-total-line">
                    <span>합계 금액</span>
                    <span>{won(totalPrice)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="hw-text" style={receipt !== 'none' ? { color: '#ff7675', fontWeight: 'bold' } : { color: '#bdc3c7' }}>
            {receipt !== 'none' ? '👇 영수증을 가져가세요!' : '영수증 나오는 곳'}
          </div>
        </div>

        <div className="hardware-right">
          <div className="card-reader-box">
            <div className="card-slot-line"></div>
            <div
              className={`moving-vertical-card ${processing ? 'insert-animation' : ''}`}
              style={cardShown ? { display: 'block' } : undefined}
              {...(cardShown ? clickable(startCardInsertAnimation) : { onClick: startCardInsertAnimation })}
              aria-label="카드 넣기"
            >
              <div className="card-ic-chip"></div>
              <div className="card-text">DoDream 카드</div>
            </div>
          </div>
          <div className="hw-text" style={{ color: '#ff7675', fontWeight: 'bold', marginTop: '4px' }}>↑ 카드를 클릭하세요</div>
        </div>
      </div>
    </div>
  );
}
