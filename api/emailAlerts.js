const nodemailer = require('nodemailer');
require('dotenv').config();

/* CONFIG  (reads from .env, with safe defaults) */
let config = {
  enabled:      process.env.EMAIL_ENABLED !== 'false',
  from:         process.env.EMAIL_FROM    || '',
  to:           (process.env.EMAIL_TO     || '').split(',').map(s => s.trim()).filter(Boolean),
  password:     process.env.EMAIL_PASS    || '',
  cooldownMins: parseInt(process.env.EMAIL_COOLDOWN_MINS) || 5,
  criticalOnly: false
};

/* THRESHOLDS  (keep in sync with frontend) */
let thresholds = {
  temp: { warn: 29,   danger: 35,   unit: '°C',  label: 'Temperature' },
  hum:  { warn: 70,   danger: 80,   unit: '%RH', label: 'Humidity' },
  pm25: { warn: 15,   danger: 30,   unit: '',    label: 'PM2.5 / AQI' },
  co2:  { warn: 800, danger: 1200, unit: ' ppm',label: 'CO₂' },
  voc:  { warn: 300,  danger: 600, unit: ' ppb',label: 'VOC' }
};

/* IN-MEMORY STATE */
/* cooldownMap: key = `${deviceId}_${sensor}` → timestamp of last email sent */
const cooldownMap  = new Map();
/* alertLog: array of alert objects (last 100) */
const alertLog     = [];

/* TRANSPORTER  (created lazily so bad config doesn't crash the whole server on startup) */
let _transporter = null;

function getTransporter() {
  if (!config.from || !config.password) {
    throw new Error('EMAIL_FROM or EMAIL_PASS not set in .env');
  }
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   465,
      secure: true,   // SSL
      auth: {
        user: config.from,
        pass: config.password   // Gmail App Password (16-char, spaces ok)
      }
    });
  }
  return _transporter;
}

/* Reset transporter when config changes */
function resetTransporter() { _transporter = null; }

/* COOLDOWN LOGIC */
function isCooledDown(deviceId, sensor) {
  const key  = `${deviceId}_${sensor}`;
  const last = cooldownMap.get(key);
  if (!last) return true;
  return (Date.now() - last) >= config.cooldownMins * 60 * 1000;
}

function markSent(deviceId, sensor) {
  cooldownMap.set(`${deviceId}_${sensor}`, Date.now());
}

/* SEVERITY HELPER */
function getSeverity(sensor, value, customThresholds = null) {
  const t = customThresholds ? customThresholds[sensor] : thresholds[sensor];
  if (!t || value == null || isNaN(value)) return null;
  if (value >= t.danger) return 'critical';
  if (value >= t.warn)   return 'warning';
  return null;
}

