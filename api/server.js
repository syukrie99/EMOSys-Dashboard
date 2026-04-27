require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { InfluxDBClient } = require('@influxdata/influxdb3-client');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// ── InfluxDB config ─────────────────────────────────────────
const INFLUX_HOST  = 'http://localhost:8181';
const INFLUX_TOKEN = 'apiv3_aSkSo316S8chEPJ1WVVNr1q825S7coFZnpfAoKMI_xtMH66FIBgaWOhsZKmEhLtMp2LbRSCtKXNa6SIJiTJ1Fw';
const INFLUX_DB    = 'emosys';

const client = new InfluxDBClient({
    host: INFLUX_HOST,
    token: INFLUX_TOKEN,
    database: INFLUX_DB
});

const HA_URL   = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

// ── DEVICE REGISTRY ─────────────────────────────────────────
// Add or edit devices here. The key matches ?device= query param.
const DEVICES = {
    sensor_01: {
        label    : 'ESP32-EnvSensor-01',
        location : "Server Room A",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc',
            pm25        : 'sensor.sensorbox_tri_pms_particulate_matter_2_5_m_concentration'
        }
    },
    sensor_02: {
        label    : 'ESP32-EnvSensor-02',
        location : 'Office Floor 2',
        entities : {
            temperature : 'sensor.esphome_web_XXXXXX_aht20_temperature',   // <-- replace with real entity IDs
            humidity    : 'sensor.esphome_web_XXXXXX_aht20_humidity',
            co2         : 'sensor.esphome_web_XXXXXX_scd40_co2',
            voc         : 'sensor.esphome_web_XXXXXX_sgp30_tvoc',
            pm25        : 'sensor.esphome_web_XXXXXX_pm25_concentration'
        }
    }
};

// Helper — fetch one entity state from HA
async function fetchHAState(entityId) {
    const response = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` }
    });
    if (!response.ok) throw new Error(`HA returned ${response.status} for ${entityId}`);
    return response.json();
}

// Calculate AQI from PM2.5
function calcAQI(pm25) {
    const v = parseFloat(pm25);
    if (isNaN(v)) return null;
    if (v <= 12.0)  return Math.round((50  / 12.0)  * v);
    if (v <= 35.4)  return Math.round(((100 - 51)   / (35.4 - 12.1))  * (v - 12.1) + 51);
    if (v <= 55.4)  return Math.round(((150 - 101)  / (55.4 - 35.5))  * (v - 35.5) + 101);
    if (v <= 150.4) return Math.round(((200 - 151)  / (150.4 - 55.5)) * (v - 55.5) + 151);
    if (v <= 250.4) return Math.round(((300 - 201)  / (250.4 - 150.5))* (v - 150.5) + 201);
    return Math.round(((500 - 301) / (500.4 - 250.5)) * (v - 250.5) + 301);
}

// ── GET /api/ha/latest?device=sensor_01 ─────────────────────
app.get('/api/ha/latest', async (req, res) => {
    const deviceId = req.query.device || 'sensor_01';
    const device   = DEVICES[deviceId];

    if (!device) {
        return res.status(400).json({ error: `Unknown device: ${deviceId}` });
    }

    try {
        const [tempData, humData, co2Data, vocData, pm25Data] = await Promise.all([
            fetchHAState(device.entities.temperature),
            fetchHAState(device.entities.humidity),
            fetchHAState(device.entities.co2),
            fetchHAState(device.entities.voc),
            fetchHAState(device.entities.pm25)
        ]);

        const pm25Value = parseFloat(pm25Data.state);
        const aqi = calcAQI(pm25Value);

        res.json({
            temperature : parseFloat(tempData.state).toFixed(2),
            humidity    : parseFloat(humData.state).toFixed(2),
            co2         : parseFloat(co2Data.state).toFixed(1),
            voc         : parseFloat(vocData.state).toFixed(1),
            pm25        : pm25Value.toFixed(1),
            aqi         : aqi,
            device      : deviceId,
            location    : device.location,
            label       : device.label,
            time        : tempData.last_updated
        });
    } catch (err) {
        console.error('HA fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/ha/status?device=sensor_01 ─────────────────────
app.get('/api/ha/status', async (req, res) => {
    const deviceId = req.query.device || 'sensor_01';
    const device   = DEVICES[deviceId];

    if (!device) {
        return res.status(400).json({ error: `Unknown device: ${deviceId}` });
    }

    try {
        const data = await fetchHAState(device.entities.temperature);
        const lastUpdated = new Date(data.last_updated);
        const secondsAgo  = (Date.now() - lastUpdated.getTime()) / 1000;

        res.json({
            device      : deviceId,
            label       : device.label,
            location    : device.location,
            online      : secondsAgo < 120,
            last_seen   : data.last_updated,
            seconds_ago : Math.round(secondsAgo)
        });
    } catch (err) {
        console.error('HA status error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/devices ─────────────────────────────────────────
// Returns list of registered devices (useful for future dynamic dropdowns)
app.get('/api/devices', (req, res) => {
    const list = Object.entries(DEVICES).map(([id, d]) => ({
        id,
        label   : d.label,
        location: d.location
    }));
    res.json(list);
});

// ── InfluxDB endpoints ───────────────────────────────────────
app.get('/api/latest', async (req, res) => {
    try {
        const query = `
        SELECT temperature, humidity, aqi, co2, voc, location, time
        FROM sensors
        ORDER BY time DESC
        LIMIT 1
        `;
        const rows = [];
        const result = await client.query(query, INFLUX_DB);
        for await (const row of result) { rows.push(row); }
        if (rows.length === 0) return res.json({ error: 'No data found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const query = `
        SELECT temperature, humidity, aqi, co2, voc, time
        FROM sensors
        WHERE time >= now() - INTERVAL '24 hours'
        ORDER BY time ASC
        `;
        const rows = [];
        const result = await client.query(query, INFLUX_DB);
        for await (const row of result) { rows.push(row); }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EMOSys API is running' });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL    = 'admin@company.com';
    const ADMIN_PASSWORD = 'admin123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        res.json({
            token: 'emosys-session-token',
            user : { name: 'Admin', role: 'Administrator', email }
        });
    } else {
        res.status(401).json({ error: 'Invalid email or password.' });
    }
});

// ── Start server ─────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`EMOSys API running at http://localhost:${PORT}`);
    console.log(`  GET /api/health`);
    console.log(`  GET /api/devices`);
    console.log(`  GET /api/latest`);
    console.log(`  GET /api/history`);
    console.log(`  GET /api/ha/latest?device=sensor_01`);
    console.log(`  GET /api/ha/status?device=sensor_01`);
});require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { InfluxDBClient } = require('@influxdata/influxdb3-client');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
app.use(express.static(path.join(__dirname, '..')));

