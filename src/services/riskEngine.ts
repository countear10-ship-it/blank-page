import type { Region, RiskLevel, Seafood } from '../types';
import type { ApiResponse, DataViewState, MarineWaterRecord, RecallRecord, RealtimeSnapshot, ShellfishBulletin } from './types';

export interface RegionRiskAssessment {
  level: RiskLevel;
  state: DataViewState;
  summary: string;
  reasons: string[];
  marine?: MarineWaterRecord;
  recallCount: number;
  shellfish: ApiResponse<ShellfishBulletin>;
}

export function viewState(response: ApiResponse<unknown>): DataViewState {
  if (response.status === 'error') return 'error';
  if (response.status === 'unavailable') return 'unavailable';
  if (!response.data) return 'no-data';
  if (response.stale) return 'stale';
  return 'latest';
}

function containsRegion(text: string, region: Region): boolean {
  const aliases: Record<string, string[]> = {
    gijang: ['기장'], songjeong: ['송정'], haeundae: ['해운대'], gwangalli: ['광안리'], yeongdo: ['영도'], jagalchi: ['자갈치', '남항'], dadaepo: ['다대포'],
  };
  return (aliases[region.id] ?? [region.name]).some((alias) => text.includes(alias));
}

function hasRegionalRecall(records: RecallRecord[], region: Region): boolean {
  return records.some((record) => containsRegion(`${record.region ?? ''} ${record.productName} ${record.reason ?? ''}`, region));
}

export function assessRegion(region: Region, snapshot: RealtimeSnapshot): RegionRiskAssessment {
  const reasons: string[] = [];
  const marine = snapshot.marine.data?.find((record) => containsRegion(record.station, region));
  const recallCount = snapshot.recalls.data?.filter((record) => hasRegionalRecall([record], region)).length ?? 0;
  const bulletin = snapshot.shellfish.data;
  const bulletinMatches = Boolean(bulletin?.affectedAreas?.some((area) => containsRegion(area, region)));

  if (recallCount > 0) {
    reasons.push('공식 회수·판매중지 정보가 선택 지역 또는 제품 정보와 연결됩니다.');
    return { level: 'danger', state: 'manual-confirm', summary: '공식 회수·판매중지 원문을 먼저 확인하세요.', reasons, marine, recallCount, shellfish: snapshot.shellfish };
  }
  if (bulletin?.confirmedRisk && bulletinMatches) {
    reasons.push('공식 패류독소 속보에서 선택 지역과 연결된 주의정보가 확인되었습니다.');
    return { level: 'danger', state: 'manual-confirm', summary: '패류독소 원문에서 채취금지 여부를 확인하세요.', reasons, marine, recallCount, shellfish: snapshot.shellfish };
  }
  if (snapshot.shellfish.status === 'success' && snapshot.recalls.status === 'success' && snapshot.marine.status === 'success') {
    reasons.push('공식 데이터 응답은 도착했지만 해양환경 자료만으로 해산물의 안전을 보장할 수 없습니다.');
    return { level: 'safe', state: 'latest', summary: '현재 확인된 공식 데이터에서 즉시 확인되는 지역 위험정보 없음', reasons, marine, recallCount, shellfish: snapshot.shellfish };
  }
  const states = [viewState(snapshot.marine), viewState(snapshot.recalls), viewState(snapshot.shellfish)];
  const state = states.includes('error') ? 'error' : states.includes('unavailable') ? 'unavailable' : 'no-data';
  reasons.push('필요한 공식 데이터가 모두 확인되지 않아 지역 위험을 판단하지 않습니다.');
  return { level: 'unknown', state, summary: '최신 공식 데이터 확인이 필요합니다.', reasons, marine, recallCount, shellfish: snapshot.shellfish };
}

export function snapshotHasOfficialDanger(snapshot: RealtimeSnapshot, region: Region, seafood: Seafood): boolean {
  const assessment = assessRegion(region, snapshot);
  const productRecall = snapshot.recalls.data?.some((record) => `${record.productName} ${record.reason ?? ''}`.includes(seafood)) ?? false;
  return assessment.level === 'danger' || productRecall;
}

export function snapshotIsSufficient(snapshot: RealtimeSnapshot): boolean {
  return snapshot.recalls.status === 'success' && snapshot.shellfish.status === 'success';
}
