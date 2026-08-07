export interface Env {
  DATA_GO_KR_SERVICE_KEY?: string;
  FOOD_SAFETY_KOREA_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  MARINE_WATER_API_URL?: string;
  BUSAN_MARINE_API_URL?: string;
  FOOD_SAFETY_KOREA_API_URL?: string;
}

export interface ApiSource { name: string; url: string; }
export interface OfficialSourceAnalysis {
  summary: string;
  sourceUrls: string[];
  analyzedAt: string;
}
export interface ApiResponse<T> {
  status: 'success' | 'unavailable' | 'error';
  data: T | null;
  source: ApiSource;
  observedAt?: string;
  fetchedAt: string;
  stale: boolean;
  message?: string;
  analysis?: OfficialSourceAnalysis;
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
export interface BusanMarineRecord {
  station: string;
  inspectedYear?: string;
  inspectedQuarter?: string;
  waterQualityIndex?: number;
  grade?: string;
  waterTemperature?: number;
  ph?: number;
  dissolvedOxygen?: number;
  salinity?: number;
  totalColiform?: number;
}
export interface RecallRecord { productName: string; companyName?: string; reason?: string; announcedAt?: string; region?: string; sourceUrl: string; }
export interface ShellfishBulletin { title: string; publishedAt?: string; sourceUrl: string; summary: string; affectedAreas?: string[]; confirmedRisk: boolean; }

const SOURCES = {
  marine: { name: '해양수산부 해양자동관측망', url: 'https://www.data.go.kr/data/15127779/openapi.do' },
  busanMarine: { name: '부산광역시 해양환경 측정(망)', url: 'https://www.data.go.kr/data/15034081/openapi.do' },
  recalls: { name: '식품안전나라 회수·판매중지', url: 'https://www.foodsafetykorea.go.kr/portal/specialinfo/searchInfoProduct.do' },
  mfdsRecalls: { name: '식품의약품안전처 회수·판매중지 보도자료', url: 'https://www.mfds.go.kr/brd/m_99/list.do' },
  shellfish: { name: '국립수산과학원 패류독소 속보', url: 'https://www.nifs.go.kr/board/actionBoard0021List.do?selectPage=5' },
} as const;

const RECALL_CACHE_TTL_SECONDS = 6 * 60 * 60;
const RECALL_RETRY_DELAYS_MS = [350, 700] as const;
const MARINE_CACHE_TTL_SECONDS = 24 * 60 * 60;
const MARINE_RETRY_DELAYS_MS = [350] as const;
const MARINE_REQUEST_TIMEOUT_MS = 5_000;

function now(): string { return new Date().toISOString(); }
function response<T>(source: ApiSource, status: ApiResponse<T>['status'], data: T | null, message?: string): ApiResponse<T> { return { status, data, source, fetchedAt: now(), stale: false, ...(message ? { message } : {}) }; }
function serviceKey(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function isStale(observedAt?: string, maxAgeDays = 7): boolean {
  if (!observedAt) return true;
  const parsed = new Date(observedAt.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return true;
  return Date.now() - parsed.getTime() > maxAgeDays * 24 * 60 * 60 * 1000;
}

function marineDateParam(date: Date): string {
  const korea = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const month = korea.getUTCMonth() + 1;
  const day = korea.getUTCDate();
  const year = String(korea.getUTCFullYear()).slice(-2);
  const hour = String(korea.getUTCHours()).padStart(2, '0');
  const minute = String(korea.getUTCMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hour}:${minute}`;
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

export function parseBusanMarineJson(body: unknown): BusanMarineRecord[] {
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;
  const responseBody = root.response && typeof root.response === 'object'
    ? (root.response as Record<string, unknown>).body
    : root.body;
  const bodyObject = responseBody && typeof responseBody === 'object' ? responseBody as Record<string, unknown> : root;
  const items = bodyObject.items && typeof bodyObject.items === 'object' ? bodyObject.items as Record<string, unknown> : bodyObject;
  const rawItems = Array.isArray(items.item) ? items.item : items.item ? [items.item] : [];
  return rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      station: jsonText(item, ['site', 'siteNm', 'stationName']) ?? '측정지점 미상',
      inspectedYear: jsonText(item, ['inspecYy', 'inspectionYear']),
      inspectedQuarter: jsonText(item, ['inspecQt', 'inspectionQuarter']),
      waterQualityIndex: jsonNumber(item, ['water01', 'waterQualityIndex', 'wqi']),
      grade: jsonText(item, ['water02', 'grade']),
      waterTemperature: jsonNumber(item, ['water14', 'waterTemperature']),
      ph: jsonNumber(item, ['water08', 'ph']),
      dissolvedOxygen: jsonNumber(item, ['water13', 'dissolvedOxygen', 'do']),
      salinity: jsonNumber(item, ['water16', 'salinity']),
      totalColiform: jsonNumber(item, ['water09', 'totalColiform']),
    }))
    .filter((item) => item.station !== '측정지점 미상');
}

function marineTotalCount(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const root = body as Record<string, unknown>;
  const bodyObject = root.body && typeof root.body === 'object' ? root.body as Record<string, unknown> : root;
  const value = bodyObject.totalCount;
  const count = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(count) ? count : undefined;
}

export function recallProviderError(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const root = body as Record<string, unknown>;
  const service = (root.I0490 ?? root) as Record<string, unknown>;
  const result = service.RESULT;
  if (!result || typeof result !== 'object') return undefined;
  const resultRecord = result as Record<string, unknown>;
  const code = typeof resultRecord.CODE === 'string' ? resultRecord.CODE : undefined;
  if (!code || code === 'INFO-000') return undefined;
  const message = typeof resultRecord.MSG === 'string' ? resultRecord.MSG : undefined;
  return message ? `${code}: ${message}` : code;
}

function parseRecallJson(body: unknown): RecallRecord[] | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const service = (root.I0490 ?? root) as Record<string, unknown>;
  if (recallProviderError(body)) return null;
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
  const row = (html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? []).find((item) => /패류독소|채취금지|패류독소속보|패독속보/.test(item));
  if (!row) return null;
  const title = row.match(/title=["']([^"']*(?:패류독소|채취금지|패독속보)[^"']*)["']/i)?.[1]?.replace(/\s+/g, ' ').trim();
  if (!title) return null;
  const download = row.match(/href=["']([^"']*fileDownloadStat\.do\?FILE_ID=[^"']+)["']/i)?.[1];
  const publishedAt = row.match(/class=["']date["'][^>]*>\s*([^<]+?)\s*<\/td>/i)?.[1]?.trim();
  return {
    title,
    sourceUrl: download ? new URL(download, baseUrl).toString() : baseUrl,
    publishedAt,
    summary: publishedAt ? `가장 최근 공식 패류독소 속보: ${publishedAt} 게시. 원문에서 지역별 채취·섭취 주의 내용을 확인하세요.` : '가장 최근 공식 패류독소 속보 원문을 확인하세요.',
    confirmedRisk: false,
  };
}

export interface MfdsRecallNotice {
  title: string;
  publishedAt?: string;
  sourceUrl: string;
}

function decodeHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:#0*39|apos);/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMfdsRecallNotices(html: string, baseUrl: string = SOURCES.mfdsRecalls.url): MfdsRecallNotice[] {
  const notices: MfdsRecallNotice[] = [];
  const pattern = /<a\s+href="([^"]*view\.do\?[^"]*)"[^>]*class="title"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="right_column">\s*([^<]+?)\s*<\/div>/gi;
  for (const match of html.matchAll(pattern)) {
    const title = decodeHtml(match[2]);
    if (!title || !/(회수|판매\s*중지)/.test(title)) continue;
    const date = decodeHtml(match[3]);
    notices.push({
      title,
      sourceUrl: new URL(match[1].replace(/&amp;/g, '&'), baseUrl).toString(),
      ...( /^\d{4}-\d{2}-\d{2}$/.test(date) ? { publishedAt: date } : {}),
    });
  }
  return notices;
}

async function mfdsOfficialRecallFallback(query: string): Promise<{ records: RecallRecord[]; analysis: OfficialSourceAnalysis } | null> {
  try {
    const page = await upstream(SOURCES.mfdsRecalls.url);
    if (!page.ok) return null;
    const notices = parseMfdsRecallNotices(await page.text());
    if (!notices.length) return null;
    const keyword = query.trim();
    const matches = keyword ? notices.filter((notice) => notice.title.includes(keyword)) : notices;
    const displayed = (matches.length ? matches : notices).slice(0, 2);
    const latestDate = displayed.map((notice) => notice.publishedAt).filter((date): date is string => Boolean(date)).sort().at(-1);
    const summary = matches.length
      ? `식약처 최신 회수·판매중지 공지에서 “${keyword}”가 제목에 명시된 안내 ${matches.length}건을 확인했습니다. 원문에서 제품명·판매처·회수 사유를 확인하세요.`
      : `식약처 최신 회수·판매중지 공지 ${notices.length}건을 확인했지만, 현재 목록 제목에서 “${keyword || '해산물'}”이 직접 명시된 안내는 찾지 못했습니다. 식품안전나라 API 지연으로 제품·판매처 단위 확인은 보류합니다.`;
    return {
      records: matches.map((notice) => ({
        productName: notice.title,
        reason: '식품의약품안전처 공식 회수·판매중지 보도자료',
        announcedAt: notice.publishedAt,
        sourceUrl: notice.sourceUrl,
      })),
      analysis: { summary, sourceUrls: displayed.map((notice) => notice.sourceUrl), analyzedAt: latestDate ?? now() },
    };
  } catch {
    return null;
  }
}

async function upstream(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, headers: { Accept: 'application/json, text/xml, text/html', ...(init?.headers ?? {}) } });
}

function recallCacheKey(query: string): Request {
  return new Request(`https://seasafe-busan-api-cache.invalid/recalls?query=${encodeURIComponent(query)}`);
}

async function recallFallback(query: string, message: string): Promise<ApiResponse<RecallRecord[]> | null> {
  const cached = await caches.default.match(recallCacheKey(query));
  if (!cached) return null;
  try {
    const stored = await cached.json() as ApiResponse<RecallRecord[]>;
    if (stored.status !== 'success' || !stored.data) return null;
    const lastCheckedAt = stored.observedAt ?? stored.fetchedAt;
    return {
      ...stored,
      fetchedAt: now(),
      stale: true,
      message: `식품안전나라 실시간 응답이 일시적으로 지연됩니다. 마지막 정상 확인: ${lastCheckedAt}. ${message}`,
    };
  } catch {
    return null;
  }
}

async function storeRecallSuccess(query: string, body: ApiResponse<RecallRecord[]>): Promise<void> {
  const cached = new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${RECALL_CACHE_TTL_SECONDS}`,
    },
  });
  await caches.default.put(recallCacheKey(query), cached);
}

function marineCacheKey(): Request {
  return new Request('https://seasafe-busan-api-cache.invalid/marine-water');
}

async function marineFallback(message: string): Promise<ApiResponse<MarineWaterRecord[]> | null> {
  const cached = await caches.default.match(marineCacheKey());
  if (!cached) return null;
  try {
    const stored = await cached.json() as ApiResponse<MarineWaterRecord[]>;
    if (stored.status !== 'success' || !stored.data?.length) return null;
    const lastObservedAt = stored.observedAt ?? stored.data[0]?.observedAt ?? stored.fetchedAt;
    return {
      ...stored,
      fetchedAt: now(),
      stale: true,
      message: `해양 관측 API가 일시 지연되어 마지막으로 정상 수집한 공식 관측값을 표시합니다. 마지막 관측: ${lastObservedAt}. ${message}`,
    };
  } catch {
    return null;
  }
}

async function storeMarineSuccess(body: ApiResponse<MarineWaterRecord[]>): Promise<void> {
  const cached = new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${MARINE_CACHE_TTL_SECONDS}`,
    },
  });
  await caches.default.put(marineCacheKey(), cached);
}

