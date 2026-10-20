import UnitSelect from '../components/UnitSelect';
import usePage from '../usePage';
import '../styles/kiosk_edu.css';

export default function KioskEdu() {
  usePage('kiosk_edu', '두드림 - 키오스크 학습');
  return (
    <UnitSelect
      main={['키오스크']}
      variant="location"
      backClass="btn-back"
      stepIndicator="키오스크 학습"
      title="어디에서 사용해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
    />
  );
}
