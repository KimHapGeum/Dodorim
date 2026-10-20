import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/atm.css';

export default function Atm() {
  usePage('atm', '두드림 - ATM 체험하기');
  return (
    <PlaceSelect
      stepIndicator="금융 서비스 연습"
      title="어떤 은행을 이용해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
      containerClass="topic-container"
      backTo="/device_edu"
      mid={['전자기기', 'ATM']}
    />
  );
}