async function upstreamWithRetries(url: string, retryDelays: readonly number[]): Promise<Response> {
  let latestResponse: Response | undefined;
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      latestResponse = await upstream(url, { signal: AbortSignal.timeout(MARINE_REQUEST_TIMEOUT_MS) });
    } catch {
      if (attempt === retryDelays.length) throw new Error('Marine upstream timed out');
      await wait(retryDelays[attempt]);
      continue;
    }
    if (latestResponse.ok || attempt === retryDelays.length) return latestResponse;
    await wait(retryDelays[attempt]);
  }
  return latestResponse as Response;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

type GeminiRecallResult = { summary?: unknown; foundRelevantRecall?: unknown };

function geminiText(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const candidates = (body as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return undefined;
  const content = (candidates[0] as Record<string, unknown>).content;
  if (!content || typeof content !== 'object') return undefined;
  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return undefined;
  return parts.map((part) => part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string' ? (part as Record<string, unknown>).text : '').join('').trim() || undefined;
}

function geminiGroundedOfficialUrls(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const candidates = (body as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== 'object') return [];
  const metadata = (candidates[0] as Record<string, unknown>).groundingMetadata;
  const chunks = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>).groundingChunks : undefined;
  if (!Array.isArray(chunks)) return [];
  return [...new Set(chunks.flatMap((chunk) => {
    const web = chunk && typeof chunk === 'object' ? (chunk as Record<string, unknown>).web : undefined;
    const uri = web && typeof web === 'object' ? (web as Record<string, unknown>).uri : undefined;
    return typeof uri === 'string' && /^https:\/\/([\w-]+\.)*foodsafetykorea\.go\.kr\//i.test(uri) ? [uri] : [];
  }))];
}

function parseGeminiJson(text: string | undefined): GeminiRecallResult | null {
  if (!text) return null;
  const json = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as GeminiRecallResult : null;
  } catch {
    return null;
  }
}

