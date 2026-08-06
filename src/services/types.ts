export type ApiStatus = 'success' | 'unavailable' | 'error';

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

export type DataViewState = 'loading' | 'latest' | 'stale' | 'no-data' | 'unavailable' | 'error' | 'manual-confirm';
