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
const INFLUX_HOST  = process.env.INFLUXDB_URL;
const INFLUX_TOKEN = process.env.INFLUXDB_TOKEN;
const INFLUX_DB    = process.env.INFLUXDB_DATABASE;

const client = new InfluxDBClient({
    host: INFLUX_HOST,
    token: INFLUX_TOKEN,
    database: INFLUX_DB
});

const HA_URL   = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

// ── DEVICE REGISTRY — all 16 devices from Home Assistant ────
const DEVICES = {
    sams_workstation: {
        label    : "Sam's WorkStation",
        location : "Sam's WorkStation",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc',
            pm25        : 'sensor.sensorbox_tri_pms_particulate_matter_2_5_m_concentration'
        }
    },
    mulu_hall: {
        label    : "Mulu Hall",
        location : "Mulu Hall",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature_3',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity_3',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2_3',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc_3',
            pm25        : 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration_2'
        }
    },
    main_entrance: {
        label    : "Main Entrance",
        location : "Main Entrance",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature_2',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity_2',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2_2',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc_2',
            pm25        : 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration'
        }
    },
    cfo_office: {
        label    : "CFO's Office",
        location : "CFO's Office",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature_4',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity_4',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2_4',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc_4',
            pm25        : 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration_3'
        }
    },
    cto_office: {
        label    : "CTO's Office",
        location : "CTO's Office",
        entities : {
            temperature : 'sensor.cto_aht20_temperature',
            humidity    : 'sensor.cto_aht20_humidity',
            co2         : 'sensor.cto_scd40_co2',
            voc         : 'sensor.cto_sgp30_tvoc',
            pm25        : 'sensor.cto_pms_particulate_matter_2_5_m_concentration'
        }
    },
    santubong: {
        label    : "Santubong",
        location : "Santubong",
        entities : {
            temperature : 'sensor.sensorbox_tri_aht20_temperature',
            humidity    : 'sensor.sensorbox_tri_aht20_humidity',
            co2         : 'sensor.sensorbox_tri_scd40_co2',
            voc         : 'sensor.sensorbox_tri_sgp30_tvoc',
            pm25        : 'sensor.sensorbox_tri_pms_particulate_matter_2_5_m_concentration_2'
        }
    },
    admin_workstation1: {
        label    : "Admin's WorkStation 1",
        location : "Admin's WorkStation 1",
        entities : {
            temperature : 'sensor.admin_workstation1_aht20_temperature',
            humidity    : 'sensor.admin_workstation1_aht20_humidity',
            co2         : 'sensor.admin_workstation1_scd40_co2',
            voc         : 'sensor.admin_workstation1_sgp30_tvoc',
            pm25        : 'sensor.admin_workstation1_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation1: {
        label    : "Engineer's WorkStation 1",
        location : "Engineer's WorkStation 1",
        entities : {
            temperature : 'sensor.eng_workstation1_aht20_temperature',
            humidity    : 'sensor.eng_workstation1_aht20_humidity',
            co2         : 'sensor.eng_workstation1_scd40_co2',
            voc         : 'sensor.eng_workstation1_sgp30_tvoc',
            pm25        : 'sensor.eng_workstation1_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation2: {
        label    : "Engineer's WorkStation 2",
        location : "Engineer's WorkStation 2",
        entities : {
            temperature : 'sensor.eng_workstation2_aht20_temperature',
            humidity    : 'sensor.eng_workstation2_aht20_humidity',
            co2         : 'sensor.eng_workstation2_scd40_co2',
            voc         : 'sensor.eng_workstation2_sgp30_tvoc',
            pm25        : 'sensor.eng_workstation2_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation_mw1: {
        label    : "Engineer's WorkStation MW1",
        location : "Engineer's WorkStation MW1",
        entities : {
            temperature : 'sensor.eng_workstation_mw1_aht20_temperature',
            humidity    : 'sensor.eng_workstation_mw1_aht20_humidity',
            co2         : 'sensor.eng_workstation_mw1_scd40_co2',
            voc         : 'sensor.eng_workstation_mw1_sgp30_tvoc',
            pm25        : 'sensor.eng_workstation_mw1_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation_mw2: {
        label    : "Engineer's WorkStation MW2",
        location : "Engineer's WorkStation MW2",
        entities : {
            temperature : 'sensor.eng_workstation_mw2_aht20_temperature',
            humidity    : 'sensor.eng_workstation_mw2_aht20_humidity',
            co2         : 'sensor.eng_workstation_mw2_scd40_co2',
            voc         : 'sensor.eng_workstation_mw2_sgp30_tvoc',
            pm25        : 'sensor.eng_workstation_mw2_pms_particulate_matter_2_5_m_concentration'
        }
    },
    testing_lab_1: {
        label    : "Testing-Lab-1",
        location : "Testing-Lab-1",
        entities : {
            temperature : 'sensor.lab_aht20_temperature',
            humidity    : 'sensor.lab_aht20_humidity',
            co2         : 'sensor.lab_scd40_co2',
            voc         : 'sensor.lab_sgp30_tvoc',
            pm25        : 'sensor.lab_pms_particulate_matter_2_5_m_concentration'
        }
    },
    testing_lab_2: {
        label    : "Testing-Lab-2",
        location : "Testing-Lab-2",
        entities : {
            temperature : 'sensor.esphome_web_9277ea_aht20_temperature_5',
            humidity    : 'sensor.esphome_web_9277ea_aht20_humidity_5',
            co2         : 'sensor.esphome_web_9277ea_scd40_co2_5',
            voc         : 'sensor.esphome_web_9277ea_sgp30_tvoc_5',
            pm25        : 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration_4'
        }
    },
    training_room_1: {
        label    : "Training-Room-1",
        location : "Training-Room-1",
        entities : {
            temperature : 'sensor.training_room_aht20_temperature',
            humidity    : 'sensor.training_room_aht20_humidity',
            co2         : 'sensor.training_room_scd40_co2',
            voc         : 'sensor.training_room_sgp30_tvoc',
            pm25        : 'sensor.training_room_pms_particulate_matter_2_5_m_concentration'
        }
    },
    training_room_2: {
        label    : "Training-Room-2",
        location : "Training-Room-2",
        entities : {
            temperature : 'sensor.training_room_aht20_temperature_2',
            humidity    : 'sensor.training_room_aht20_humidity_2',
            co2         : 'sensor.training_room_scd40_co2_2',
            voc         : 'sensor.training_room_sgp30_tvoc_2',
            pm25        : 'sensor.training_room_pms_particulate_matter_2_5_m_concentration_2'
        }
    },
    ceo_office: {
        label    : "CEO's Office",
        location : "CEO's Office",
        entities : {
            temperature : 'sensor.ceo_aht20_temperature',
            humidity    : 'sensor.ceo_aht20_humidity',
            co2         : 'sensor.ceo_scd40_co2',
            voc         : 'sensor.ceo_sgp30_tvoc',
            pm25        : 'sensor.ceo_pms_particulate_matter_2_5_m_concentration'
        }
    }
};

// ── Helper — fetch one entity state from HA ─────────────────
async function fetchHAState(entityId) {
    const response = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` }
    });
    if (!response.ok) throw new Error(`HA returned ${response.status} for ${entityId}`);
    return response.json();
}

// ── Calculate AQI from PM2.5 ────────────────────────────────
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

// ── GET /api/devices ─────────────────────────────────────────
app.get('/api/devices', (req, res) => {
    const list = Object.entries(DEVICES).map(([id, d]) => ({
        id,
        label   : d.label,
        location: d.location
    }));
    res.json(list);
});

// ── GET /api/ha/latest?device=sams_workstation ───────────────
app.get('/api/ha/latest', async (req, res) => {
    const deviceId = req.query.device || 'sams_workstation';
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

// ── GET /api/ha/status?device=sams_workstation ───────────────
app.get('/api/ha/status', async (req, res) => {
    const deviceId = req.query.device || 'sams_workstation';
    const device   = DEVICES[deviceId];

    if (!device) {
        return res.status(400).json({ error: `Unknown device: ${deviceId}` });
    }

    try {
        const data        = await fetchHAState(device.entities.temperature);
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
        const deviceId = req.query.device || 'sams_workstation';
        const hours    = parseInt(req.query.hours) || 24;
        const query = `
        SELECT temperature, humidity, aqi, co2, voc, pm25, time
        FROM sensors
        WHERE device_id = '${deviceId}'
        AND time >= now() - INTERVAL '${hours} hours'
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
    console.log(`  GET /api/devices              — list all 16 devices`);
    console.log(`  GET /api/ha/latest?device=ID  — live sensor data`);
    console.log(`  GET /api/ha/status?device=ID  — device online status`);
    console.log(`  GET /api/latest               — InfluxDB latest`);
    console.log(`  GET /api/history              — InfluxDB 24h history`);
});