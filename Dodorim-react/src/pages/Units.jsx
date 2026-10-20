import { useSearchParams } from 'react-router-dom';
import UnitSelect from '../components/UnitSelect';
import usePage from '../usePage';
import '../styles/self_check.css';

// 관리자가 새로 만든 대단원의 중단원 선택 화면 (/units?id=대단원ID). 모양은 셀프 계산대 화면과 같음
export default function Units() {
  usePage('self_check', '두드림 - 단원 선택');
  const id = Number(useSearchParams()[0].get('id'));
  return <UnitSelect main={id} title="무엇을 배워볼까요?" subtitle="배우고 싶은 그림을 살짝 눌러주세요." />;
}