export function parseGeminiOfficialRecallAnalysis(body: unknown): OfficialSourceAnalysis | null {
  const sourceUrls = geminiGroundedOfficialUrls(body);
  const parsed = parseGeminiJson(geminiText(body));
  const summary = typeof parsed?.summary === 'string' ? parsed.summary.replace(/\s+/g, ' ').trim().slice(0, 340) : '';
  if (!sourceUrls.length || !summary) return null;
  return { summary, sourceUrls, analyzedAt: now() };
}

function foundRelevantRecall(body: unknown): boolean {
  const parsed = parseGeminiJson(geminiText(body));
  return parsed?.foundRelevantRecall === true;
}

async function geminiOfficialRecallFallback(query: string, env: Env): Promise<{ records: RecallRecord[]; analysis: OfficialSourceAnalysis } | null> {
  if (!env.GEMINI_API_KEY) return null;
  const prompt = [
    'Use Google Search to find the most recent official Food Safety Korea (foodsafetykorea.go.kr) original pages relevant to a Korean seafood recall or sales-suspension check.',
    `Search keyword: ${query || '해산물'}.`,
    'Return JSON only: {"summary":"Korean summary in 180 Korean characters or fewer, state the source date if visible and clearly say when it is not visible","foundRelevantRecall":true|false}.',
    'Rules: use only facts that are directly supported by current official Food Safety Korea pages; never say food is safe; do not invent a recall, date, product, or region; foundRelevantRecall is true only when the official source explicitly identifies a relevant recall or sales suspension.',
  ].join('\n');
  const models = [...new Set([env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-2.5-flash'].filter((model): model is string => Boolean(model)))];
  for (const model of models) {
    try {
      const result = await upstream(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 300 },
        }),
      });
      if (!result.ok) continue;
      const body = await result.json() as unknown;
      const analysis = parseGeminiOfficialRecallAnalysis(body);
      if (!analysis) continue;
      const records = foundRelevantRecall(body)
        ? [{ productName: query || '해산물', reason: `공식 원문 보조 분석: ${analysis.summary}`, announcedAt: analysis.analyzedAt, sourceUrl: analysis.sourceUrls[0] }]
        : [];
      return { records, analysis };
    } catch {
      // A direct official API or the retained cache remains the preferred source.
    }
  }
  return null;
}

