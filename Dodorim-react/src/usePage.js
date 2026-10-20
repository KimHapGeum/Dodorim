import { useEffect } from 'react';

// 원본의 페이지별 <body> 스타일을 살리기 위해 body에 페이지 클래스를 붙입니다.
export default function usePage(name, title) {
  useEffect(() => {
    document.body.className = `page-${name}`;
    document.title = title;
    window.scrollTo(0, 0);
  }, [name, title]);
}
