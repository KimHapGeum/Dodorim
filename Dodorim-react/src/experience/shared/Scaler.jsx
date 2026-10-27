import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 기계를 실제 비율(width x height)로 그리고, 화면 크기에 맞게 통째로 확대/축소합니다.
 * 기계 전체가 한 화면(상단바 제외)에 들어오게 줄이되, 글씨가 너무 작아지지 않도록 높이 때문에는 40%까지만 줄입니다. 휴대폰에서는 기계 위에 붙어 따라오는 접힌 도우미 줄 높이도 뺍니다.
 */
export default function Scaler({ width, height, children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const w = el.clientWidth;
      const guide = el.closest('.dd-exp')?.querySelector('.guide');
      // 도우미가 옆이 아니라 위에 있으면(좁은 화면) 스크롤해도 화면 위에 붙어 있음.
      // 기계가 꽉 차도록 접힌 줄 높이(+안쪽 여백·테두리·간격 54)만 빼고, 펼치면 잠깐 기계를 덮어요
      const stacked = guide && guide.getBoundingClientRect().left < el.getBoundingClientRect().right;
      const h = window.innerHeight - (stacked ? guide.querySelector('.guide-fold').offsetHeight + 54 : 80); // 넓은 화면: 두드림 상단바(60) + 여백
      const byHeight = Math.max(h / height, 0.4);
      setScale(Math.min(1, w / width, byHeight));
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [width, height]);

  return (
    <div ref={ref} className="dd-scaler" style={{ height: height * scale }}>
      <div
        className="dd-scaler-inner"
        style={{ width, height, transform: `scale(${scale})`, marginLeft: -(width * scale) / 2 }}
      >
        {children}
      </div>
    </div>
  );
}
