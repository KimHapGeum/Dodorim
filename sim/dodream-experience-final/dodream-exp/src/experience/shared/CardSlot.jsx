/**
 * 기계 몸체에 붙은 "카드 투입구".
 * - dir="down": 카드가 위에서 아래 투입구로 들어가요 (키오스크·민원발급기)
 * - dir="up"  : 카드가 아래에서 위 투입구로 들어가요 (테이블 리더기·카드 단말기)
 */
export default function CardSlot({
  st,
  onClick,
  highlight = false,
  label = '카드 투입구',
  dir = 'down',
  className = '',
  tour = 'card',
}) {
  const visible = st === 'ready' || st === 'processing' || st === 'remove';
  const inserted = st === 'processing' || st === 'remove';
  const clickable = st === 'ready' || st === 'remove';
  return (
    <div className={`hw-card hw-card-${dir} ${className}`} data-tour={tour}>
      <div className="hw-card-area">
        {visible && (
          <button
            className={`v-card ${inserted ? 'in' : 'out'}${clickable && highlight ? ' hl' : ''}`}
            onClick={clickable ? onClick : undefined}
            aria-label={st === 'ready' ? '카드 꽂기' : '카드 빼기'}
          >
            <span className="v-card-chip" />
            <span className="v-card-name">두드림카드</span>
          </button>
        )}
        {st === 'ready' && <span className="hw-tip">👆 눌러서 카드 꽂기</span>}
        {st === 'remove' && <span className="hw-tip">👆 눌러서 카드 빼기</span>}
      </div>
      <div className={`hw-card-slot${st === 'processing' ? ' busy' : ''}`} />
      {label && <div className="hw-label">{label}</div>}
    </div>
  );
}
