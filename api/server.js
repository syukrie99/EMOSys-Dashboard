require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { InfluxDBClient } = require('@influxdata/influxdb3-client');
const emailAlerts = require('./emailAlerts');

const app = express();
app.use(cors());
app.use(express.json());

const path = require('path');
const fs = require('fs');
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

// GROUP DEFINITIONS
// Defines which devices belong to which room group
// Device assignments are fixed here for now
// Future: load from groups.json to allow editing via UI
const GROUPS = {
    mainoffice: {
        label : 'Main Office',
        devices: [
            'admin_workstation1',
            'eng_workstation1',
            'eng_workstation2',
            'main_entrance'
        ]
    },
    management: {
        label: 'C-Suite Office',
        devices: [
            'ceo_office',
            'cto_office',
            'cfo_office'
        ]
    },
    hall: {
        label: 'Hall',
        devices: [
            'mulu_hall'
        ]
    },
    lab: {
        label: 'Laboratory',
        devices: [
            'testing_lab_1',
            'testing_lab_2'
        ]
    },
    training: {
        label: 'Training Room',
        devices: [
            'training_room_1',
            'training_room_2'
        ]
    },
    meeting: {
        label: 'Meeting Room',
        devices: [
            'santubong'
        ]
    },
    murud: {
        label: 'Murud Wing',
        devices: [
            'sams_workstation',
            'eng_workstation_mw1',
            'eng_workstation_mw2'
        ]
    }
};
// DEFAULT THRESHOLDS PER GROUP
// Each group has its own warn and danger levels per sensor
// These are the factory default. Can be override via UI later on
const DEFAULT_GROUP_THRESHOLDS = {
    mainoffice: {
        temp: { warn: 28,  danger: 35  },
        hum : { warn: 65,  danger: 80  },
        pm25: { warn: 15,  danger: 30  },
        co2 : { warn: 800, danger: 1200},
        voc : { warn: 300, danger: 600 }
    },
    management: {
        temp: { warn: 26,  danger: 32  },
        hum : { warn: 60,  danger: 75  },
        pm25: { warn: 12,  danger: 25  },
        co2 : { warn: 700, danger: 1000},
        voc : { warn: 250, danger: 500 } 
    },
    hall : {
        temp: { warn: 28,  danger: 35  },
        hum : { warn: 65,  danger: 80  },
        pm25: { warn: 15,  danger: 30  },
        co2 : { warn: 800, danger: 1200},
        voc : { warn: 300, danger: 600 }
    },
    lab : {
        temp: { warn: 25,  danger: 30  },
        hum : { warn: 60,  danger: 70  },
        pm25: { warn: 10,  danger: 20  },
        co2 : { warn: 900, danger: 1000},
        voc : { warn: 200, danger: 400 }
    },
    training : {
        temp: { warn: 28,  danger: 35  },
        hum : { warn: 65,  danger: 80  },
        pm25: { warn: 15,  danger: 30  },
        co2 : { warn: 900, danger: 1400},
        voc : { warn: 300, danger: 600 }
    },
    meeting : {
        temp: { warn: 28,  danger: 35  },
        hum : { warn: 65,  danger: 80  },
        pm25: { warn: 15,  danger: 30  },
        co2 : { warn: 800, danger: 1200},
        voc : { warn: 300, danger: 600 }
    },
    murud: {
        temp: { warn: 28,  danger: 35  },
        hum : { warn: 65,  danger: 80  },
        pm25: { warn: 15,  danger: 30  },
        co2 : { warn: 800, danger: 1200},
        voc : { warn: 300, danger: 600 }
    },
};

// LOAD SAVED GROUP THRESHOLDS
// On startup, read groupThreshilds.json if it exists
// If not, use defaults. Admin saves via POST /api/groups/thresholds
const THRESHOLDS_FILE = path.join(__dirname, 'groupThresholds.json');
let groupThresholds = JSON.parse(JSON.stringify(DEFAULT_GROUP_THRESHOLDS));

try {
    if (fs.existsSync(THRESHOLDS_FILE)) {
        const saved = JSON.parse(fs.readFileSync(THRESHOLDS_FILE, 'utf8'));
        Object.keys(DEFAULT_GROUP_THRESHOLDS).forEach(gid => {
            if (saved[gid]) groupThresholds[gid] = saved[gid];
        });
        console.log('[EMOSys] Group thresholds loaded from groupThresholds.json');
    } else {
        console.log('[EMOSys] No saved group thresholds found, using defaults');
    }
} catch (e) {
    console.warn('[EMOSys] Could not load group thresholds, using defaults: ', e.message);
}

// HELPER: get group ID for a device
function getDeviceGroup(deviceId) {
    for (const [gid, group] of Object.entries(GROUPS)) {
        if(group.devices.includes(deviceId)) return gid;
    }
    return null;
}

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

        const sensorValues = {
            temp : parseFloat(tempData.state),
            hum  : parseFloat(humData.state),
            co2  : parseFloat(co2Data.state),
            voc  : parseFloat(vocData.state),
            pm25 : pm25Value
        };

        const groupId = getDeviceGroup(deviceId);
        const groupThr = groupId ? groupThresholds[groupId] : null;
        emailAlerts.checkAndSendAlerts(
            sensorValues,
            deviceId,
            device.label,
            device.location,
            groupThr
        ).catch(err => console.error('[Alert] Check failed: ', err));

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

