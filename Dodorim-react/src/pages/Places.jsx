import { useSearchParams } from 'react-router-dom';
import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/hospital.css';

// 관리자가 새로 만든 중단원의 소단원 선택 화면 (/places?id=중단원ID). 모양은 병원 화면과 같음
export default function Places() {
  usePage('hospital', '두드림 - 장소 선택');
  const id = Number(useSearchParams()[0].get('id'));
  return (
    <PlaceSelect
      title="어디에서 연습해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
      containerClass="lecture-grid"
      mid={id}
    />
  );
}
