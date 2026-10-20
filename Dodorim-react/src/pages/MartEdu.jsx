import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/mart_edu.css';

export default function MartEdu() {
  usePage('mart_edu', '두드림 - 대형매장 키오스크 연습');
  return (
    <PlaceSelect
      stepIndicator="대형매장 계산 연습"
      title="어디에서 연습해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
      containerClass="lecture-grid"
      backTo="/self_check"
      mid={['셀프 계산대', '대형 매장']}
    />
  );
}
