import type { ApiResponse, MarineWaterRecord, RecallRecord, RealtimeSnapshot, ShellfishBulletin } from './types';

const SOURCES = {
  marine: { name: '해양수산부 해양자동관측망', url: 'https://www.data.go.kr/data/15127779/openapi.do' },
  recalls: { name: '식품안전나라 회수·판매중지', url: 'https://www.foodsafetykorea.go.kr/portal/specialinfo/searchInfoProduct.do' },
  shellfish: { name: '국립수산과학원 패류독소 속보', url: 'https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5' },
} as const;

const DEFAULT_DATA_API_BASE_URL = 'https://seasafe-busan-api.seasafe-busan-api.workers.dev';
const API_BASE_URL = ((import.meta.env.VITE_DATA_API_BASE_URL as string | undefined) || DEFAULT_DATA_API_BASE_URL).replace(/\/$/, '');
// 공공 해양관측망 응답이 느린 경우가 있어, 공식 응답을 기다리되 무한 대기는 피합니다.
const REQUEST_TIMEOUT_MS = 45_000;

function unavailable<T>(source: { name: string; url: string }, message: string): ApiResponse<T> {
  return { status: 'unavailable', data: null, source, fetchedAt: new Date().toISOString(), stale: false, message };
}

export function isRealtimeConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

async function request<T>(path: string, source: { name: string; url: string }): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) return unavailable(source, '실시간 데이터 연결 주소가 설정되지 않았습니다.');

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    const body = await response.json() as ApiResponse<T>;
    if (!response.ok || !body || !body.status) {
      return { status: 'error', data: null, source, fetchedAt: new Date().toISOString(), stale: false, message: `실시간 데이터 응답 오류 (${response.status})` };
    }
    return { ...body, source: body.source ?? source };
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'AbortError'
      ? '실시간 데이터 요청 시간이 초과되었습니다.'
      : '실시간 데이터에 연결하지 못했습니다.';
    return { status: 'error', data: null, source, fetchedAt: new Date().toISOString(), stale: false, message };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function fetchMarineWater(): Promise<ApiResponse<MarineWaterRecord[]>> {
  return request<MarineWaterRecord[]>('/api/marine-water', SOURCES.marine);
}

export function fetchRecalls(query: string): Promise<ApiResponse<RecallRecord[]>> {
  return request<RecallRecord[]>(`/api/recalls?query=${encodeURIComponent(query)}`, SOURCES.recalls);
}

export function fetchShellfishBulletin(): Promise<ApiResponse<ShellfishBulletin>> {
  return request<ShellfishBulletin>('/api/shellfish-bulletin/latest', SOURCES.shellfish);
}

export async function fetchRealtimeSnapshot(seafood = '해산물'): Promise<RealtimeSnapshot> {
  const [marine, recalls, shellfish] = await Promise.all([fetchMarineWater(), fetchRecalls(seafood), fetchShellfishBulletin()]);
  return { marine, recalls, shellfish };
}

export { SOURCES };
