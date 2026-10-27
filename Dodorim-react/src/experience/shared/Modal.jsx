// 기계 화면 안에 뜨는 팝업창 (실제 키오스크의 팝업처럼 화면 위를 덮습니다)
export default function Modal({ children, className = '' }) {
  return (
    <div className="scr-modal">
      <div className={`scr-modal-box ${className}`}>{children}</div>
    </div>
  );
}