async function marine(request: Request, env: Env): Promise<ApiResponse<MarineWaterRecord[]>> {
  if (!env.DATA_GO_KR_SERVICE_KEY || !env.MARINE_WATER_API_URL) return response<MarineWaterRecord[]>(SOURCES.marine, 'unavailable', null, '해양 API 키 또는 호출 URL이 설정되지 않았습니다.');
  try {
    const url = new URL(env.MARINE_WATER_API_URL);
    if (!url.searchParams.has('serviceKey')) url.searchParams.set('serviceKey', serviceKey(env.DATA_GO_KR_SERVICE_KEY));
    url.searchParams.set('wtch_dt_start', marineDateParam(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)));
    url.searchParams.set('wtch_dt_end', marineDateParam(new Date()));
    url.searchParams.set('_type', 'json');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '50');
    const upstreamResponse = await upstreamWithRetries(url.toString(), MARINE_RETRY_DELAYS_MS);
    if (!upstreamResponse.ok) {
      return (await marineFallback(`해양 API 응답 오류 (${upstreamResponse.status})`))
        ?? response<MarineWaterRecord[]>(SOURCES.marine, 'error', null, `해양 API 응답 오류 (${upstreamResponse.status})`);
    }
    const body = await upstreamResponse.text();
    let records: MarineWaterRecord[] = [];
    let totalCount: number | undefined;
    if (upstreamResponse.headers.get('content-type')?.includes('json')) {
      try {
        const parsed = JSON.parse(body) as unknown;
        records = parseMarineJson(parsed);
        totalCount = marineTotalCount(parsed);
      } catch { records = []; }
    } else {
      records = parseMarineXml(body);
    }
    const lastPage = totalCount ? Math.ceil(totalCount / 50) : 1;
    if (lastPage > 1) {
      url.searchParams.set('pageNo', String(lastPage));
      const latestResponse = await upstreamWithRetries(url.toString(), MARINE_RETRY_DELAYS_MS);
      if (latestResponse.ok) {
        const latestBody = await latestResponse.text();
        if (latestResponse.headers.get('content-type')?.includes('json')) {
          try { records = parseMarineJson(JSON.parse(latestBody) as unknown); } catch { records = []; }
        } else {
          records = parseMarineXml(latestBody);
        }
      }
    }
    records.sort((left, right) => right.observedAt.localeCompare(left.observedAt));
    if (!records.length) {
      return (await marineFallback('해양 API 응답에서 확인 가능한 관측값이 없습니다.'))
        ?? response<MarineWaterRecord[]>(SOURCES.marine, 'unavailable', null, '해양 API 응답에서 확인 가능한 관측값이 없습니다.');
    }
    const result = {
      ...response(SOURCES.marine, 'success', records),
      observedAt: records[0].observedAt,
      stale: isStale(records[0].observedAt),
      message: isStale(records[0].observedAt) ? '공식 응답은 확인됐지만 관측 시각이 오래되어 최신 정보로 판단하지 않습니다.' : undefined,
    };
    await storeMarineSuccess(result);
    return result;
  } catch {
    return (await marineFallback('해양 API 요청을 처리하지 못했습니다.'))
      ?? response<MarineWaterRecord[]>(SOURCES.marine, 'error', null, '해양 API 요청을 처리하지 못했습니다.');
  }
}

