import { useEffect, useRef, useState } from 'react';
import { beep, tap } from './utils';

/**
 * 카드 결제 흐름 (모든 체험에서 공통)
 * idle(대기) → ready(카드 꽂기 기다림) → processing(결제 중) → remove(카드 빼기) → done
 */
export function useCardPay(onPaid) {
  const [st, setSt] = useState('idle');
  const timer = useRef(null);
  const paidRef = useRef(onPaid);
  paidRef.current = onPaid;

  useEffect(() => () => clearTimeout(timer.current), []);

  const start = () => setSt('ready');

  const clickCard = () => {
    if (st === 'ready') {
      tap();
      setSt('processing');
      timer.current = setTimeout(() => {
        beep(1500, 0.25);
        setSt('remove');
      }, 2500);
    } else if (st === 'remove') {
      tap();
      setSt('done');
      if (paidRef.current) paidRef.current();
    }
  };

  const reset = () => {
    clearTimeout(timer.current);
    setSt('idle');
  };

  return { st, start, clickCard, reset };
}

// 카드 단계별 화면 문구
export const CARD_TEXT = {
  ready: { title: '카드를 투입구에 꽂아 주세요', sub: 'IC칩이 위로 향하게 끝까지 넣어 주세요' },
  processing: { title: '결제 중입니다', sub: '카드를 빼지 마세요' },
  remove: { title: '결제가 완료되었습니다', sub: '카드를 빼 주세요' },
};

// 카드 단계별 도우미 안내
export const CARD_GUIDE = {
  ready: '화면 아래 "카드 투입구"에 카드를 꽂는 단계예요. 반짝이는 카드를 눌러서 꽂아보세요.',
  processing: '결제가 진행 중이에요. 카드를 빼지 말고 잠시만 기다려 주세요.',
  remove: '결제가 끝났어요! 카드를 눌러서 빼 주세요. 카드를 두고 가지 않도록 꼭 챙기세요.',
  done: '',
  idle: '',
};
