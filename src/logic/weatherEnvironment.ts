import type { RiskLevel } from '../types';
import type { WeatherObservation } from '../services/types';

export const WEATHER_ENVIRONMENT_RULES = {
  warmCelsius: 25,
  hotCelsius: 30,
  humidPercent: 70,
  veryHumidPercent: 80,
} as const;

export interface WeatherEnvironmentAssessment {
  level: RiskLevel;
  heatStep: 0 | 1 | 2;
  humidityStep: 0 | 1 | 2;
  totalSignals: number;
  headline: string;
  guidance: string;
  formula: string;
}

function step(value: number, cautionAt: number, highAt: number): 0 | 1 | 2 {
  if (value >= highAt) return 2;
  if (value >= cautionAt) return 1;
  return 0;
}

export function assessWeatherEnvironment(weather?: WeatherObservation | null): WeatherEnvironmentAssessment {
  if (!weather) {
    return {
      level: 'unknown', heatStep: 0, humidityStep: 0, totalSignals: 0,
      headline: '현재 날씨 확인 필요',
      guidance: '날씨 정보가 없으므로 구매 뒤 보냉·이동 시간을 직접 확인하세요.',
      formula: '기온·습도 정보 미확인',
    };
  }
  const heatStep = step(weather.temperature, WEATHER_ENVIRONMENT_RULES.warmCelsius, WEATHER_ENVIRONMENT_RULES.hotCelsius);
  const humidityStep = step(weather.relativeHumidity, WEATHER_ENVIRONMENT_RULES.humidPercent, WEATHER_ENVIRONMENT_RULES.veryHumidPercent);
  const totalSignals = heatStep + humidityStep;
  if (totalSignals >= 3) {
    return {
      level: 'danger', heatStep, humidityStep, totalSignals,
      headline: '강한 보냉 주의',
      guidance: '더운·습한 날입니다. 구매 후 바로 냉장·냉동하고 이동 시간을 최소화하세요.',
      formula: `기온 단계 ${heatStep} + 습도 단계 ${humidityStep} = ${totalSignals}`,
    };
  }
  if (totalSignals > 0) {
    return {
      level: 'caution', heatStep, humidityStep, totalSignals,
      headline: '보냉·이동 시간 확인',
      guidance: '구매 뒤 상온 노출을 줄이고 보냉 가방 또는 아이스팩 사용을 확인하세요.',
      formula: `기온 단계 ${heatStep} + 습도 단계 ${humidityStep} = ${totalSignals}`,
    };
  }
  return {
    level: 'safe', heatStep, humidityStep, totalSignals,
    headline: '일반 보냉 관리',
    guidance: '날씨와 관계없이 구매 후 가능한 빨리 냉장·냉동하세요.',
    formula: `기온 단계 0 + 습도 단계 0 = 0`,
  };
}
