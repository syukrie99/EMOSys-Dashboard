// adaptiveThresholds.js
// Computes statistical baselines (mean, stdDev, percentiles) per group + sensor
// from InfluxDB history, and derives suggested warn/danger thresholds.
// Does not modify groupThresholds.json — read-only, suggestion-only for now.

const SENSOR_COLUMNS = ['temperature', 'humidity', 'co2', 'voc', 'pm25'];

/* Maps InfluxDB column names to the keys used in groupThresholds.json,
   so suggested output can slot directly next to current thresholds. */
const FIELD_TO_KEY = {
    temperature: 'temp',
    humidity:    'hum',
    co2:         'co2',
    voc:         'voc',
    pm25:        'pm25'
};

/**
 * Fetches hourly-averaged values for one device + sensor field, in small
 * time chunks (default 2 days) to stay under Influx 3 Core's parquet
 * file-limit. Aggregation alone doesn't reduce file-scan cost for the
 * WHERE clause, so a large single-range query still hits the limit.
 */
async function fetchHourlyVals(client, database, deviceId, sensorField, days = 14, chunkDays = 2) {
    const vals = [];
    let remaining = days;
    let offset = 0;

    while (remaining > 0) {
        const span = Math.min(chunkDays, remaining);
        const query = `
            SELECT date_bin(INTERVAL '1 hour', time) AS hour, AVG(${sensorField}) AS avg_val
            FROM sensors
            WHERE device_id = '${deviceId}'
            AND time >= now() - INTERVAL '${offset + span} days'
            AND time <  now() - INTERVAL '${offset} days'
            AND ${sensorField} IS NOT NULL
            GROUP BY hour
            ORDER BY hour
        `;
        try {
            const result = await client.query(query, database);
            for await (const row of result) {
                const v = parseFloat(row.avg_val);
                if (!isNaN(v)) vals.push(v);
            }
        } catch (e) {
            console.warn(`[AdaptiveThresholds] Chunk failed (offset=${offset}, span=${span}) for ${deviceId}/${sensorField}: ${e.message}`);
        }

        offset += span;
        remaining -= span;
    }

    return vals;
}

/**
 * Computes mean, stdDev, percentiles and suggested thresholds from a
 * flat array of hourly-averaged sensor values.
 */
function computeStats(vals, days) {
    const MIN_SAMPLES = 24; // roughly 1 day of hourly buckets

    if (vals.length < MIN_SAMPLES) {
        return { insufficient: true, sampleCount: vals.length, required: MIN_SAMPLES };
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
 * Computes a baseline for one device + sensor field (used for
 * single-device diagnostics).
 */
async function computeBaseline(client, database, deviceId, sensorField, days = 14) {
    if (!SENSOR_COLUMNS.includes(sensorField)) {
        throw new Error(`Unknown sensor field: ${sensorField}`);
    }
    const vals = await fetchHourlyVals(client, database, deviceId, sensorField, days);
    return computeStats(vals, days);
}

/**
 * Computes baselines for all sensors for a single device.
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

/**
 * Computes a pooled baseline across every device in a group, for all
 * sensors. Readings from all devices in the group are combined before
 * computing statistics, giving a larger, room-type-level sample rather
 * than one device's individual pattern.
 * `group` must have a `.devices` array of device IDs.
 * Returns an object keyed by threshold field names (temp/hum/co2/voc/pm25)
 * matching the shape of groupThresholds.json.
 */
async function computeGroupBaseline(client, database, group, days = 14) {
    const suggested = {};

    for (const field of SENSOR_COLUMNS) {
        const key = FIELD_TO_KEY[field];
        try {
            let pooled = [];
            for (const deviceId of group.devices) {
                const vals = await fetchHourlyVals(client, database, deviceId, field, days);
                pooled = pooled.concat(vals);
            }
            suggested[key] = computeStats(pooled, days);
        } catch (e) {
            suggested[key] = { error: e.message };
        }
    }

    return suggested;
}

module.exports = {
    computeBaseline,
    computeDeviceBaselines,
    computeGroupBaseline,
    SENSOR_COLUMNS
};