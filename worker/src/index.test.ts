import { describe, expect, it } from 'vitest';
import { parseGeminiOfficialRecallAnalysis, parseLatestShellfishBulletin, parseMarineJson, parseMarineXml, parseMfdsRecallNotices, recallProviderError } from './index';

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

  it('공식 속보 행에서 PDF 원문 링크와 게시일을 보존한다', () => {
    const bulletin = parseLatestShellfishBulletin('<tr><td class="subject"><a href="javascript:fnPopupPrevew(\'id\')" title="2026 패류독소 속보">2026 패류독소 속보</a></td><td><a href="/cmmnFile/fileDownloadStat.do?FILE_ID=abc">PDF</a></td><td class="date">2026-05-11</td></tr>', 'https://www.nifs.go.kr/board/actionBoard0021List.do');
    expect(bulletin).toMatchObject({ confirmedRisk: false, sourceUrl: 'https://www.nifs.go.kr/cmmnFile/fileDownloadStat.do?FILE_ID=abc', publishedAt: '2026-05-11' });
  });
  it('해양자동관측망 응답 필드명을 관측 레코드로 변환한다', () => {
    const records = parseMarineXml('<response><body><items><item><rtmWqWtchStaCd>NEP2002</rtmWqWtchStaCd><rtmWqWtchDtlDt>2020-02-06 15:25:00.0</rtmWqWtchDtlDt><rtmWtchWtem>7.590</rtmWtchWtem><ph>7.980</ph><rtmWqDoxn>11.760</rtmWqDoxn><rtmWqTu>1.2</rtmWqTu></item></items></body></response>');
    expect(records[0]).toMatchObject({ station: 'NEP2002', stationId: 'NEP2002', observedAt: '2020-02-06 15:25:00.0', waterTemperature: 7.59, ph: 7.98, dissolvedOxygen: 11.76, turbidity: 1.2 });
  });
  it('해양자동관측망 JSON 응답을 관측 레코드로 변환한다', () => {
    const records = parseMarineJson({ body: { items: { item: [{ rtmWqWtchStaCd: 'NEP2002', rtmWqWtchDtlDt: '2020-02-06 15:25:00.0', rtmWtchWtem: '7.590', ph: '7.980', rtmWqDoxn: '11.760' }] } } });
    expect(records[0]).toMatchObject({ station: 'NEP2002', stationId: 'NEP2002', observedAt: '2020-02-06 15:25:00.0', waterTemperature: 7.59, ph: 7.98, dissolvedOxygen: 11.76 });
  });
  it('preserves a temporary Food Safety Korea error message', () => {
    expect(recallProviderError({ I0490: { RESULT: { CODE: 'ERROR-503', MSG: 'Retry later.' } } })).toBe('ERROR-503: Retry later.');
  });
  it('extracts current MFDS recall notices and their original links', () => {
    const notices = parseMfdsRecallNotices('<li><a href="./view.do?seq=50254&amp;page=1" class="title">[보도참고] 굴 제품 회수 조치</a><div class="right_column">2026-08-06</div></li>');
    expect(notices).toEqual([{ title: '[보도참고] 굴 제품 회수 조치', publishedAt: '2026-08-06', sourceUrl: 'https://www.mfds.go.kr/brd/m_99/view.do?seq=50254&page=1' }]);
  });
  it('accepts an AI summary only when it is grounded in a Food Safety Korea original URL', () => {
    const analysis = parseGeminiOfficialRecallAnalysis({ candidates: [{ content: { parts: [{ text: '{"summary":"공식 원문 요약","foundRelevantRecall":false}' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://www.foodsafetykorea.go.kr/portal/specialinfo/searchInfoProduct.do' } }] } }] });
    expect(analysis).toMatchObject({ summary: '공식 원문 요약', sourceUrls: ['https://www.foodsafetykorea.go.kr/portal/specialinfo/searchInfoProduct.do'] });
  });
});