// ── InfluxDB config ─────────────────────────────────────────
const INFLUX_HOST  = 'http://localhost:8181';
const INFLUX_TOKEN = 'apiv3_aSkSo316S8chEPJ1WVVNr1q825S7coFZnpfAoKMI_xtMH66FIBgaWOhsZKmEhLtMp2LbRSCtKXNa6SIJiTJ1Fw';
const INFLUX_DB    = 'emosys';

const client = new InfluxDBClient({
    host: INFLUX_HOST,
    token: INFLUX_TOKEN,
    database: INFLUX_DB
});

const HA_URL   = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

// ── DEVICE REGISTRY ─────────────────────────────────────────
// Add or edit devices here. The key matches ?device= query param.
const DEVICES = {
    sensor_01: {
        label    : 'ESP32-EnvSensor-01',
        location : "Server Room A",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc',
            pm25        : 'sensor.sensorbox_tri_pms_particulate_matter_2_5_m_concentration'
        }
    },
    sensor_02: {
        label    : 'ESP32-EnvSensor-02',
        location : 'Office Floor 2',
        entities : {
            temperature : 'sensor.esphome_web_XXXXXX_aht20_temperature',   // <-- replace with real entity IDs
            humidity    : 'sensor.esphome_web_XXXXXX_aht20_humidity',
            co2         : 'sensor.esphome_web_XXXXXX_scd40_co2',
            voc         : 'sensor.esphome_web_XXXXXX_sgp30_tvoc',
            pm25        : 'sensor.esphome_web_XXXXXX_pm25_concentration'
        }
    }
};

