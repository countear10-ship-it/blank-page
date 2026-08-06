export interface Env {
  DATA_GO_KR_SERVICE_KEY?: string;
  FOOD_SAFETY_KOREA_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
  MARINE_WATER_API_URL?: string;
  FOOD_SAFETY_KOREA_API_URL?: string;
}

export interface ApiSource { name: string; url: string; }
export interface ApiResponse<T> {
  status: 'success' | 'unavailable' | 'error';
  data: T | null;
  source: ApiSource;
  observedAt?: string;
  fetchedAt: string;
  stale: boolean;
  message?: string;
}
export interface MarineWaterRecord {
  station: string;
  stationId?: string;
  observedAt: string;
  receivedAt?: string;
  waterTemperature?: number;
  ph?: number;
  salinity?: number;
  dissolvedOxygen?: number;
  turbidity?: number;
  currentSpeed?: number;
}
export interface RecallRecord { productName: string; companyName?: string; reason?: string; announcedAt?: string; region?: string; sourceUrl: string; }
export interface ShellfishBulletin { title: string; publishedAt?: string; sourceUrl: string; summary: string; affectedAreas?: string[]; confirmedRisk: boolean; }

const SOURCES = {
  marine: { name: '해양수산부 해양자동관측망', url: 'https://www.data.go.kr/data/15127779/openapi.do' },
  recalls: { name: '식품안전나라 회수·판매중지', url: 'https://www.foodsafetykorea.go.kr/portal/specialinfo/searchInfoProduct.do' },
  shellfish: { name: '국립수산과학원 패류독소 속보', url: 'https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5' },
} as const;

