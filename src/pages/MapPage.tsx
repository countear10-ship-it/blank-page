import { useEffect, useMemo, useState } from "react";
import { CircleAlert, ExternalLink, MapPinned } from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import regions from "../data/regions.json";
import { Card, RiskBadge, SourceLine } from "../components/UI";
import DataStatusBanner from "../components/DataStatusBanner";
import { fetchRealtimeSnapshot } from "../services/api";
import {
  assessRegion,
  latestMarineRecord,
  viewState,
  type RegionRiskAssessment,
} from "../services/riskEngine";
import type { Region, RiskLevel } from "../types";
import type { RealtimeSnapshot } from "../services/types";

const typedRegions = regions as Region[];
const mapCenter: [number, number] = [35.14, 129.08];
const markerColors: Record<RiskLevel, string> = {
  safe: "#16845b",
  caution: "#d89a19",
  danger: "#c84643",
  unknown: "#8491a3",
};

export default function MapPage() {
  const [selectedId, setSelectedId] = useState("gijang");
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetchRealtimeSnapshot("해산물")
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const assessments = useMemo(
    () =>
      new Map(
        typedRegions.map((region) => [
          region.id,
          snapshot ? assessRegion(region, snapshot) : loadingAssessment(),
        ]),
      ),
    [snapshot],
  );
  const selected = useMemo(
    () =>
      typedRegions.find((region) => region.id === selectedId) ??
      typedRegions[0],
    [selectedId],
  );
  const selectedAssessment =
    assessments.get(selected.id) ?? loadingAssessment();
  const globalState = loading
    ? "loading"
    : snapshot
      ? snapshot.shellfish.status === "success" &&
        snapshot.recalls.status === "success" &&
        snapshot.marine.status === "success" &&
        !snapshot.marine.stale
        ? "latest"
        : viewState(snapshot.marine)
      : "error";
  const latestMarine = latestMarineRecord(snapshot?.marine.data);
  const marine = selectedAssessment.marine ?? latestMarine;
  const usingLatestFallback =
    !selectedAssessment.marine && Boolean(latestMarine);

  return (
    <div className="container page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">BUSAN COAST WATCH</p>
          <h1>부산 해산물 위험지도</h1>
          <p>
            부산 연안의 공식 패류독소 속보·회수정보·해양환경 응답을 분리해
            확인합니다. 데이터가 없으면 안전으로 표시하지 않습니다.
          </p>
        </div>
        <DataStatusBanner
          state={globalState}
          message={
            snapshot
              ? "관측 시각·수집 시각과 원문 링크를 함께 확인하세요."
              : undefined
          }
        />
      </div>
      <div className="map-notice">
        <CircleAlert size={18} />
        <span>
          <strong>지도 색상은 종합 안전점수가 아닙니다.</strong> 공식
          회수·채취금지 연결은 빨간색, 주의 원문 확인은 노란색, 모든 필수 응답이
          확인된 경우에만 초록색으로 표시합니다.
        </span>
      </div>
      <section className="map-layout">
        <Card className="map-card">
          <div className="map-toolbar">
            <div>
              <p className="eyebrow">DATA LAYERS</p>
              <strong>부산 연안 확인 범위</strong>
            </div>
            <div
              className="map-layers"
              role="tablist"
              aria-label="지도 데이터 레이어"
            >
              <button className="active" role="tab" aria-selected="true">
                해양환경
              </button>
              <button role="tab" aria-selected="false">
                회수정보
              </button>
              <button role="tab" aria-selected="false">
                패류독소
              </button>
              <button role="tab" aria-selected="false">
                확인 불가
              </button>
            </div>
          </div>
          <MapContainer
            center={mapCenter}
            zoom={11}
            scrollWheelZoom={false}
            className="leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {typedRegions.map((region) => {
              const assessment =
                assessments.get(region.id) ?? loadingAssessment();
              const selectedMarker = region.id === selected.id;
              return (
                <CircleMarker
                  key={region.id}
                  center={[region.latitude, region.longitude]}
                  radius={selectedMarker ? 12 : 10}
                  pathOptions={{
                    color: selectedMarker ? "#35C7C2" : "#fff",
                    weight: selectedMarker ? 4 : 3,
                    fillColor: markerColors[assessment.level],
                    fillOpacity: 0.92,
                  }}
                  eventHandlers={{ click: () => setSelectedId(region.id) }}
                >
                  <Popup>
                    <strong>{region.name}</strong>
                    <br />
                    {assessment.summary}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
          <div className="map-legend">
            <span>
              <i className="legend-dot safe" /> 현재 확인된 공식 데이터에서 즉시
              확인되는 위험정보 없음
            </span>
            <span>
              <i className="legend-dot caution" /> 주의 필요
            </span>
            <span>
              <i className="legend-dot danger" /> 채취·섭취 주의
            </span>
            <span>
              <i className="legend-dot unknown" /> 최신 데이터 없음
            </span>
          </div>
        </Card>
        <aside className="region-list">
          <div className="list-heading">
            <strong>지원 지역</strong>
            <span>{typedRegions.length}곳</span>
          </div>
          {typedRegions.map((region) => {
            const assessment =
              assessments.get(region.id) ?? loadingAssessment();
            return (
              <button
                key={region.id}
                className={`region-list-item ${region.id === selected.id ? "selected" : ""}`}
                onClick={() => setSelectedId(region.id)}
                aria-pressed={region.id === selected.id}
              >
                <span className={`region-pin pin-${assessment.level}`} />
                <span className="region-list-copy">
                  <strong>{region.name}</strong>
                  <small>
                    {assessment.state === "loading"
                      ? "확인 중"
                      : assessment.summary}
                  </small>
                </span>
                <RiskBadge level={assessment.level} compact />
              </button>
            );
          })}
        </aside>
      </section>
      <Card className="selected-region">
        <div className="card-topline">
          <div className="selected-title">
            <MapPinned size={19} />
            <h2>{selected.name}</h2>
          </div>
          <RiskBadge level={selectedAssessment.level} />
          <DataStatusBanner state={selectedAssessment.state} compact />
        </div>
        <p className="lead-copy">{selectedAssessment.summary}</p>
        {usingLatestFallback && (
          <p className="lead-copy">
            아래 값은 선택 지역 수치가 아니라, 공식 API에서 가장 최근에 수집한 관측값입니다.
          </p>
        )}
        <div className="detail-grid">
          <Detail label="관측소" value={marine?.station ?? "관측소 확인 전"} />
          <Detail
            label="수온"
            value={
              marine?.waterTemperature !== undefined
                ? `${marine.waterTemperature}℃`
                : "확인 불가"
            }
          />
          <Detail
            label="염분"
            value={
              marine?.salinity !== undefined
                ? `${marine.salinity}`
                : "확인 불가"
            }
          />
          <Detail
            label="용존산소"
            value={
              marine?.dissolvedOxygen !== undefined
                ? `${marine.dissolvedOxygen}`
                : "확인 불가"
            }
          />
          <Detail
            label="탁도"
            value={
              marine?.turbidity !== undefined
                ? `${marine.turbidity}`
                : "확인 불가"
            }
          />
          <Detail label="관측 시각" value={marine?.observedAt ?? "확인 전"} />
          <Detail
            label="패류독소 속보"
            value={
              selectedAssessment.shellfish.data?.summary ??
              "실시간 원문 확인 전"
            }
          />
          <Detail
            label="회수·판매중지"
            value={
              selectedAssessment.recallCount > 0
                ? `${selectedAssessment.recallCount}건 확인`
                : snapshot?.recalls.status === "success"
                  ? "선택 지역 연결 정보 없음"
                  : "조회 결과 없음"
            }
          />
        </div>
        <div className="action-panel">
          <strong>필요한 행동</strong>
          <span>
            {selectedAssessment.level === "danger"
              ? "공식 원문과 판매처 안내를 확인할 때까지 섭취를 미루세요."
              : selectedAssessment.level === "unknown"
                ? "데이터가 확인될 때까지 판단을 보류하고 공식 원문을 확인하세요."
                : "해양환경 자료만으로 안전을 보장할 수 없으므로 제품 표시와 회수 안내를 함께 확인하세요."}
          </span>
        </div>
        {marine && (
          <div className="chart-wrap">
            <div className="chart-heading">
              <strong>최근 관측값</strong>
              <span>{marine.observedAt || "관측 시각 없음"}</span>
            </div>
            <div className="marine-facts">
              <span>
                <b>관측소</b>
                {marine.station}
              </span>
              <span>
                <b>수온</b>
                {marine.waterTemperature === undefined
                  ? "확인 불가"
                  : `${marine.waterTemperature}℃`}
              </span>
              <span>
                <b>pH</b>
                {marine.ph === undefined ? "확인 불가" : marine.ph}
              </span>
              <span>
                <b>염분</b>
                {marine.salinity === undefined ? "확인 불가" : marine.salinity}
              </span>
            </div>
          </div>
        )}
        <SourceLine
          name={selectedAssessment.shellfish.source.name}
          url={selectedAssessment.shellfish.source.url}
          date={
            marine?.observedAt
              ? `관측 ${marine.observedAt} · 수집 ${snapshot?.marine.fetchedAt ?? ""}`
              : "실시간 응답 기준일 확인 필요"
          }
        />
        <a
          className="external-link"
          href={selectedAssessment.shellfish.source.url}
          target="_blank"
          rel="noreferrer"
        >
          공식 원문 확인 <ExternalLink size={14} />
        </a>
      </Card>
    </div>
  );
}

function loadingAssessment(): RegionRiskAssessment {
  return {
    level: "unknown",
    state: "loading",
    summary: "공식 데이터 확인 중입니다.",
    reasons: [],
    recallCount: 0,
    shellfish: {
      status: "unavailable",
      data: null,
      source: {
        name: "국립수산과학원 패류독소 속보",
        url: "https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5",
      },
      fetchedAt: new Date().toISOString(),
      stale: false,
    },
  };
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
