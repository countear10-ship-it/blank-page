import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ClipboardCheck, Copy, RotateCcw, Share2 } from "lucide-react";
import regions from "../data/regions.json";
import { Card, RiskBars, SourceLine } from "../components/UI";
import DataStatusBanner from "../components/DataStatusBanner";
import OfficialAnalysisNotice from "../components/OfficialAnalysisNotice";
import { fetchRealtimeSnapshot, fetchRegionWeather } from "../services/api";
import { countPersonalRiskConditions, evaluateDecision } from "../logic/decisionEngine";
import { assessWeatherEnvironment } from "../logic/weatherEnvironment";
import type { ApiResponse, RealtimeSnapshot, WeatherObservation } from "../services/types";
import type {
  DecisionInput,
  DecisionResult,
  ConsumerStorageSituation,
  PackageCondition,
  PersonalCondition,
  Region,
  Seafood,
} from "../types";

const typedRegions = regions as Region[];
const additionalRegionOptions = [
  { id: "unknown", name: "잘 모르겠음" },
  { id: "imported", name: "수입산" },
] as const;
const evidenceSources = [
  { name: "FDA 수산물 보관 기준", url: "https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely" },
  { name: "CDC 고위험군 식품안전", url: "https://www.cdc.gov/food-safety/risk-factors/index.html" },
] as const;
const seafoodOptions: Seafood[] = [
  "굴",
  "홍합",
  "새우",
  "고등어",
  "광어",
  "오징어",
];
const conditions: PersonalCondition[] = [
  "알레르기",
  "임신",
  "고령자",
  "면역저하",
  "간질환",
  "주의조건 없음",
];
const storageSituations: Array<{ value: ConsumerStorageSituation; title: string; description: string }> = [
  { value: "차갑게 유지", title: "구입 후 바로 냉장·냉동", description: "집에 와서 바로 차갑게 보관했어요" },
  { value: "보냉 이동", title: "아이스팩·보냉 가방으로 이동", description: "이동 중에도 차가운 상태였어요" },
  { value: "실온 방치", title: "실온에 2시간 이상 있었어요", description: "차갑게 유지하지 못했어요" },
  { value: "확인 어려움", title: "어떻게 보관됐는지 모르겠어요", description: "보관 경로를 확인하기 어려워요" },
];
const packageConditions: Array<{ value: PackageCondition; title: string; description: string }> = [
  { value: "이상 없음", title: "포장·냄새 이상 없음", description: "누수·팽창·이상 냄새가 없어요" },
  { value: "이상 있음", title: "포장 또는 냄새가 이상해요", description: "팽창·누수·이상 냄새가 있어요" },
  { value: "확인 어려움", title: "확인하기 어려워요", description: "상태를 잘 모르겠어요" },
];
const progressLabels = ["해산물", "지역", "섭취 방식", "주의조건", "판정 결과"];

