import { useEffect, useRef, useSyncExternalStore } from 'react';

/*
 * 브라우저 기본 alert/confirm 대신 쓰는 큰 글씨 팝업 (시니어가 읽기 쉽게).
 * alert(msg) → Promise<void>, confirm(msg) → Promise<boolean>. 여러 개가 오면 차례로 보여 줌
 * App에 <DialogHost />를 한 번 두면 페이지를 옮겨도 팝업이 유지됩니다.
 */
let queue = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const open = (message, cancel) => new Promise((resolve) => {
  queue = [...queue, { message: String(message), cancel, resolve }];
  emit();
});
export const alert = (message) => open(message, false);
export const confirm = (message) => open(message, true);

function close(ok) {
  const [first, ...rest] = queue;
  queue = rest;
  emit();
  first.resolve(ok);
}

export function DialogHost() {
  const current = useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => queue[0]);
  const okRef = useRef(null);
  const cancelRef = useRef(null);
  useEffect(() => { okRef.current?.focus(); }, [current]);
  if (!current) return null;

  const onKeyDown = (e) => {
    e.stopPropagation(); // 뒤 화면의 ESC 처리(건의하기 팝업 닫기 등)가 같이 동작하지 않도록
    if (e.key === 'Escape') close(!current.cancel);
    if (e.key === 'Tab') { // 포커스를 팝업 버튼 안에서만 돌게
      e.preventDefault();
      (document.activeElement === okRef.current && cancelRef.current ? cancelRef : okRef).current.focus();
    }
  };

  return (
    <div className="dd-dialog-overlay" onKeyDown={onKeyDown}>
      <div className="dd-dialog" role={current.cancel ? 'dialog' : 'alertdialog'} aria-modal="true" aria-describedby="dd-dialog-message">
        <p id="dd-dialog-message" className="dd-dialog-message">{current.message}</p>
        <div className="dd-dialog-buttons">
          {current.cancel && <button ref={cancelRef} type="button" className="dd-dialog-btn cancel" onClick={() => close(false)}>취소</button>}
          <button ref={okRef} type="button" className="dd-dialog-btn ok" onClick={() => close(true)}>확인</button>
        </div>
      </div>
    </div>
  );
}
