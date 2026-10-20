import UnitSelect from '../components/UnitSelect';
import usePage from '../usePage';
import '../styles/self_check.css';

export default function SelfCheck() {
  usePage('self_check', '두드림 - 셀프 계산대 연습');
  return (
    <UnitSelect
      main={['셀프 계산대']}
      stepIndicator="셀프 계산대 학습"
      title="어디에서 계산해볼까요?"
      subtitle="연습하고 싶은 장소 그림을 살짝 눌러주세요."
    />
  );
}