async function busanMarine(env: Env): Promise<ApiResponse<BusanMarineRecord[]>> {
  if (!env.DATA_GO_KR_SERVICE_KEY) {
    return response<BusanMarineRecord[]>(SOURCES.busanMarine, 'unavailable', null, '부산 해양환경 API 키가 설정되지 않았습니다.');
  }
  try {
    const url = new URL(env.BUSAN_MARINE_API_URL ?? 'https://apis.data.go.kr/6260000/BusanMrnEnvrnInfoService/getMrnEnvrnInfo');
    if (!url.searchParams.has('ServiceKey') && !url.searchParams.has('serviceKey')) {
      url.searchParams.set('ServiceKey', serviceKey(env.DATA_GO_KR_SERVICE_KEY));
    }
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('resultType', 'json');
    const upstreamResponse = await upstreamWithRetries(url.toString(), MARINE_RETRY_DELAYS_MS);
    if (!upstreamResponse.ok) {
      return response<BusanMarineRecord[]>(SOURCES.busanMarine, 'unavailable', null, `부산 해양환경 API 응답 오류 (${upstreamResponse.status}). 공공데이터포털에서 이 API의 활용신청 상태를 확인하세요.`);
    }
    const body = await upstreamResponse.json() as unknown;
    const records = parseBusanMarineJson(body);
    if (!records.length) {
      return response<BusanMarineRecord[]>(SOURCES.busanMarine, 'unavailable', null, '부산 해양환경 API 응답에서 지역별 측정값을 확인하지 못했습니다.');
    }
    const latest = records.reduce<BusanMarineRecord>((current, item) => {
      const currentPeriod = `${current.inspectedYear ?? ''}${current.inspectedQuarter ?? ''}`;
      const itemPeriod = `${item.inspectedYear ?? ''}${item.inspectedQuarter ?? ''}`;
      return itemPeriod > currentPeriod ? item : current;
    }, records[0]);
    return {
      ...response(SOURCES.busanMarine, 'success', records),
      observedAt: [latest.inspectedYear, latest.inspectedQuarter ? `${latest.inspectedQuarter}분기` : undefined].filter(Boolean).join(' '),
    };
  } catch {
    return response<BusanMarineRecord[]>(SOURCES.busanMarine, 'error', null, '부산 해양환경 API 요청을 처리하지 못했습니다.');
  }
}

