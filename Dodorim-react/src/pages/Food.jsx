import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/food.css';

export default function Food() {
  usePage('food', '두드림 - 음식점/카페 선택');
  return (
    <PlaceSelect
      title="어디에서 주문해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
      containerClass="topic-container"
      backTo="/kiosk_edu"
      submitLabel="완료"
      mid={['키오스크', '음식점/카페']}
    />
  );
}
