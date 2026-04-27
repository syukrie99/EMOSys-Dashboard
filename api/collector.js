require('dotenv').config();
const { InfluxDBClient } = require('@influxdata/influxdb3-client');

const INFLUX_HOST = process.env.INFLUXDB_URL;
const INFLUX_TOKEN = process.env.INFLUXDB_TOKEN;
const INFLUX_DB = process.env.INFLUXDB_DATABASE;
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

const client = new InfluxDBClient({
    host: INFLUX_HOST,
    token: INFLUX_TOKEN,
    database: INFLUX_DB
});

const DEVICES = {
    sams_workstation: {
        label: "Sams_WorkStation",
        entities: {
            temperature: 'sensor.esphome_web_9277ea_aht20_temperature',
            humidity: 'sensor.esphome_web_9277ea_aht20_humidity',
            co2: 'sensor.esphome_web_9277ea_scd40_co2',
            voc: 'sensor.esphome_web_9277ea_sgp30_tvoc',
            pm25: 'sensor.sensorbox_tri_pms_particulate_matter_2_5_m_concentration'
        }
    },
    mulu_hall: {
        label: "Mulu_Hall",
        entities: {
            temperature: 'sensor.esphome_web_9277ea_aht20_temperature_3',
            humidity: 'sensor.esphome_web_9277ea_aht20_humidity_3',
            co2: 'sensor.esphome_web_9277ea_scd40_co2_3',
            voc: 'sensor.esphome_web_9277ea_sgp30_tvoc_3',
            pm25: 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration_2'
        }
    },
    main_entrance: {
        label: "Main_Entrance",
        entities: {
            temperature: 'sensor.esphome_web_9277ea_aht20_temperature_2',
            humidity: 'sensor.esphome_web_9277ea_aht20_humidity_2',
            co2: 'sensor.esphome_web_9277ea_scd40_co2_2',
            voc: 'sensor.esphome_web_9277ea_sgp30_tvoc_2',
            pm25: 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration'
        }
    },
    cfo_office: {
        label: "CFOs_Office",
        entities: {
            temperature: 'sensor.esphome_web_9277ea_aht20_temperature_4',
            humidity: 'sensor.esphome_web_9277ea_aht20_humidity_4',
            co2: 'sensor.esphome_web_9277ea_scd40_co2_4',
            voc: 'sensor.esphome_web_9277ea_sgp30_tvoc_4',
            pm25: 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration_3'
        }
    },
    cto_office: {
        label: "CTOs_Office",
        entities: {
            temperature: 'sensor.cto_aht20_temperature',
            humidity: 'sensor.cto_aht20_humidity',
            co2: 'sensor.cto_scd40_co2',
            voc: 'sensor.cto_sgp30_tvoc',
            pm25: 'sensor.cto_pms_particulate_matter_2_5_m_concentration'
        }
    },
    santubong: {
        label: "Santubong",
        entities: {
            temperature: 'sensor.sensorbox_tri_aht20_temperature',
            humidity: 'sensor.sensorbox_tri_aht20_humidity',
            co2: 'sensor.sensorbox_tri_scd40_co2',
            voc: 'sensor.sensorbox_tri_sgp30_tvoc',
            pm25: 'sensor.sensorbox_tri_pms_particulate_matter_2_5_m_concentration_2'
        }
    },
    admin_workstation1: {
        label: "Admins_WorkStation_1",
        entities: {
            temperature: 'sensor.admin_workstation1_aht20_temperature',
            humidity: 'sensor.admin_workstation1_aht20_humidity',
            co2: 'sensor.admin_workstation1_scd40_co2',
            voc: 'sensor.admin_workstation1_sgp30_tvoc',
            pm25: 'sensor.admin_workstation1_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation1: {
        label: "Engineers_WorkStation_1",
        entities: {
            temperature: 'sensor.eng_workstation1_aht20_temperature',
            humidity: 'sensor.eng_workstation1_aht20_humidity',
            co2: 'sensor.eng_workstation1_scd40_co2',
            voc: 'sensor.eng_workstation1_sgp30_tvoc',
            pm25: 'sensor.eng_workstation1_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation2: {
        label: "Engineers_WorkStation_2",
        entities: {
            temperature: 'sensor.eng_workstation2_aht20_temperature',
            humidity: 'sensor.eng_workstation2_aht20_humidity',
            co2: 'sensor.eng_workstation2_scd40_co2',
            voc: 'sensor.eng_workstation2_sgp30_tvoc',
            pm25: 'sensor.eng_workstation2_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation_mw1: {
        label: "Engineers_WorkStation_MW1",
        entities: {
            temperature: 'sensor.eng_workstation_mw1_aht20_temperature',
            humidity: 'sensor.eng_workstation_mw1_aht20_humidity',
            co2: 'sensor.eng_workstation_mw1_scd40_co2',
            voc: 'sensor.eng_workstation_mw1_sgp30_tvoc',
            pm25: 'sensor.eng_workstation_mw1_pms_particulate_matter_2_5_m_concentration'
        }
    },
    eng_workstation_mw2: {
        label: "Engineers_WorkStation_MW2",
        entities: {
            temperature: 'sensor.eng_workstation_mw2_aht20_temperature',
            humidity: 'sensor.eng_workstation_mw2_aht20_humidity',
            co2: 'sensor.eng_workstation_mw2_scd40_co2',
            voc: 'sensor.eng_workstation_mw2_sgp30_tvoc',
            pm25: 'sensor.eng_workstation_mw2_pms_particulate_matter_2_5_m_concentration'
        }
    },
    testing_lab_1: {
        label: "Testing_Lab_1",
        entities: {
            temperature: 'sensor.lab_aht20_temperature',
            humidity: 'sensor.lab_aht20_humidity',
            co2: 'sensor.lab_scd40_co2',
            voc: 'sensor.lab_sgp30_tvoc',
            pm25: 'sensor.lab_pms_particulate_matter_2_5_m_concentration'
        }
    },
    testing_lab_2: {
        label: "Testing_Lab_2",
        entities: {
            temperature: 'sensor.esphome_web_9277ea_aht20_temperature_5',
            humidity: 'sensor.esphome_web_9277ea_aht20_humidity_5',
            co2: 'sensor.esphome_web_9277ea_scd40_co2_5',
            voc: 'sensor.esphome_web_9277ea_sgp30_tvoc_5',
            pm25: 'sensor.esphome_web_9277ea_pms_particulate_matter_2_5_m_concentration_4'
        }
    },
    training_room_1: {
        label: "Training_Room_1",
        entities: {
            temperature: 'sensor.training_room_aht20_temperature',
            humidity: 'sensor.training_room_aht20_humidity',
            co2: 'sensor.training_room_scd40_co2',
            voc: 'sensor.training_room_sgp30_tvoc',
            pm25: 'sensor.training_room_pms_particulate_matter_2_5_m_concentration'
        }
    },
    training_room_2: {
        label: "Training_Room_2",
        entities: {
            temperature: 'sensor.training_room_aht20_temperature_2',
            humidity: 'sensor.training_room_aht20_humidity_2',
            co2: 'sensor.training_room_scd40_co2_2',
            voc: 'sensor.training_room_sgp30_tvoc_2',
            pm25: 'sensor.training_room_pms_particulate_matter_2_5_m_concentration_2'
        }
    },
    ceo_office: {
        label: "CEOs_Office",
        entities: {
            temperature: 'sensor.ceo_aht20_temperature',
            humidity: 'sensor.ceo_aht20_humidity',
            co2: 'sensor.ceo_scd40_co2',
            voc: 'sensor.ceo_sgp30_tvoc',
            pm25: 'sensor.ceo_pms_particulate_matter_2_5_m_concentration'
        }
    }
};

function calcAQI(pm25) {
    const v = parseFloat(pm25);
    if (isNaN(v)) return 0;
    if (v <= 12.0)  return Math.round((50 / 12.0) * v);
    if (v <= 35.4)  return Math.round(((100 - 51)   / (35.4 - 12.1))  * (v - 12.1) + 51);
    if (v <= 55.4)  return Math.round(((150 - 101)  / (55.4 - 35.5))  * (v - 35.5) + 101);
    if (v <= 150.4) return Math.round(((200 - 151)  / (150.4 - 55.5)) * (v - 55.5) + 151);
    if (v <= 250.4) return Math.round(((300 - 201)  / (250.4 - 150.5)) * (v - 150.5) + 201);
    return Math.round(((500 - 301) / (500.4 - 250.5)) * (v - 250.5) + 301);
}

async function fetchHAState(entityId) {
    const res = await fetch(`${HA_URL}/api/states/${entityId}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` }
    });
    if (!res.ok) throw new Error(`HA ${res.status} for ${entityId}`);
    return res.json();
}

async function collectDevice(deviceId, device) {
    try {
        const [tempData, humData, co2Data, vocData, pm25Data] = await Promise.all([
            fetchHAState(device.entities.temperature),
            fetchHAState(device.entities.humidity),
            fetchHAState(device.entities.co2),
            fetchHAState(device.entities.voc),
            fetchHAState(device.entities.pm25)
        ]);

        const temperature = parseFloat(tempData.state);
        const humidity    = parseFloat(humData.state);
        const co2         = parseFloat(co2Data.state);
        const voc         = parseFloat(vocData.state);
        const pm25        = parseFloat(pm25Data.state);
        const aqi         = calcAQI(pm25);

        if ([temperature, humidity, co2, voc, pm25].some(isNaN)) {
            console.warn(`[${deviceId}] Skipping — NaN value detected`);
            return;
        }

        // Line protocol: tags have no spaces, fields are numeric
        const line = `sensors,device_id=${deviceId},location=${device.label} temperature=${temperature},humidity=${humidity},co2=${co2},voc=${voc},pm25=${pm25},aqi=${aqi}i`;

        await client.write(line, INFLUX_DB);
        console.log(`[${new Date().toISOString()}] OK ${device.label} — T:${temperature} H:${humidity} CO2:${co2} VOC:${voc} PM2.5:${pm25} AQI:${aqi}`);

    } catch (err) {
        console.error(`[${deviceId}] Error: ${err.message}`);
    }
}

async function collectAll() {
    console.log(`\n[${new Date().toISOString()}] Collecting ${Object.keys(DEVICES).length} devices...`);
    await Promise.all(Object.entries(DEVICES).map(([id, dev]) => collectDevice(id, dev)));
    console.log(`[${new Date().toISOString()}] Done.`);
}

collectAll();
setInterval(collectAll, 30000);

console.log('EMOSys Collector started — writing to InfluxDB every 30s');