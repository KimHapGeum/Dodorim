import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/phone.css';

export default function Phone() {
  usePage('phone', '두드림 - 휴대폰 배우기');
  return (
    <PlaceSelect
      stepIndicator="휴대폰 기능 교육"
      title="무엇을 배워볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
      containerClass="lecture-grid"
      backTo="/device_edu"
      mid={['전자기기', '휴대폰']}
    />
  );
}