export default function DecisionPage() {
  const [input, setInput] = useState<DecisionInput>({
    seafood: "굴",
    regionId: "gijang",
    raw: true,
    storageSituation: "차갑게 유지",
    packageCondition: "이상 없음",
    conditions: [],
  });
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [weather, setWeather] = useState<ApiResponse<WeatherObservation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const update = <K extends keyof DecisionInput>(
    key: K,
    value: DecisionInput[K],
  ) => setInput((prev) => ({ ...prev, [key]: value }));
  const toggleCondition = (condition: PersonalCondition) =>
    setInput((prev) => ({
      ...prev,
      conditions:
        condition === "주의조건 없음"
          ? ["주의조건 없음"]
          : prev.conditions.includes(condition)
            ? prev.conditions.filter((item) => item !== condition)
            : [
                ...prev.conditions.filter((item) => item !== "주의조건 없음"),
                condition,
              ],
    }));
  const regionName = useMemo(
    () =>
      typedRegions.find((item) => item.id === input.regionId)?.name ??
      additionalRegionOptions.find((item) => item.id === input.regionId)?.name ??
      "잘 모르겠음",
    [input.regionId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchRealtimeSnapshot(input.seafood)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [input.seafood]);
  useEffect(() => {
    const region = typedRegions.find((item) => item.id === input.regionId);
    if (!region) {
      setWeather(null);
      return;
    }
    let active = true;
    setWeather(null);
    fetchRegionWeather(region.latitude, region.longitude).then((response) => {
      if (active) setWeather(response);
    });
    return () => { active = false; };
  }, [input.regionId]);
  const status = loading
    ? "loading"
    : snapshot?.marine.status === "success" && !snapshot.marine.stale
      ? snapshot.recalls.analysis
        ? "assisted"
        : "latest"
      : snapshot?.marine.status === "error"
        ? "error"
        : "unavailable";
  const decide = () => {
    if (!snapshot) return;
    setResult(
      evaluateDecision(
        input,
        typedRegions,
        new Date().toISOString().slice(0, 10),
        snapshot,
      ),
    );
  };

  return (
    <div className="container page-stack decision-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">PERSONAL CHECK</p>
          <h1>
            오늘 이 해산물,
            <br />
            <em>먹어도 될까?</em>
          </h1>
          <p>
            해산물·지역·생식 여부·보관 상태·개인 조건을 조합해 공식 데이터
            기준의 행동을 안내합니다. 입력 내용은 브라우저에서만 처리합니다.
          </p>
        </div>
        <DataStatusBanner
          state={status}
          message={snapshot?.recalls.analysis ? "실시간 API 지연 시 최신 공식 원문을 보조 분석해 함께 반영합니다." : "실시간 데이터가 없으면 결과를 ‘판단할 정보 부족’으로 보류합니다."}
        />
      </div>
      <div className="decision-progress" aria-label="맞춤 판정 진행 단계">
        {progressLabels.map((label, index) => (
          <span
            key={label}
            className={result ? "done" : index === 0 ? "current" : ""}
            aria-current={!result && index === 0 ? "step" : undefined}
          >
            <b>{String(index + 1).padStart(2, "0")}</b>
            {label}
          </span>
        ))}
      </div>
      <Card className="decision-form-card">
        <div className="step-title">
          <span className="step-number">01</span>
          <div>
            <h2>간단한 5가지 확인</h2>
            <p>
              숫자 하나로 안전을 단정하지 않고 지역·개인·보관 위험을 따로
              보여줍니다.
            </p>
          </div>
        </div>
        <Field label="해산물 종류" hint="초기 6종">
          <div className="chip-grid">
            {seafoodOptions.map((item) => (
              <button
                key={item}
                type="button"
                className={`choice-chip ${input.seafood === item ? "active" : ""}`}
                onClick={() => update("seafood", item)}
                aria-pressed={input.seafood === item}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>
        <Field label="구입 또는 채취 지역">
          <select
            value={input.regionId}
            onChange={(event) => update("regionId", event.target.value)}
          >
            {typedRegions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <optgroup label="지역을 모를 때">
              {additionalRegionOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="섭취 방법">
          <div className="segmented">
            <button
              type="button"
              className={!input.raw ? "active" : ""}
              onClick={() => update("raw", false)}
              aria-pressed={!input.raw}
            >
              가열
            </button>
            <button
              type="button"
              className={input.raw ? "active" : ""}
              onClick={() => update("raw", true)}
              aria-pressed={input.raw}
            >
              생식
            </button>
          </div>
        </Field>
        <Field label="구입 후 보관 상황" hint="숫자를 몰라도 선택할 수 있어요">
          <div className="consumer-choice-grid">
            {storageSituations.map((situation) => (
              <button
                type="button"
                key={situation.value}
                className={'consumer-choice ' + (input.storageSituation === situation.value ? 'active' : '')}
                onClick={() => update('storageSituation', situation.value)}
                aria-pressed={input.storageSituation === situation.value}
              >
                <strong>{situation.title}</strong>
                <small>{situation.description}</small>
              </button>
            ))}
          </div>
        </Field>
        <Field label="포장·냄새 확인" hint="직접 확인한 상태를 선택하세요">
          <div className="consumer-choice-grid package-choice-grid">
            {packageConditions.map((condition) => (
              <button
                type="button"
                key={condition.value}
                className={'consumer-choice ' + (input.packageCondition === condition.value ? 'active' : '')}
                onClick={() => update('packageCondition', condition.value)}
                aria-pressed={input.packageCondition === condition.value}
              >
                <strong>{condition.title}</strong>
                <small>{condition.description}</small>
              </button>
            ))}
          </div>
        </Field>
        <Field label="개인 주의조건" hint="복수 선택 가능">
          <div className="condition-grid">
            {conditions.map((condition) => (
              <button
                type="button"
                key={condition}
                className={`condition-chip ${input.conditions.includes(condition) ? "active" : ""}`}
                onClick={() => toggleCondition(condition)}
                aria-pressed={input.conditions.includes(condition)}
              >
                {input.conditions.includes(condition) && <Check size={15} />}
                {condition}
              </button>
            ))}
          </div>
        </Field>
        <div className="form-preview">
          <span>선택 지역</span>
          <strong>{regionName}</strong>
          <span>보관</span>
          <strong>{input.storageSituation}</strong>
          <span>제품 상태</span>
          <strong>{input.packageCondition}</strong>
          <DataStatusBanner state={status} compact />
          <span className="preview-muted">{snapshot?.recalls.analysis ? "최신 공식 원문 보조 분석 반영" : "공식 응답 후 갱신"}</span>
        </div>
        <button
          className="primary-button full"
          onClick={decide}
          disabled={loading}
        >
          {loading ? "공식 데이터 확인 중…" : "지금 판정하기"}{" "}
          <ClipboardCheck size={18} />
        </button>
      </Card>
      {result && (
        <DecisionResultCard
          result={result}
          input={input}
          regionName={regionName}
          snapshot={snapshot}
          weather={weather}
          onReset={() => setResult(null)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <div className="field-label">
        <label>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function DecisionResultCard({
  result,
  input,
  regionName,
  snapshot,
  weather,
  onReset,
}: {
  result: DecisionResult;
  input: DecisionInput;
  regionName: string;
  snapshot: RealtimeSnapshot | null;
  weather: ApiResponse<WeatherObservation> | null;
  onReset: () => void;
}) {
  const weatherEnvironment = assessWeatherEnvironment(weather?.data);
  const [shared, setShared] = useState(false);
  const canShare =
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof (navigator as Navigator & { share?: unknown }).share === "function";
  const shareText = `안심海 판정: ${result.headline}\n해산물 ${input.seafood} · 지역 ${regionName}\n${result.actions[0]}`;
  const share = async () => {
    if (canShare)
      await navigator.share({
        title: "안심海 맞춤 판정",
        text: `${shareText}\n${location.href}`,
      });
    else {
      await navigator.clipboard?.writeText(`${shareText}\n${location.href}`);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    }
  };
  const tone =
    result.level === "가능"
      ? "safe"
      : result.level === "섭취 피하기"
        ? "danger"
        : result.level === "정보 부족"
          ? "unknown"
          : "caution";
  return (
    <Card className={`decision-result result-${tone}`}>
      <div className="result-topline">
        <span className="result-kicker">현재 확인된 공식 데이터 기준</span>
        <DataStatusBanner
          state={
            result.level === "정보 부족" ? "unavailable" : snapshot?.recalls.analysis ? "assisted" : "manual-confirm"
          }
          compact
        />
      </div>
      <div className="result-headline">
        <span className="result-icon" aria-hidden="true">
          {tone === "safe"
            ? "✓"
            : tone === "danger"
              ? "!"
              : tone === "unknown"
                ? "i"
                : "△"}
        </span>
        <div>
          <p>최종 행동 판정</p>
          <h2>{result.headline}</h2>
        </div>
      </div>
      <RiskBars
        region={result.regionRisk}
        environment={input.regionId === "unknown" || input.regionId === "imported" ? undefined : weatherEnvironment.level}
        environmentNote={weather?.data ? `${weather.data.temperature}℃ · 습도 ${weather.data.relativeHumidity}%` : "날씨 확인 전"}
        personal={result.personalRisk}
        storage={result.storageRisk}
        personalConditionCount={countPersonalRiskConditions(input.conditions)}
        regionApplicable={input.regionId !== "unknown" && input.regionId !== "imported"}
      />
      <div className="evidence-formula-card">
        <strong>근거 기반 판정 공식</strong>
        <p>최종 행동 = 공식 경고 · 보관 기준 위반 · 개인 고위험군의 생식 · 정보 확인 수준 중 가장 강한 단계</p>
        <small>조건별 점수를 합산하지 않습니다. 알레르기·공식 회수·실온 2시간 이상은 다른 조건보다 먼저 적용합니다.</small>
        <div>{evidenceSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>)}</div>
      </div>
      {input.regionId !== "unknown" && input.regionId !== "imported" && (
        <div className="weather-formula-card">
          <strong>구매·이동 환경 공식</strong>
          <p>{weatherEnvironment.headline} · {weatherEnvironment.formula}</p>
          <small>기온 단계: 25℃ 이상 1, 30℃ 이상 2 · 습도 단계: 70% 이상 1, 80% 이상 2. 합계 1~2는 보냉 확인, 3 이상은 강한 보냉 주의입니다.</small>
          <p>{weatherEnvironment.guidance}</p>
          <a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">현재 날씨 출처: Open-Meteo</a>
          <small>날씨·습도는 해역 오염이나 섭취 안전을 판정하지 않으며, 구매 뒤 보냉·이동 관리 안내에만 사용합니다.</small>
        </div>
      )}
      {input.regionId !== "unknown" && input.regionId !== "imported" && result.regionRisk === "unknown" && snapshot && (
        <div className="official-fallback-card">
          <strong>해양 관측값이 없을 때 함께 확인한 공식 근거</strong>
          <p>패류독소 속보와 회수·판매중지 정보는 확인했지만, 지역 해양환경 자체를 판단하는 자료는 아닙니다.</p>
          <div>
            <a href={snapshot.shellfish.source.url} target="_blank" rel="noreferrer">{snapshot.shellfish.source.name}</a>
            <a href={snapshot.recalls.source.url} target="_blank" rel="noreferrer">{snapshot.recalls.source.name}</a>
          </div>
        </div>
      )}
      <OfficialAnalysisNotice analysis={snapshot?.recalls.analysis} />
      <div className="reason-columns">
        <div>
          <h3>판정 이유</h3>
          <ul>
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>권장 행동</h3>
          <ul>
            {result.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </div>
      <SourceLine
        name={result.sourceName}
        url={result.sourceUrl}
        date={result.referenceDate}
      />
      <div className="result-actions">
        <button className="secondary-button" onClick={share}>
          {shared ? (
            <Check size={16} />
          ) : canShare ? (
            <Share2 size={16} />
          ) : (
            <Copy size={16} />
          )}
          {shared ? "복사됨" : canShare ? "결과 공유" : "결과 복사"}
        </button>
        <button className="ghost-button" onClick={onReset}>
          <RotateCcw size={16} /> 다시 입력
        </button>
      </div>
      <p className="medical-note">
        의료 진단이 아닌 안전정보 지원 서비스입니다. 증상이나 알레르기 반응이
        있으면 의료기관 안내를 받으세요.
      </p>
    </Card>
  );
}
