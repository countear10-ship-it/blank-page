import { describe, expect, it } from 'vitest';
import { assessWeatherEnvironment } from './weatherEnvironment';

describe('assessWeatherEnvironment', () => {
  it('uses temperature and humidity steps transparently', () => {
    expect(assessWeatherEnvironment({ temperature: 31, relativeHumidity: 82, observedAt: '2026-08-07T09:00' }))
      .toMatchObject({ level: 'danger', heatStep: 2, humidityStep: 2, totalSignals: 4 });
  });

  it('marks one or two weather signals as a cooling reminder', () => {
    expect(assessWeatherEnvironment({ temperature: 26, relativeHumidity: 72, observedAt: '2026-08-07T09:00' }))
      .toMatchObject({ level: 'caution', totalSignals: 2 });
  });

  it('does not make a safety conclusion when weather is absent', () => {
    expect(assessWeatherEnvironment(null)).toMatchObject({ level: 'unknown' });
  });
});