/* HTML EMAIL TEMPLATE */
function buildEmailHTML(alerts, deviceName, location) {
  const isCritical = alerts.some(a => a.severity === 'critical');
  const accentColor = isCritical ? '#ef4444' : '#f59e0b';
  const badgeColor  = isCritical ? '#fca5a5' : '#fcd34d';
  const bgAccent    = isCritical ? '#7f1d1d' : '#78350f';

  const sensorRows = alerts.map(a => {
    const thr = thresholds[a.sensor];
    const over = thr
      ? ((a.value - (a.severity === 'critical' ? thr.danger : thr.warn)) /
         (a.severity === 'critical' ? thr.danger : thr.warn) * 100).toFixed(1)
      : '—';
    const rowColor = a.severity === 'critical' ? '#fca5a5' : '#fcd34d';
    return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;font-weight:600;color:#e2e8f0">${thr?.label || a.sensor.toUpperCase()}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;font-family:monospace;font-size:1.05rem;font-weight:700;color:${rowColor}">${Number(a.value).toFixed(1)}${thr?.unit || ''}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:#94a3b8">${a.severity === 'critical' ? thr?.danger : thr?.warn}${thr?.unit || ''}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b;color:${rowColor};font-weight:700">+${over}%</td>
        <td style="padding:10px 14px;border-bottom:1px solid #1e293b">
          <span style="background:${a.severity==='critical'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'};color:${rowColor};padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;text-transform:uppercase">
            ${a.severity}
          </span>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>EMOSys Alert</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Arial,sans-serif">

  <div style="max-width:600px;margin:32px auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,${bgAccent} 0%,#0f172a 60%);padding:28px 32px;border-bottom:1px solid #1e293b">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:10px;height:10px;border-radius:50%;background:${accentColor};box-shadow:0 0 8px ${accentColor}"></div>
        <span style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${badgeColor}">
          EMOSys Environmental Alert
        </span>
      </div>
      <h1 style="margin:0;font-size:1.5rem;font-weight:800;color:#f1f5f9;line-height:1.2">
        ${isCritical ? '🔴 Critical Alert' : '⚠️ Warning Alert'}
      </h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:0.9rem">
        ${alerts.length} sensor${alerts.length > 1 ? 's' : ''} exceeded threshold on
        <strong style="color:#e2e8f0">${deviceName}</strong>
      </p>
    </div>

    <!-- Device Info -->
    <div style="padding:16px 32px;background:rgba(255,255,255,0.02);border-bottom:1px solid #1e293b;display:flex;gap:32px;flex-wrap:wrap">
      <div>
        <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:4px">Device</div>
        <div style="font-weight:700;color:#e2e8f0">${deviceName}</div>
      </div>
      <div>
        <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:4px">Location</div>
        <div style="font-weight:700;color:#e2e8f0">${location || '—'}</div>
      </div>
      <div>
        <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;margin-bottom:4px">Time</div>
        <div style="font-weight:700;color:#e2e8f0">${new Date().toLocaleString('en-MY')}</div>
      </div>
    </div>

    <!-- Sensor Table -->
    <div style="padding:20px 32px">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:rgba(255,255,255,0.03)">
            <th style="padding:8px 14px;text-align:left;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #1e293b">Sensor</th>
            <th style="padding:8px 14px;text-align:left;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #1e293b">Reading</th>
            <th style="padding:8px 14px;text-align:left;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #1e293b">Limit</th>
            <th style="padding:8px 14px;text-align:left;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #1e293b">Over By</th>
            <th style="padding:8px 14px;text-align:left;font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;border-bottom:1px solid #1e293b">Level</th>
          </tr>
        </thead>
        <tbody>${sensorRows}</tbody>
      </table>
    </div>

    <!-- Action Box -->
    <div style="margin:0 32px 20px;padding:14px 18px;background:rgba(${isCritical?'239,68,68':'245,158,11'},0.08);border:1px solid rgba(${isCritical?'239,68,68':'245,158,11'},0.2);border-radius:10px">
      <div style="font-size:0.8rem;font-weight:700;color:${badgeColor};margin-bottom:4px">
        ${isCritical ? '🚨 Immediate Action Required' : '⚠️ Attention Required'}
      </div>
      <div style="font-size:0.82rem;color:#94a3b8;line-height:1.55">
        ${isCritical
          ? 'One or more sensors have exceeded critical thresholds. Please inspect the affected area immediately and check HVAC, ventilation, or cooling systems.'
          : 'Sensor readings are elevated above warning thresholds. Monitor the situation and consider checking ventilation or adjusting environmental controls.'}
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div style="font-size:0.75rem;color:#475569">
        <strong style="color:#94a3b8">EMOSys</strong> · Environmental Monitoring System
      </div>
      <div style="font-size:0.72rem;color:#475569">
        Alert cooldown: ${config.cooldownMins} min per sensor · Auto-generated
      </div>
    </div>

  </div>

  <p style="text-align:center;font-size:0.72rem;color:#334155;margin-top:16px">
    You received this because you are registered as an EMOSys alert recipient.<br/>
    To change settings, visit your EMOSys dashboard → Alerts → Email Settings.
  </p>
</body>
</html>`;
}

/* PLAIN TEXT FALLBACK */
function buildEmailText(alerts, deviceName, location) {
  const lines = [
    `EMOSys Alert — ${deviceName} (${location || 'unknown'})`,
    `Time: ${new Date().toLocaleString()}`,
    ``,
    ...alerts.map(a => {
      const thr = thresholds[a.sensor];
      return `[${a.severity.toUpperCase()}] ${thr?.label || a.sensor}: ${Number(a.value).toFixed(1)}${thr?.unit || ''} (threshold: ${a.severity==='critical'?thr?.danger:thr?.warn}${thr?.unit || ''})`;
    }),
    ``,
    `EMOSys Environmental Monitoring System`
  ];
  return lines.join('\n');
}

/* CORE: CHECK AND SEND */
/**
 * checkAndSendAlerts — call this every time new sensor data arrives.
 *
 * @param {Object} sensorData  e.g. { temp: 30.2, co2: 1650, voc: 540, hum: 72, pm25: 40 }
 * @param {string} deviceId    unique device identifier (used for cooldown key)
 * @param {string} deviceName  human-readable device name
 * @param {string} location    room / zone label
 * @returns {Promise<string[]>} array of sensors that triggered emails
 */
async function checkAndSendAlerts(sensorData, deviceId, deviceName, location = '', customThresholds = null) {
  if (!config.enabled) return [];
  if (!config.from || !config.to.length) return [];

  const triggered = [];

  /* Collect all sensors that are currently breaching */
  for (const [sensor, value] of Object.entries(sensorData)) {
    if (!(sensor in thresholds)) continue;
    const v   = parseFloat(value);
    const sev = getSeverity(sensor, v, customThresholds);
    if (!sev) continue;
    if (config.criticalOnly && sev !== 'critical') continue;
    if (!isCooledDown(deviceId, sensor)) continue;

    triggered.push({ sensor, value: v, severity: sev });
  }

  if (!triggered.length) return [];

  /* Log every triggered alert regardless of whether email goes out */
  triggered.forEach(a => {
    const entry = {
      id:        `${deviceId}_${a.sensor}_${Date.now()}`,
      sensor:    a.sensor,
      device:    deviceName,
      location,
      value:     a.value,
      threshold: a.severity === 'critical' ? thresholds[a.sensor].danger : thresholds[a.sensor].warn,
      severity:  a.severity,
      timestamp: new Date().toISOString(),
      emailSent: false   // updated below if send succeeds
    };
    alertLog.unshift(entry);
    if (alertLog.length > 100) alertLog.pop();
  });

  /* Send one combined email for all triggered sensors on this device */
  try {
    const transporter = getTransporter();
    const subject = triggered.some(a => a.severity === 'critical')
      ? `🔴 [EMOSys CRITICAL] ${deviceName} — ${triggered.map(a=>thresholds[a.sensor]?.label||a.sensor).join(', ')}`
      : `⚠️ [EMOSys Warning] ${deviceName} — ${triggered.map(a=>thresholds[a.sensor]?.label||a.sensor).join(', ')}`;

    await transporter.sendMail({
      from:    `"EMOSys Alerts" <${config.from}>`,
      to:      config.to.join(', '),
      subject,
      text:    buildEmailText(triggered, deviceName, location),
      html:    buildEmailHTML(triggered, deviceName, location)
    });

    /* Mark cooldowns + update emailSent flag in log */
    triggered.forEach(a => {
      markSent(deviceId, a.sensor);
      /* Find the log entry we just added and mark it sent */
      const entry = alertLog.find(e =>
        e.device === deviceName && e.sensor === a.sensor && !e.emailSent
      );
      if (entry) entry.emailSent = true;
    });

    console.log(`[EMOSys Email] Sent alert for ${deviceName}: ${triggered.map(a=>a.sensor).join(', ')}`);
    return triggered.map(a => a.sensor);

  } catch (err) {
    console.error('[EMOSys Email] Send failed:', err.message);
    return [];
  }
}

/* TEST EMAIL */
async function sendTestEmail(to) {
  const recipients = Array.isArray(to) ? to : [to];
  const transporter = getTransporter();

  const fakeAlerts = [
    { sensor: 'temp', value: 36.5, severity: 'critical' },
    { sensor: 'co2',  value: 1620, severity: 'critical' }
  ];

  await transporter.sendMail({
    from:    `"EMOSys Alerts" <${config.from}>`,
    to:      recipients.join(', '),
    subject: '✅ [EMOSys] Test Email — Alert System Working',
    text:    `EMOSys test email. Alert system is configured correctly.\nSent: ${new Date().toLocaleString()}`,
    html:    buildEmailHTML(fakeAlerts, 'Test Device', 'Test Room')
  });
}

/* GETTERS FOR API ROUTES */

/* Returns last 100 alert log entries */
function getAlertHistory() { return [...alertLog]; }

/**
 * Returns "active" alerts: alerts from the last 30 minutes
 * that haven't been cleared.
 */
function getActiveAlerts() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  return alertLog.filter(a => new Date(a.timestamp).getTime() > cutoff);
}

/* Update config at runtime (called by POST /api/alerts/config) */
function updateConfig(newConfig) {
  const old = { ...config };
  if (newConfig.enabled      !== undefined) config.enabled      = newConfig.enabled;
  if (newConfig.from)                        config.from         = newConfig.from;
  if (newConfig.to)                          config.to           = Array.isArray(newConfig.to) ? newConfig.to : [newConfig.to];
  if (newConfig.password)                    config.password     = newConfig.password;
  if (newConfig.cooldownMins !== undefined)  config.cooldownMins = parseInt(newConfig.cooldownMins) || 5;
  if (newConfig.criticalOnly !== undefined)  config.criticalOnly = newConfig.criticalOnly;

  /* Reset transporter if SMTP credentials changed */
  if (old.from !== config.from || old.password !== config.password) {
    resetTransporter();
  }
}

/* Update thresholds at runtime */
function updateThresholds(newThr) {
  Object.keys(thresholds).forEach(k => {
    if (newThr[k]) {
      if (newThr[k].warn   !== undefined) thresholds[k].warn   = parseFloat(newThr[k].warn);
      if (newThr[k].danger !== undefined) thresholds[k].danger = parseFloat(newThr[k].danger);
    }
  });
}

/* Get current config (password redacted) */
function getConfig() {
  return {
    ...config,
    password: config.password ? '••••••••' : '',
    to: [...config.to]
  };
}

function updateGroupThresholds(groupThr) {
  console.log('[EMOSys Email] Group thresholds updated for groups', Object.keys(groupThr).join(', '));
}

/* EXPORTS */
module.exports = {
  checkAndSendAlerts,
  sendTestEmail,
  getAlertHistory,
  getActiveAlerts,
  updateConfig,
  updateThresholds,
  updateGroupThresholds,
  getConfig
};
