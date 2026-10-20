import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/self_store_edu.css';

export default function SelfStoreEdu() {
  usePage('self_store_edu', '두드림 - 무인매장 키오스크 연습');
  return (
    <PlaceSelect
      stepIndicator="무인매장 계산 연습"
      title="어디에서 연습해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
      containerClass="lecture-grid"
      backTo="/self_check"
      mid={['셀프 계산대', '무인 매장']}
    />
  );
}
