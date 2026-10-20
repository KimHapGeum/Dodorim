import { useEffect, useRef } from 'react';

// setTimeout 대체: 페이지를 떠나면 남은 타이머를 모두 정리합니다.
export default function useTimers() {
  const ids = useRef([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return (fn, ms) => ids.current.push(setTimeout(fn, ms));
}
