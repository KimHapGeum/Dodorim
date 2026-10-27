import { useEffect, useLayoutEffect, useState } from 'react';
import { useGuideState } from './GuideContext';

/**
 * '알아보기' 모드: 기계의 각 부분을 차례로 동그라미 쳐서 설명합니다.
 * steps: [{ sel: 'data-tour 이름', title, text }]
 */
export default function TourOverlay({ steps, stageRef }) {
  const g = useGuideState();
  const [idx, setIdx] = useState(0);
  const [box, setBox] = useState(null);
  const step = steps[idx];
  const { setText, setTourNav } = g;

  useEffect(() => {
    setText(step.text);
    setTourNav({
      idx,
      total: steps.length,
      title: step.title,
      prev: () => setIdx((i) => Math.max(0, i - 1)),
      next: () => setIdx((i) => Math.min(steps.length - 1, i + 1)),
    });
  }, [idx, step, steps.length, setText, setTourNav]);

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const el = stage.querySelector(`[data-tour="${step.sel}"]`);
      if (!el) {
        setBox(null);
        return;
      }
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setBox({ left: r.left - s.left - 8, top: r.top - s.top - 8, width: r.width + 16, height: r.height + 16 });
    };
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [step, stageRef]);

  // 설명하는 부분이 화면 밖이면 보이도록 스크롤
  useEffect(() => {
    const stage = stageRef.current;
    const el = stage && stage.querySelector(`[data-tour="${step.sel}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [step, stageRef]);

  if (!box) return null;
  return (
    <div className="tour-layer" aria-hidden="true">
      <div className="tour-box" style={box}>
        <span className="tour-num">{idx + 1}</span>
        <span className="tour-label">{step.title}</span>
      </div>
    </div>
  );
}
