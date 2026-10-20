import UnitSelect from '../components/UnitSelect';
import usePage from '../usePage';
import '../styles/device_edu.css';

export default function DeviceEdu() {
  usePage('device_edu', '두드림 - 전자기기 학습');
  return (
    <UnitSelect
      main={['전자기기']}
      stepIndicator="전자기기 학습"
      title="어떤 기기를 배워볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
    />
  );
}