async function recalls(request: Request, env: Env): Promise<ApiResponse<RecallRecord[]>> {
  const query = new URL(request.url).searchParams.get('query')?.trim() ?? '';
  if (!env.FOOD_SAFETY_KOREA_API_KEY) return response<RecallRecord[]>(SOURCES.recalls, 'unavailable', null, '식품안전나라 API 키가 설정되지 않았습니다.');
  let lastError = '식품안전나라 응답을 확인하지 못했습니다.';
  try {
    const template = env.FOOD_SAFETY_KOREA_API_URL || 'https://openapi.foodsafetykorea.go.kr/api/{KEY}/I0490/json/1/100';
    const endpoint = template.replace('{KEY}', encodeURIComponent(env.FOOD_SAFETY_KOREA_API_KEY));
    const url = new URL(endpoint);
    if (query) url.pathname += `/PRDLST_NM=${encodeURIComponent(query)}`;
    for (let attempt = 0; attempt <= RECALL_RETRY_DELAYS_MS.length; attempt += 1) {
      const upstreamResponse = await upstream(url.toString());
      if (!upstreamResponse.ok) {
        lastError = `회수 API 응답 오류 (${upstreamResponse.status})`;
      } else {
        const body = await upstreamResponse.json() as unknown;
        const providerError = recallProviderError(body);
        if (providerError) {
          lastError = `식품안전나라 일시 응답 오류 (${providerError})`;
        } else {
          const parsed = parseRecallJson(body);
          if (parsed !== null) {
            const success = { ...response(SOURCES.recalls, 'success', parsed), observedAt: now() };
            await storeRecallSuccess(query, success);
            return success;
          }
          lastError = '식품안전나라 응답 형식 또는 인증 상태를 확인하지 못했습니다.';
        }
      }
      const delay = RECALL_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) await wait(delay);
    }
  } catch {
    lastError = '회수 API 요청을 처리하지 못했습니다.';
  }
  const mfdsFallback = await mfdsOfficialRecallFallback(query);
  if (mfdsFallback) {
    if (mfdsFallback.records.length) {
      return {
        ...response(SOURCES.mfdsRecalls, 'success', mfdsFallback.records, '식품안전나라 API 응답이 지연되어 식품의약품안전처의 최신 공식 회수·판매중지 보도자료를 대신 확인했습니다.'),
        observedAt: mfdsFallback.analysis.analyzedAt,
        analysis: mfdsFallback.analysis,
      };
    }
    return {
      ...response(SOURCES.mfdsRecalls, 'unavailable', [], `${lastError} 식품의약품안전처 최신 회수·판매중지 공지는 확인했지만 선택 식품의 제품·판매처 단위 확인은 보류합니다.`),
      observedAt: mfdsFallback.analysis.analyzedAt,
      analysis: mfdsFallback.analysis,
    };
  }
  const assisted = await geminiOfficialRecallFallback(query, env);
  if (assisted) {
    return {
      ...response(SOURCES.recalls, 'success', assisted.records, '식품안전나라 API 응답이 지연되어 최신 공식 원문 검색 결과를 보조 분석했습니다. 안전 보장이 아닌 원문 확인 보조 정보입니다.'),
      observedAt: assisted.analysis.analyzedAt,
      analysis: assisted.analysis,
    };
  }
  const cached = await recallFallback(query, lastError);
  if (cached) return cached;
  return response<RecallRecord[]>(SOURCES.recalls, 'unavailable', null, `${lastError} 잠시 후 다시 확인하세요.`);
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
    if (url.pathname === '/api/health') return json(response(SOURCES.marine, 'success', { marineConfigured: Boolean(env.DATA_GO_KR_SERVICE_KEY && env.MARINE_WATER_API_URL), busanMarineConfigured: Boolean(env.DATA_GO_KR_SERVICE_KEY), recallsConfigured: Boolean(env.FOOD_SAFETY_KOREA_API_KEY), geminiConfigured: Boolean(env.GEMINI_API_KEY), shellfishSource: SOURCES.shellfish.url, revision: 'official-source-assist-v2' }), request, env);
    if (url.pathname === '/api/marine-water') return json(await marine(request, env), request, env);
    if (url.pathname === '/api/busan-marine') return json(await busanMarine(env), request, env);
    if (url.pathname === '/api/recalls') return json(await recalls(request, env), request, env);
    if (url.pathname === '/api/shellfish-bulletin/latest') return json(await shellfish(), request, env);
    return new Response('Not Found', { status: 404, headers: corsHeaders(request, env) });
  },
};

export default worker;