// Helper — fetch one entity state from HA
async function fetchHAState(entityId) {
    const response = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` }
    });
    if (!response.ok) throw new Error(`HA returned ${response.status} for ${entityId}`);
    return response.json();
}

// Calculate AQI from PM2.5
function calcAQI(pm25) {
    const v = parseFloat(pm25);
    if (isNaN(v)) return null;
    if (v <= 12.0)  return Math.round((50  / 12.0)  * v);
    if (v <= 35.4)  return Math.round(((100 - 51)   / (35.4 - 12.1))  * (v - 12.1) + 51);
    if (v <= 55.4)  return Math.round(((150 - 101)  / (55.4 - 35.5))  * (v - 35.5) + 101);
    if (v <= 150.4) return Math.round(((200 - 151)  / (150.4 - 55.5)) * (v - 55.5) + 151);
    if (v <= 250.4) return Math.round(((300 - 201)  / (250.4 - 150.5))* (v - 150.5) + 201);
    return Math.round(((500 - 301) / (500.4 - 250.5)) * (v - 250.5) + 301);
}

// ── GET /api/ha/latest?device=sensor_01 ─────────────────────
app.get('/api/ha/latest', async (req, res) => {
    const deviceId = req.query.device || 'sensor_01';
    const device   = DEVICES[deviceId];

    if (!device) {
        return res.status(400).json({ error: `Unknown device: ${deviceId}` });
    }

    try {
        const [tempData, humData, co2Data, vocData, pm25Data] = await Promise.all([
            fetchHAState(device.entities.temperature),
            fetchHAState(device.entities.humidity),
            fetchHAState(device.entities.co2),
            fetchHAState(device.entities.voc),
            fetchHAState(device.entities.pm25)
        ]);

        const pm25Value = parseFloat(pm25Data.state);
        const aqi = calcAQI(pm25Value);

        res.json({
            temperature : parseFloat(tempData.state).toFixed(2),
            humidity    : parseFloat(humData.state).toFixed(2),
            co2         : parseFloat(co2Data.state).toFixed(1),
            voc         : parseFloat(vocData.state).toFixed(1),
            pm25        : pm25Value.toFixed(1),
            aqi         : aqi,
            device      : deviceId,
            location    : device.location,
            label       : device.label,
            time        : tempData.last_updated
        });
    } catch (err) {
        console.error('HA fetch error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/ha/status?device=sensor_01 ─────────────────────
app.get('/api/ha/status', async (req, res) => {
    const deviceId = req.query.device || 'sensor_01';
    const device   = DEVICES[deviceId];

    if (!device) {
        return res.status(400).json({ error: `Unknown device: ${deviceId}` });
    }

    try {
        const data = await fetchHAState(device.entities.temperature);
        const lastUpdated = new Date(data.last_updated);
        const secondsAgo  = (Date.now() - lastUpdated.getTime()) / 1000;

        res.json({
            device      : deviceId,
            label       : device.label,
            location    : device.location,
            online      : secondsAgo < 120,
            last_seen   : data.last_updated,
            seconds_ago : Math.round(secondsAgo)
        });
    } catch (err) {
        console.error('HA status error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/devices ─────────────────────────────────────────
// Returns list of registered devices (useful for future dynamic dropdowns)
app.get('/api/devices', (req, res) => {
    const list = Object.entries(DEVICES).map(([id, d]) => ({
        id,
        label   : d.label,
        location: d.location
    }));
    res.json(list);
});

// ── InfluxDB endpoints ───────────────────────────────────────
app.get('/api/latest', async (req, res) => {
    try {
        const query = `
        SELECT temperature, humidity, aqi, co2, voc, location, time
        FROM sensors
        ORDER BY time DESC
        LIMIT 1
        `;
        const rows = [];
        const result = await client.query(query, INFLUX_DB);
        for await (const row of result) { rows.push(row); }
        if (rows.length === 0) return res.json({ error: 'No data found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const query = `
        SELECT temperature, humidity, aqi, co2, voc, time
        FROM sensors
        WHERE time >= now() - INTERVAL '24 hours'
        ORDER BY time ASC
        `;
        const rows = [];
        const result = await client.query(query, INFLUX_DB);
        for await (const row of result) { rows.push(row); }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EMOSys API is running' });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAIL    = 'admin@company.com';
    const ADMIN_PASSWORD = 'admin123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        res.json({
            token: 'emosys-session-token',
            user : { name: 'Admin', role: 'Administrator', email }
        });
    } else {
        res.status(401).json({ error: 'Invalid email or password.' });
    }
});

// ── Start server ─────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`EMOSys API running at http://localhost:${PORT}`);
    console.log(`  GET /api/health`);
    console.log(`  GET /api/devices`);
    console.log(`  GET /api/latest`);
    console.log(`  GET /api/history`);
    console.log(`  GET /api/ha/latest?device=sensor_01`);
    console.log(`  GET /api/ha/status?device=sensor_01`);
});