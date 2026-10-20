import PlaceSelect from '../components/PlaceSelect';
import usePage from '../usePage';
import '../styles/hospital.css';

export default function Hospital() {
  usePage('hospital', '두드림 - 병원 키오스크 연습');
  return (
    <PlaceSelect
      title="병원 키오스크 연습하기!"
      subtitle="연습하고 싶은 병원 환경 그림을 살짝 눌러주세요."
      containerClass="lecture-grid"
      backTo="/kiosk_edu"
      delay={(i) => i * 0.2}
      mid={['키오스크', '병원']}
    />
  );
}
