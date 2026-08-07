import { describe, expect, it } from 'vitest';
import regions from '../data/regions.json';
import { assessRegion, snapshotHasOfficialDanger } from './riskEngine';
import type { ApiResponse, MarineWaterRecord, RecallRecord, RealtimeSnapshot, ShellfishBulletin } from './types';
import type { Region } from '../types';

const source = { name: '테스트 출처', url: 'https://example.com' };
function envelope<T>(data: T | null, status: ApiResponse<T>['status'] = 'success'): ApiResponse<T> { return { status, data, source, fetchedAt: '2026-08-06T00:00:00Z', stale: false }; }
const region = (regions as Region[]).find((item) => item.id === 'gijang')!;
const marine: MarineWaterRecord[] = [{ station: '기장 관측소', observedAt: '2026-08-06T00:00:00Z', waterTemperature: 22 }];
const bulletin: ShellfishBulletin = { title: '패류독소 속보', sourceUrl: source.url, summary: '원문 확인 필요', confirmedRisk: false };

describe('live risk engine', () => {
  it('공식 회수 정보가 있으면 지역을 위험으로 올린다', () => {
    const recalls: RecallRecord[] = [{ productName: '굴', reason: '기장 회수', region: '기장', sourceUrl: source.url }];
    const snapshot: RealtimeSnapshot = { marine: envelope(marine), recalls: envelope(recalls), shellfish: envelope(bulletin) };
    expect(assessRegion(region, snapshot).level).toBe('danger');
    expect(snapshotHasOfficialDanger(snapshot, region, '굴')).toBe(true);
  });

  it('필수 공식 응답이 없으면 안전으로 단정하지 않는다', () => {
    const snapshot: RealtimeSnapshot = {
      marine: envelope<MarineWaterRecord[]>(null, 'unavailable'),
      recalls: envelope<RecallRecord[]>(null, 'error'),
      shellfish: envelope<ShellfishBulletin>(null, 'unavailable'),
    };
    expect(assessRegion(region, snapshot).level).toBe('unknown');
    expect(assessRegion(region, snapshot).state).toBe('error');
  });
  it('keeps a temporary recall outage in manual-confirm state', () => {
    const snapshot: RealtimeSnapshot = {
      marine: envelope(marine),
      recalls: envelope<RecallRecord[]>(null, 'unavailable'),
      shellfish: envelope(bulletin),
    };
    expect(assessRegion(region, snapshot)).toMatchObject({ level: 'unknown', state: 'manual-confirm' });
  });
});
