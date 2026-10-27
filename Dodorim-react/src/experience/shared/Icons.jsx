// 체험 고르기 화면의 아이콘 (흰색으로 칠해지는 단색 아이콘)

// 키오스크: 모니터
export function MonitorIcon(props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect x="6" y="9" width="52" height="34" rx="5" fill="none" stroke="currentColor" strokeWidth="6" />
      <rect x="27" y="44" width="10" height="8" fill="currentColor" />
      <rect x="17" y="51" width="30" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

// 셀프 계산대: 바코드
export function BarcodeIcon(props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      {[
        [8, 5],
        [17, 3],
        [23, 6],
        [33, 3],
        [39, 5],
        [48, 3],
        [54, 4],
      ].map(([x, w]) => (
        <rect key={x} x={x} y="8" width={w} height="48" rx={w / 2} fill="currentColor" />
      ))}
    </svg>
  );
}

// 병원: 진료기록(십자) + 사람
export function HospitalIcon(props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect x="6" y="5" width="34" height="50" rx="5" fill="currentColor" />
      <path d="M20 12h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="var(--icon-bg)" />
      <rect x="12" y="34" width="20" height="4" rx="2" fill="var(--icon-bg)" />
      <rect x="12" y="42" width="14" height="4" rx="2" fill="var(--icon-bg)" />
      <circle cx="47" cy="34" r="8" fill="currentColor" stroke="var(--icon-bg)" strokeWidth="3" />
      <path d="M31 59c0-9 7-15 16-15s16 6 16 15z" fill="currentColor" stroke="var(--icon-bg)" strokeWidth="3" />
    </svg>
  );
}

// 공공시설(민원발급기): 관공서 건물
export function PublicIcon(props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path d="M32 5 58 18v5H6v-5z" fill="currentColor" />
      {[11, 21, 31, 41, 51].map((x) => (
        <rect key={x} x={x - 2.5} y="26" width="7" height="22" rx="1.5" fill="currentColor" />
      ))}
      <rect x="6" y="51" width="52" height="7" rx="2" fill="currentColor" />
    </svg>
  );
}

// 음식점/카페(테이블형 키오스크): 포크와 나이프
export function DiningIcon(props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path
        d="M14 6v16c0 4 2 7 5 8v28a3 3 0 0 0 6 0V30c3-1 5-4 5-8V6h-4v15h-2V6h-4v15h-2V6z"
        fill="currentColor"
      />
      <path d="M46 6c-6 2-9 10-9 20v8h6v24a3 3 0 0 0 6 0V6z" fill="currentColor" />
    </svg>
  );
}

// 종합병원: 큰 건물 + 십자
export function GeneralHospitalIcon(props) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <rect x="8" y="14" width="48" height="44" rx="4" fill="currentColor" />
      <rect x="22" y="4" width="20" height="16" rx="3" fill="currentColor" />
      <path d="M29 7h6v4h4v6h-4v4h-6v-4h-4v-6h4z" fill="var(--icon-bg, #fff)" />
      {[16, 28, 40].map((x) => (
        <rect key={x} x={x} y="26" width="8" height="8" rx="1.5" fill="var(--icon-bg, #fff)" />
      ))}
      {[16, 40].map((x) => (
        <rect key={x} x={x} y="38" width="8" height="8" rx="1.5" fill="var(--icon-bg, #fff)" />
      ))}
      <rect x="27" y="42" width="10" height="16" rx="1.5" fill="var(--icon-bg, #fff)" />
    </svg>
  );
}