function now(): string { return new Date().toISOString(); }
function response<T>(source: ApiSource, status: ApiResponse<T>['status'], data: T | null, message?: string): ApiResponse<T> { return { status, data, source, fetchedAt: now(), stale: false, ...(message ? { message } : {}) }; }
function serviceKey(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
  return { 'Access-Control-Allow-Origin': origin === allowed || origin === 'http://localhost:5173' ? origin : allowed, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}

function json<T>(body: ApiResponse<T>, request: Request, env: Env): Response {
  return new Response(JSON.stringify(body), { headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json; charset=utf-8' } });
}

function textBetween(source: string, names: string[]): string | undefined {
  for (const name of names) {
    const expression = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
    const match = source.match(expression);
    if (match?.[1]) return match[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
  }
  return undefined;
}

function numberBetween(source: string, names: string[]): number | undefined {
  const value = textBetween(source, names);
  if (!value) return undefined;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseMarineXml(xml: string): MarineWaterRecord[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => ({
    station: textBetween(item, ['stationName', 'station', 'obsPostName', 'rtmWqWtchStaCd', '관측소명']) ?? '관측소 미상',
    stationId: textBetween(item, ['stationId', 'obsPostId', 'rtmWqWtchStaCd', '관측소코드']),
    observedAt: textBetween(item, ['observedAt', 'obsTime', 'obsrDe', 'rtmWqWtchDtlDt', '관측일시']) ?? '',
    receivedAt: textBetween(item, ['receivedAt', 'recptnDt', '수신일시']),
    waterTemperature: numberBetween(item, ['waterTemperature', 'waterTemp', 'wtem', 'rtmWtchWtem', '수온']),
    ph: numberBetween(item, ['ph', '수소이온농도']),
    salinity: numberBetween(item, ['salinity', 'salt', 'rtmWqSlnty', '염분']),
    dissolvedOxygen: numberBetween(item, ['dissolvedOxygen', 'do', 'rtmWqDoxn', '용존산소']),
    turbidity: numberBetween(item, ['turbidity', 'ntu', 'rtmWqTu', '탁도']),
    currentSpeed: numberBetween(item, ['currentSpeed', 'currentVel', '유속']),
  })).filter((item) => item.observedAt || item.waterTemperature !== undefined || item.ph !== undefined);
}

function jsonText(record: Record<string, unknown>, names: string[]): string | undefined {
  for (const name of names) {
    const value = record[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function jsonNumber(record: Record<string, unknown>, names: string[]): number | undefined {
  const value = jsonText(record, names);
  if (!value) return undefined;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseMarineJson(body: unknown): MarineWaterRecord[] {
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;
  const bodyObject = root.body && typeof root.body === 'object' ? root.body as Record<string, unknown> : root;
  const itemsObject = bodyObject.items && typeof bodyObject.items === 'object' ? bodyObject.items as Record<string, unknown> : bodyObject;
  const rawItems = Array.isArray(itemsObject.item) ? itemsObject.item : itemsObject.item ? [itemsObject.item] : [];
  return rawItems.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => ({
    station: jsonText(item, ['stationName', 'station', 'obsPostName', 'rtmWqWtchStaCd']) ?? '관측소 미상',
    stationId: jsonText(item, ['stationId', 'obsPostId', 'rtmWqWtchStaCd']),
    observedAt: jsonText(item, ['observedAt', 'obsTime', 'obsrDe', 'rtmWqWtchDtlDt']) ?? '',
    receivedAt: jsonText(item, ['receivedAt', 'recptnDt']),
    waterTemperature: jsonNumber(item, ['waterTemperature', 'waterTemp', 'wtem', 'rtmWtchWtem']),
    ph: jsonNumber(item, ['ph']),
    salinity: jsonNumber(item, ['salinity', 'salt', 'rtmWqSlnty']),
    dissolvedOxygen: jsonNumber(item, ['dissolvedOxygen', 'do', 'rtmWqDoxn']),
    turbidity: jsonNumber(item, ['turbidity', 'ntu', 'rtmWqTu']),
    currentSpeed: jsonNumber(item, ['currentSpeed', 'currentVel']),
  })).filter((item) => item.observedAt || item.waterTemperature !== undefined || item.ph !== undefined);
}

function parseRecallJson(body: unknown): RecallRecord[] | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const service = (root.I0490 ?? root) as Record<string, unknown>;
  const result = service.RESULT as Record<string, unknown> | undefined;
  if (result && result.CODE && result.CODE !== 'INFO-000') return null;
  const rows = Array.isArray(service.row) ? service.row : [];
  return rows.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object')).map((row) => ({
    productName: String(row.PRDLST_NM ?? row.productName ?? ''),
    companyName: row.BSSH_NM ? String(row.BSSH_NM) : undefined,
    reason: row.RTN_RESN ? String(row.RTN_RESN) : row.RECALL_REASON ? String(row.RECALL_REASON) : undefined,
    announcedAt: row.RTN_PRCS_DCLS_DT ? String(row.RTN_PRCS_DCLS_DT) : row.REGIST_DT ? String(row.REGIST_DT) : undefined,
    region: row.SALE_AREA ? String(row.SALE_AREA) : undefined,
    sourceUrl: SOURCES.recalls.url,
  }));
}

export function parseLatestShellfishBulletin(html: string, baseUrl: string = SOURCES.shellfish.url): ShellfishBulletin | null {
  const candidates = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: match[1], title: match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }))
    .filter((item) => /패류독소|채취금지|패류독소속보|속보/.test(item.title));
  const item = candidates[0];
  if (!item?.title) return null;
  const sourceUrl = new URL(item.href, baseUrl).toString();
  return { title: item.title, sourceUrl, summary: '공식 패류독소 속보가 발표되었습니다. 위치별 채취금지 여부를 원문에서 확인해 주세요.', confirmedRisk: false };
}

async function upstream(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, headers: { Accept: 'application/json, text/xml, text/html', ...(init?.headers ?? {}) } });
}

