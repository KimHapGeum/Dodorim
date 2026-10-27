import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 기계를 실제 비율(width x height)로 그리고, 화면 크기에 맞게 통째로 확대/축소합니다.
 * 글씨가 너무 작아지지 않도록 높이 때문에는 80%까지만 줄이고, 나머지는 스크롤로 봅니다.
 */
export default function Scaler({ width, height, children }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const w = el.clientWidth;
      const h = window.innerHeight - 120;
      const byHeight = Math.max(h / height, 0.8);
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
