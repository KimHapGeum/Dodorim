import { tap } from './utils';

// 숫자 입력 키패드 (민원발급기 주민번호, 셀프계산대 전화번호 등)
export default function Keypad({ onKey, onDelete, onClear, highlight = false, className = '' }) {
  const press = (fn) => () => {
    tap();
    fn();
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (
    <div className={`kp ${className}`}>
      {keys.map((k) => (
        <button key={k} className={`kp-key${highlight ? ' hl-soft' : ''}`} onClick={press(() => onKey(k))}>
          {k}
        </button>
      ))}
      <button className="kp-key kp-fn" onClick={press(onClear)}>
        전체삭제
      </button>
      <button className={`kp-key${highlight ? ' hl-soft' : ''}`} onClick={press(() => onKey('0'))}>
        0
      </button>
      <button className="kp-key kp-fn" onClick={press(onDelete)}>
        ← 정정
      </button>
    </div>
  );
}
