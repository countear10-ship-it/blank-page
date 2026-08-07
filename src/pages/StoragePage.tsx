import { AlertTriangle, ShieldAlert, Thermometer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Card, RiskBadge, RiskHistoryChart, SourceLine } from '../components/UI';
import { calculateStorageRisk, STORAGE_MICROBE_SOURCE, storageRiskSignals } from '../logic/storageRules';
import type { StorageInput } from '../types';

const seafoods: StorageInput['seafood'][] = ['고등어', '새우', '굴'];
const hoursOptions = [0, 3, 6, 12, 24];

export default function StoragePage() {
  const [input, setInput] = useState<StorageInput>({
    seafood: '고등어',
    mode: '냉장',
    temperature: 4,
    hours: 0,
    raw: false,
  });
  const result = calculateStorageRisk(input);
  const signals = storageRiskSignals(input);
  const update = <K extends keyof StorageInput>(key: K, value: StorageInput[K]) => {
    setInput((previous) => ({ ...previous, [key]: value }));
  };
  const points = hoursOptions.map((hours) => {
    const point = calculateStorageRisk({ ...input, hours });
    return { date: hours === 0 ? '현재' : String(hours) + 'h', value: point.score, level: point.level, label: point.label };
  });

  return (
    <div className="container page-stack storage-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">STORAGE RISK GUIDE</p>
          <h1>보관 상태 위험<br /><em>그래프 안내</em></h1>
          <p>시간·온도·보관 방식에 따른 위험 신호를 그래프로 확인하고, 주의할 수 있는 식중독 위험요인을 함께 살펴봅니다.</p>
        </div>
        <div className="simulator-badge">
          <ShieldAlert size={25} />
          <span>검사 결과가 아닌<br />보관 조건 안내</span>
        </div>
      </div>

      <div className="simulator-layout storage-graph-layout">
        <Card className="storage-chart-card">
          <div className="preview-head">
            <span>시간 경과별 보관 위험 지표</span>
          </div>
          <div className="storage-chart-score">
            <span>현재 입력</span>
            <strong>{result.score}<small>/100</small></strong>
            <RiskBadge level={result.level} compact />
          </div>
          <RiskHistoryChart title="시간별 보관 위험 변화" points={points} />
          <p className="storage-chart-caption">시간을 바꾸면 동일한 보관 조건에서 위험 신호가 어떻게 달라지는지 확인할 수 있습니다.</p>
        </Card>

        <Card className="simulator-form">
          <Field label="해산물 종류">
            <div className="chip-grid three">
              {seafoods.map((item) => (
                <button key={item} className={'choice-chip ' + (input.seafood === item ? 'active' : '')} onClick={() => update('seafood', item)}>
                  {item}
                </button>
              ))}
            </div>
          </Field>
          <Field label="보관 방식">
            <div className="segmented">
              <button className={input.mode === '실온' ? 'active' : ''} onClick={() => update('mode', '실온')}>실온</button>
              <button className={input.mode === '냉장' ? 'active' : ''} onClick={() => update('mode', '냉장')}>냉장</button>
              <button className={input.mode === '냉동' ? 'active' : ''} onClick={() => update('mode', '냉동')}>냉동</button>
            </div>
          </Field>
          <div className="storage-input-row">
            <label><Thermometer size={15} /> 보관 온도<input type="number" value={input.temperature} onChange={(event) => update('temperature', Number(event.target.value))} />℃</label>
            <label>섭취 방식<select value={input.raw ? '생식' : '가열'} onChange={(event) => update('raw', event.target.value === '생식')}><option>가열</option><option>생식</option></select></label>
          </div>
          <Field label="시간 경과" hint="그래프와 함께 바뀝니다">
            <input className="range-input" type="range" min="0" max="24" step="3" value={input.hours} onChange={(event) => update('hours', Number(event.target.value))} />
            <div className="range-labels">
              {hoursOptions.map((hours) => (
                <button key={hours} className={input.hours === hours ? 'active' : ''} onClick={() => update('hours', hours)}>
                  {hours === 0 ? '현재' : String(hours) + '시간'}
                </button>
              ))}
            </div>
          </Field>
        </Card>
      </div>

      <Card className="storage-result">
        <div className="card-topline">
          <div>
            <p className="eyebrow">INPUT-BASED GUIDANCE</p>
            <h2>보관 위험은 <RiskBadge level={result.level} compact /> <strong>{result.label}</strong></h2>
          </div>
          <span className="result-score">{result.score}<small>/100</small></span>
        </div>
        <div className="storage-result-grid">
          <div>
            <h3>주의할 수 있는 위험요인</h3>
            <ul className="storage-signal-list">
              {signals.map((signal) => (
                <li key={signal.title}>
                  <AlertTriangle size={16} aria-hidden="true" />
                  <span><strong>{signal.title}</strong>{signal.description}</span>
                </li>
              ))}
            </ul>
            <p className="recommendation"><strong>권장 행동</strong>{result.recommendation}</p>
          </div>
          <div className="storage-guidance">
            <h3>그래프를 읽는 법</h3>
            <ul>
              {result.factors.length ? result.factors.map((factor) => <li key={factor}>{factor}</li>) : <li>현재 입력에서는 큰 보관 위험 신호가 적습니다.</li>}
            </ul>
            <p>그래프가 높아질수록 입력한 보관 조건에서 확인해야 할 항목이 늘어납니다. 병원균의 실제 존재·종류·양은 검사로만 확인할 수 있습니다.</p>
          </div>
        </div>
        <SourceLine name={result.sourceName} url={result.sourceUrl} date="보관·운반 안내" />
        <SourceLine name={STORAGE_MICROBE_SOURCE.sourceName} url={STORAGE_MICROBE_SOURCE.sourceUrl} date="생식용 수산물 검사 항목 참고" />
      </Card>

      <div className="simulation-warning">
        <ShieldAlert size={18} />
        <div>
          <strong>보관 조건 안내입니다</strong>
          <p>이 그래프는 입력한 시간·온도·보관 방식에 따른 위험 신호를 보여줍니다. 병원균·바이러스·패류독소의 실제 존재 여부는 확인하지 못하며, 이상 냄새·포장 팽창·표시사항 위반이 있으면 섭취하지 마세요.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="form-field"><div className="field-label"><label>{label}</label>{hint && <span>{hint}</span>}</div>{children}</div>;
}