async function marine(request: Request, env: Env): Promise<ApiResponse<MarineWaterRecord[]>> {
  if (!env.DATA_GO_KR_SERVICE_KEY || !env.MARINE_WATER_API_URL) return response<MarineWaterRecord[]>(SOURCES.marine, 'unavailable', null, '해양 API 키 또는 호출 URL이 설정되지 않았습니다.');
  try {
    const url = new URL(env.MARINE_WATER_API_URL);
    if (!url.searchParams.has('serviceKey')) url.searchParams.set('serviceKey', serviceKey(env.DATA_GO_KR_SERVICE_KEY));
    if (!url.searchParams.has('pageNo')) url.searchParams.set('pageNo', '1');
    if (!url.searchParams.has('numOfRows')) url.searchParams.set('numOfRows', '50');
    const upstreamResponse = await upstream(url.toString());
    if (!upstreamResponse.ok) return response<MarineWaterRecord[]>(SOURCES.marine, 'error', null, `해양 API 응답 오류 (${upstreamResponse.status})`);
    const body = await upstreamResponse.text();
    let records: MarineWaterRecord[] = [];
    if (upstreamResponse.headers.get('content-type')?.includes('json')) {
      try { records = parseMarineJson(JSON.parse(body) as unknown); } catch { records = []; }
    } else {
      records = parseMarineXml(body);
    }
    if (!records.length) return response<MarineWaterRecord[]>(SOURCES.marine, 'unavailable', null, '해양 API 응답에서 확인 가능한 관측값이 없습니다.');
    return { ...response(SOURCES.marine, 'success', records), observedAt: records[0].observedAt };
  } catch { return response<MarineWaterRecord[]>(SOURCES.marine, 'error', null, '해양 API 요청을 처리하지 못했습니다.'); }
}

async function recalls(request: Request, env: Env): Promise<ApiResponse<RecallRecord[]>> {
  const query = new URL(request.url).searchParams.get('query')?.trim() ?? '';
  if (!env.FOOD_SAFETY_KOREA_API_KEY) return response<RecallRecord[]>(SOURCES.recalls, 'unavailable', null, '식품안전나라 API 키가 설정되지 않았습니다.');
  try {
    const template = env.FOOD_SAFETY_KOREA_API_URL || 'https://openapi.foodsafetykorea.go.kr/api/{KEY}/I0490/json/1/100';
    const endpoint = template.replace('{KEY}', encodeURIComponent(env.FOOD_SAFETY_KOREA_API_KEY));
    const url = new URL(endpoint);
    if (query) url.pathname += `/PRDLST_NM=${encodeURIComponent(query)}`;
    const upstreamResponse = await upstream(url.toString());
    if (!upstreamResponse.ok) return response<RecallRecord[]>(SOURCES.recalls, 'error', null, `회수 API 응답 오류 (${upstreamResponse.status})`);
    const parsed = parseRecallJson(await upstreamResponse.json() as unknown);
    if (parsed === null) return response<RecallRecord[]>(SOURCES.recalls, 'error', null, '식품안전나라 응답 형식 또는 인증 상태를 확인하지 못했습니다.');
    return { ...response(SOURCES.recalls, 'success', parsed), observedAt: now() };
  } catch { return response<RecallRecord[]>(SOURCES.recalls, 'error', null, '회수 API 요청을 처리하지 못했습니다.'); }
}

async function shellfish(): Promise<ApiResponse<ShellfishBulletin>> {
  try {
    const page = await upstream(SOURCES.shellfish.url);
    if (!page.ok) return response<ShellfishBulletin>(SOURCES.shellfish, 'error', null, `패류독소 속보 응답 오류 (${page.status})`);
    const bulletin = parseLatestShellfishBulletin(await page.text());
    if (!bulletin) return response<ShellfishBulletin>(SOURCES.shellfish, 'unavailable', null, '공식 페이지 구조가 바뀌어 위치별 내용을 자동 해석하지 못했습니다. 원문을 확인하세요.');
    return { ...response(SOURCES.shellfish, 'success', bulletin), observedAt: bulletin.publishedAt };
  } catch { return response<ShellfishBulletin>(SOURCES.shellfish, 'error', null, '패류독소 속보에 연결하지 못했습니다.'); }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(request, env) });
    if (url.pathname === '/api/health') return json(response(SOURCES.marine, 'success', { marineConfigured: Boolean(env.DATA_GO_KR_SERVICE_KEY && env.MARINE_WATER_API_URL), recallsConfigured: Boolean(env.FOOD_SAFETY_KOREA_API_KEY), shellfishSource: SOURCES.shellfish.url }), request, env);
    if (url.pathname === '/api/marine-water') return json(await marine(request, env), request, env);
    if (url.pathname === '/api/recalls') return json(await recalls(request, env), request, env);
    if (url.pathname === '/api/shellfish-bulletin/latest') return json(await shellfish(), request, env);
    return new Response('Not Found', { status: 404, headers: corsHeaders(request, env) });
  },
};

export default worker;
