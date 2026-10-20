// 누를 수 있는 div를 버튼처럼: Tab으로 이동, Enter/Space로 누르기, 화면낭독기에 "버튼"으로 읽힘
export const clickable = (onClick) => ({
  role: 'button',
  tabIndex: 0,
  onClick,
  onKeyDown: (e) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return; // 안쪽 버튼의 키 입력은 그대로
    e.preventDefault();
    onClick(e);
  },
});