// // ── POST /api/ai/chat ─────────────────────────────────────────
app.post('/api/ai/chat', async (req, res) => {
    const { messages, system } = req.body;

    const geminiMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    const callGemini = async (model) => {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: system }] },
                    contents: geminiMessages,
                    generationConfig: { maxOutputTokens: 1000 }
                })
            }
        );
        return response.json();
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    try {
        let data;
        let text = null;

        /* Try gemini-3.1-flash-lite-preview up to 3 times */
        for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Gemini attempt ${attempt}...`);
            data = await callGemini('gemini-3.1-flash-lite-preview');

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = data.candidates[0].content.parts[0].text;
                break;
            }

            const isOverloaded = data.error?.message?.includes('high demand') ||
                                 data.error?.message?.includes('overloaded') ||
                                 data.error?.status === 'RESOURCE_EXHAUSTED';

            if (isOverloaded && attempt < 3) {
                console.log(`Overloaded, waiting ${attempt * 2}s...`);
                await sleep(attempt * 2000);
                continue;
            }

            break;
        }

        /* Fallback to gemini-3-flash-preview if still no response */
        if (!text) {
            console.log('Falling back to gemini-3-flash-preview...');
            data = await callGemini('gemini-3-flash-preview');
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = data.candidates[0].content.parts[0].text;
            }
        }

        /* Handle error states */
        if (!text) {
            if (data.candidates?.[0]?.finishReason === 'SAFETY') {
                text = 'Response blocked by safety filter. Please rephrase your question.';
            } else if (data.error) {
                text = `AI is currently busy. Please try again in a moment. (${data.error.message})`;
            } else {
                text = 'AI did not return a response. Please try again.';
            }
        }

        res.json({ content: [{ type: 'text', text }] });

    } catch (err) {
        console.error('Gemini proxy error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/alerts/active', (req, res) => {
    res.json(emailAlerts.getActiveAlerts());
});

app.get('/api/alerts/history', (req, res) => {
    res.json(emailAlerts.getAlertHistory());
});

app.get('/api/alerts/config', (req, res) => {
    res.json(emailAlerts.getConfig());
});

app.post('/api/alerts/config', (req, res) => {
    try {
        emailAlerts.updateConfig(req.body);
        res.json({ ok: true, message: 'Config updated' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/alerts/thresholds', (req, res) => {
    try {
        emailAlerts.updateThresholds(req.body);
        res.json({ ok: true, message: 'Thresholds updated' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/alerts/test', async (req, res) => {
    try{
        const to = req.body.to;
        if (!to || !to.length) return res.status(400).json({ error: 'No recipient provided' });
        await emailAlerts.sendTestEmail(to);
        res.json({ ok:true, message: `Test email sent to ${to.join(', ')}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET /api/groups ──────────────────────────────────────────
// Returns all group definitions with their current thresholds.
// Used by Analytics, Alerts, and Dashboard pages.
app.get('/api/groups', (req, res) => {
  const result = Object.entries(GROUPS).map(([id, g]) => ({
    id,
    label       : g.label,
    deviceCount : g.devices.length,
    devices     : g.devices,
    thresholds  : groupThresholds[id] || DEFAULT_GROUP_THRESHOLDS[id]
  }));
  res.json(result);
});

// ── GET /api/groups/:id ──────────────────────────────────────
// Returns a single group with thresholds.
app.get('/api/groups/:id', (req, res) => {
  const gid = req.params.id;
  const g   = GROUPS[gid];
  if (!g) return res.status(404).json({ error: `Unknown group: ${gid}` });
  res.json({
    id         : gid,
    label      : g.label,
    deviceCount: g.devices.length,
    devices    : g.devices,
    thresholds : groupThresholds[gid] || DEFAULT_GROUP_THRESHOLDS[gid]
  });
});

// ── POST /api/groups/thresholds ──────────────────────────────
// Saves updated thresholds for one or more groups.
// Body: { workstations: { temp: { warn: 28, danger: 35 }, ... }, ... }
// Persists to groupThresholds.json so changes survive restarts.
app.post('/api/groups/thresholds', (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    Object.keys(updates).forEach(gid => {
      if (!groupThresholds[gid]) return;
      const groupUpdate = updates[gid];
      Object.keys(groupUpdate).forEach(sensor => {
        if (!groupThresholds[gid][sensor]) return;
        const u = groupUpdate[sensor];
        if (u.warn   !== undefined) groupThresholds[gid][sensor].warn   = parseFloat(u.warn);
        if (u.danger !== undefined) groupThresholds[gid][sensor].danger = parseFloat(u.danger);
      });
    });
    fs.writeFileSync(THRESHOLDS_FILE, JSON.stringify(groupThresholds, null, 2));
    emailAlerts.updateGroupThresholds(groupThresholds);
    console.log('[EMOSys] Group thresholds saved to file');
    res.json({ ok: true, message: 'Group thresholds saved successfully' });
  } catch (e) {
    console.error('[EMOSys] Failed to save group thresholds:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/groups/thresholds/defaults ─────────────────────
// Returns the factory default thresholds for all groups.
// Used by the Alerts UI reset button.
app.get('/api/groups/thresholds/defaults', (req, res) => {
  res.json(DEFAULT_GROUP_THRESHOLDS);
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