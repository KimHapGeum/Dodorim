import { useState } from 'react';

const PER_PAGE = 3;

/*
 * 단원 선택 카드 묶음: 한 번에 3개씩 보여주고, 넘치면 좌우 화살표로 넘김 (select_grid.css).
 * className: 기존 화면의 카드 묶음 클래스(lecture-grid 등). render(item, index) → 카드
 */
export default function PagedGrid({ className, id, items, render, loaded }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(items.length / PER_PAGE);
  const current = Math.min(page, Math.max(0, pages - 1));
  const shown = items.slice(current * PER_PAGE, current * PER_PAGE + PER_PAGE);
  const cols = Math.min(PER_PAGE, Math.max(1, items.length));

  const arrow = (dir) => pages > 1 && (
    <button
      type="button"
      className={`select-arrow ${dir < 0 ? 'prev' : 'next'}`}
      style={{ visibility: (dir < 0 ? current > 0 : current < pages - 1) ? 'visible' : 'hidden' }}
      onClick={() => setPage(current + dir)}
      aria-label={dir < 0 ? '이전 단원 보기' : '다음 단원 보기'}
    >
      <i className={`fa-solid fa-chevron-${dir < 0 ? 'left' : 'right'}`}></i>
    </button>
  );

  return (
    <div className="select-pager">
      <div className="select-row">
        {arrow(-1)}
        {/* 카드 1장 = 2칸. 마지막 쪽에 카드가 모자라면 첫 카드를 밀어 가운데 정렬 */}
        <div className={`${className} select-grid`} id={id} style={{ '--cols': cols, '--offset': cols - shown.length + 1 }}>
          {loaded && items.length === 0 && <p className="select-empty">아직 등록된 단원이 없습니다.</p>}
          {shown.map((item, i) => render(item, i))}
        </div>
        {arrow(1)}
      </div>
      {pages > 1 && <div className="select-page">{current + 1} / {pages}</div>}
    </div>
  );
}
