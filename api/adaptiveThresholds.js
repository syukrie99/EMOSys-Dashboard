// adaptiveThresholds.js
// Computes statistical baselines (mean, stdDev, percentiles) per device + sensor
// from InfluxDB history,and derives suggested warn/danger thresholds
// Does not modify groupThresholds.json - read-only, suggestion-only for now

const SENSOR_COLUMNS = ['temperature', 'humidity', 'co2', 'voc', 'pm25'];

/**
 * Computes a rolling statistical baseline for one device + sensor field.
 * Uses hourly-averaged data (not raw rows) to stay under Influx 3 Core's
 * file-limit constraints even over multi-day windows.
 */
async function computeBaseline(client, database, deviceId, sensorField, days = 14) {
    if (!SENSOR_COLUMNS.includes(sensorField)) {
        throw new Error(`Unknown sensor field: ${sensorField}`);
    }

    const query = `
        SELECT date_bin(INTERVAL '1 hour', time) AS hour, AVG(${sensorField}) AS avg_val
        FROM sensors
        WHERE device_id = '${deviceId}'
        AND time >= now() - INTERVAL '${days} days'
        AND ${sensorField} IS NOT NULL
        GROUP BY hour
        ORDER BY hour
        `;

    const rows = [];
    const result = await client.query(query, database);
    for await (const row of result) rows.push(row);
    
    const vals = rows.map(r => parseFloat(r.avg_val)).filter(v => !isNaN(v));

    /* Require a minimum sample size before trusting a baseline -
        otherwise a device with 2 days of history could produce a wild suggestion */
    const MIN_SAMPLES = 24; //roughtly 1 day of hourly buckets
    if (vals.length < MIN_SAMPLES) {
        return { insufficient: true, sampleCount: vals.length, required: MIN_SAMPLES }
    }

    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const sorted = [...vals].sort((a, b) => a - b);
    const percentile = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

    return {
        insufficient: false,
        sampleCount: n,
        windowDays: days,
        mean: Number(mean.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        p95: Number(percentile(0.95).toFixed(2)),
        p99: Number(percentile(0.99).toFixed(2)),
        suggestedWarn: Number((mean + 2 * stdDev).toFixed(2)),
        suggestedDanger: Number((mean + 3 * stdDev).toFixed(2))
    };
}

/**
 * Computes baseline for all sensors for a single device
 */
async function computeDeviceBaselines(client, database, deviceId, days = 14) {
    const results = {};
    for (const field of SENSOR_COLUMNS) {
        try {
            results[field] = await computeBaseline(client, database, deviceId, field, days);
        } catch (e) {
            results[field] = { error: e.message };
            }
        }
        return results;
    }

    module.exports = { computeBaseline, computeDeviceBaselines, SENSOR_COLUMNS };