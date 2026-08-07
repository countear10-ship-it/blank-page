import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ClipboardCheck, Copy, RotateCcw, Share2 } from "lucide-react";
import regions from "../data/regions.json";
import { Card, RiskBars, SourceLine } from "../components/UI";
import DataStatusBanner from "../components/DataStatusBanner";
import OfficialAnalysisNotice from "../components/OfficialAnalysisNotice";
import { fetchRealtimeSnapshot } from "../services/api";
import { evaluateDecision } from "../logic/decisionEngine";
import type { RealtimeSnapshot } from "../services/types";
import type {
  DecisionInput,
  DecisionResult,
  PersonalCondition,
  Region,
  Seafood,
  StorageMode,
} from "../types";

const typedRegions = regions as Region[];
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
const progressLabels = ["해산물", "지역", "섭취 방식", "주의조건", "판정 결과"];

export default function DecisionPage() {
  const [input, setInput] = useState<DecisionInput>({
    seafood: "굴",
    regionId: "gijang",
    raw: true,
    storageMode: "냉장",
    storageHours: 6,
    temperature: 4,
    conditions: [],
  });
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
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
  const region = useMemo(
    () =>
      typedRegions.find((item) => item.id === input.regionId) ??
      typedRegions[0],
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
        <Field label="보관 상태" hint="판정에도 함께 반영">
          <div className="storage-mini-grid">
            <label>
              방식
              <select
                value={input.storageMode}
                onChange={(event) =>
                  update("storageMode", event.target.value as StorageMode)
                }
              >
                <option>실온</option>
                <option>냉장</option>
                <option>냉동</option>
              </select>
            </label>
            <label>
              시간
              <select
                value={input.storageHours}
                onChange={(event) =>
                  update("storageHours", Number(event.target.value))
                }
              >
                {[1, 3, 6, 12, 24, 48].map((hours) => (
                  <option key={hours} value={hours}>
                    {hours}시간
                  </option>
                ))}
              </select>
            </label>
            <label>
              온도
              <input
                type="number"
                value={input.temperature}
                onChange={(event) =>
                  update("temperature", Number(event.target.value))
                }
                aria-label="보관 온도"
              />
              <small>℃</small>
            </label>
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
          <strong>{region.name}</strong>
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
          region={region}
          snapshot={snapshot}
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
  region,
  snapshot,
  onReset,
}: {
  result: DecisionResult;
  input: DecisionInput;
  region: Region;
  snapshot: RealtimeSnapshot | null;
  onReset: () => void;
}) {
  const [shared, setShared] = useState(false);
  const canShare =
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    typeof (navigator as Navigator & { share?: unknown }).share === "function";
  const shareText = `안심海 판정: ${result.headline}\n해산물 ${input.seafood} · 지역 ${region.name}\n${result.actions[0]}`;
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
        personal={result.personalRisk}
        storage={result.storageRisk}
      />
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
