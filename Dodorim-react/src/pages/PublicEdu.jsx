import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/public_edu.css';

export default function PublicEdu() {
  usePage('public_edu', '두드림 - 공공장소 키오스크 연습');
  return (
    <PlaceSelect
      title="공공장소 키오스크 연습하기!"
      subtitle="자주 방문하는 장소 그림을 살짝 눌러주세요."
      containerClass="lecture-grid"
      backTo="/kiosk_edu"
      delay={(i) => i * 0.1}
      mid={['키오스크', '공공시설']}
    />
  );
}
