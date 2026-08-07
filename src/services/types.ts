export type ApiStatus = 'success' | 'unavailable' | 'error';
export interface OfficialSourceAnalysis {
  summary: string;
  sourceUrls: string[];
  analyzedAt: string;
}

export interface ApiSource {
  name: string;
  url: string;
}

export interface ApiResponse<T> {
  status: ApiStatus;
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

export interface WeatherObservation {
  temperature: number;
  relativeHumidity: number;
  observedAt: string;
}

export interface MarineForecastObservation {
  seaSurfaceTemperature?: number;
  waveHeight?: number;
  observedAt: string;
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

export interface RecallRecord {
  productName: string;
  companyName?: string;
  reason?: string;
  announcedAt?: string;
  region?: string;
  sourceUrl: string;
}

export interface ShellfishBulletin {
  title: string;
  publishedAt?: string;
  sourceUrl: string;
  summary: string;
  affectedAreas?: string[];
  confirmedRisk: boolean;
}

export interface RealtimeSnapshot {
  marine: ApiResponse<MarineWaterRecord[]>;
  recalls: ApiResponse<RecallRecord[]>;
  shellfish: ApiResponse<ShellfishBulletin>;
}

export type DataViewState = 'loading' | 'latest' | 'assisted' | 'stale' | 'no-data' | 'unavailable' | 'error' | 'manual-confirm';
