const express = require('express');
const cors = require('cors');
const { InfluxDBClient } = require('@influxdata/influxdb3-client');

const app = express();
app.use(cors());
app.use(express.json());

const INFLUX_HOST = 'http://localhost:8181';
const INFLUX_TOKEN = 'apiv3_aSkSo316S8chEPJ1WVVNr1q825S7coFZnpfAoKMI_xtMH66FIBgaWOhsZKmEhLtMp2LbRSCtKXNa6SIJiTJ1Fw';
const INFLUX_DB = 'emosys';

const client = new InfluxDBClient({
    host: INFLUX_HOST,
    token: INFLUX_TOKEN,
    database: INFLUX_DB
});

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
        for await (const row of result) {
            rows.push(row);
        }
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
        for await (const row of result) {
            rows.push(row);
        }
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

    // Hardcoded admin credentials
    const ADMIN_EMAIL = 'admin@company.com';
    const ADMIN_PASSWORD = 'admin123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        res.json({
            token: 'emosys-session-token',
            user: {
                name: 'Admin',
                role: 'Administrator',
                email: email
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid email or password. '});
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`EMOSys API running at http://localhost:${PORT}`);
    console.log(`Endpoints:`);
    console.log(`   GET http://localhost:${PORT}/api/health`);
    console.log(`   GET http://localhost:${PORT}/api/latest`);
    console.log(`   GET http://localhost:${PORT}/api/history`);
});