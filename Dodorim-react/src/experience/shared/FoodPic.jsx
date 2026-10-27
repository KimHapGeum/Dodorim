import { useState } from 'react';

/**
 * 메뉴 사진 자리
 * - 실제 사진 파일이 있으면 사진을 보여주고, 없으면 접시 위 그림을 보여줘요.
 * - 사진은 public/images/menu/ 폴더에 "photo 이름.jpg" 로 넣으면 자동으로 나와요.
 *   예) public/images/menu/kiosk-b1.jpg  → 키오스크의 불고기버거
 *   어떤 이름으로 넣어야 하는지는 README.md 의 '메뉴 사진 넣기' 표를 보세요.
 * - 사진을 쓰지 않으려면 PHOTO_BASE 를 null 로 바꾸면 돼요.
 */
export let PHOTO_BASE = '/images/menu/';
export const PHOTO_EXT = '.jpg';
export function setPhotoBase(base) {
  PHOTO_BASE = base;
}

export default function FoodPic({ emoji, bg = '#f1e3cf', size = 52, className = '', photo }) {
  const [state, setState] = useState('loading'); // loading | ok | none
  const src = PHOTO_BASE && photo ? `${PHOTO_BASE}${photo}${PHOTO_EXT}` : null;
  return (
    <span className={`fp ${className}`} style={{ '--fp-bg': bg }}>
      {state !== 'ok' && (
        <>
          <span className="fp-plate" />
          <span className="fp-emoji" style={{ fontSize: size }}>
            {emoji}
          </span>
        </>
      )}
      {src && state !== 'none' && (
        <img
          className={`fp-photo${state === 'ok' ? ' on' : ''}`}
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setState('ok')}
          onError={() => setState('none')}
        />
      )}
    </span>
  );
}

// 메뉴 사진 위 작은 표시 (인기, 신메뉴, 매움 ...)
export function Tags({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <span className="tags">
      {tags.map((t) => (
        <span key={t} className={`tag tag-${TAG_COLOR[t] || 'gray'}`}>
          {t}
        </span>
      ))}
    </span>
  );
}

const TAG_COLOR = {
  인기: 'orange',
  BEST: 'orange',
  신메뉴: 'green',
  NEW: 'green',
  매움: 'red',
  추천: 'blue',
  한정: 'purple',
};
