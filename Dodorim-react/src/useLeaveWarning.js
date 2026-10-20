import { useEffect } from 'react';

// when이 true인 동안 탭 닫기·새로고침·다른 사이트로 이동하면 브라우저가 "나가시겠습니까?"를 물어봄
// (화면 안의 이동은 각 화면의 [취소] 버튼에서 따로 확인)
export default function useLeaveWarning(when) {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);
}
