import { describe, expect, it } from 'vitest';
import { parseLatestShellfishBulletin, parseMarineJson, parseMarineXml } from './index';

describe('worker parsers', () => {
  it('해양 XML에서 확인 가능한 관측값만 추출한다', () => {
    const records = parseMarineXml('<response><body><items><item><stationName>기장</stationName><obsTime>2026-08-06T09:00:00</obsTime><waterTemp>22.4</waterTemp><ph>8.1</ph></item></items></body></response>');
    expect(records[0]).toMatchObject({ station: '기장', observedAt: '2026-08-06T09:00:00', waterTemperature: 22.4, ph: 8.1 });
  });

  it('빈 XML은 빈 배열로 돌려보내 임의의 데이터를 만들지 않는다', () => {
    expect(parseMarineXml('<response><body><items /></body></response>')).toEqual([]);
  });

  it('패류독소 페이지 구조를 해석할 수 없으면 null을 반환한다', () => {
    expect(parseLatestShellfishBulletin('<html><body><a href="/notice">일반 공지</a></body></html>')).toBeNull();
  });

  it('공식 속보 링크를 찾으면 위치 판단은 보류한 채 원문 링크를 보존한다', () => {
    const bulletin = parseLatestShellfishBulletin('<a href="/board/1">2026 패류독소 속보</a>', 'https://www.nifs.go.kr/board/actionBoard0021List.do');
    expect(bulletin).toMatchObject({ confirmedRisk: false, sourceUrl: 'https://www.nifs.go.kr/board/1' });
  });
  it('해양자동관측망 응답 필드명을 관측 레코드로 변환한다', () => {
    const records = parseMarineXml('<response><body><items><item><rtmWqWtchStaCd>NEP2002</rtmWqWtchStaCd><rtmWqWtchDtlDt>2020-02-06 15:25:00.0</rtmWqWtchDtlDt><rtmWtchWtem>7.590</rtmWtchWtem><ph>7.980</ph><rtmWqDoxn>11.760</rtmWqDoxn><rtmWqTu>1.2</rtmWqTu></item></items></body></response>');
    expect(records[0]).toMatchObject({ station: 'NEP2002', stationId: 'NEP2002', observedAt: '2020-02-06 15:25:00.0', waterTemperature: 7.59, ph: 7.98, dissolvedOxygen: 11.76, turbidity: 1.2 });
  });
  it('해양자동관측망 JSON 응답을 관측 레코드로 변환한다', () => {
    const records = parseMarineJson({ body: { items: { item: [{ rtmWqWtchStaCd: 'NEP2002', rtmWqWtchDtlDt: '2020-02-06 15:25:00.0', rtmWtchWtem: '7.590', ph: '7.980', rtmWqDoxn: '11.760' }] } } });
    expect(records[0]).toMatchObject({ station: 'NEP2002', stationId: 'NEP2002', observedAt: '2020-02-06 15:25:00.0', waterTemperature: 7.59, ph: 7.98, dissolvedOxygen: 11.76 });
  });
});
