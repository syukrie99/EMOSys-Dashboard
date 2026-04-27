document.addEventListener('DOMContentLoaded', function () {

  /* ── AUTH CHECK */
  var user = requireAuth();
  if (!user) return;

  /* ── DARK MODE: restore preference from last visit */
  if (localStorage.getItem('emosys_darkmode') === '1') {
    document.body.classList.add('dark-mode');
    document.getElementById('darkBtn').innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> Light';
  }

  /* ── POPULATE USER INFO */
  document.getElementById('userName').textContent   = user.name  || 'Admin';
  document.getElementById('userRole').textContent   = user.role  || 'User';
  document.getElementById('userAvatar').textContent = (user.name || 'A')[0].toUpperCase();

  /* ── SET DATE */
  var now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('en-MY', {
      weekday: 'short', day: 'numeric',
      month: 'short',   year: 'numeric'
    });

  /* ── FOOTER DATE */
  document.getElementById('footerDate').textContent =
    'System time: ' + new Date().toLocaleTimeString();

  /* ── DEVICE LIST — fetched dynamically from /api/devices */
  var devices = [];
  var activeDevice = 'sams_workstation'; // default until API responds

  /* ── HISTORY DATA */
  var hist = { labels: [], temp: [], hum: [], pm25: [], aqi: [], co2: [], voc: [] };

  /* ── DRAW EMPTY CHARTS FIRST */
  drawAllSparklines(hist);
  drawMainCharts(hist);

  /* ── BUILD DEVICE SELECTOR in topbar */
  var topbarRight = document.querySelector('.topbar-right');
  var selectorWrap = document.createElement('div');
  selectorWrap.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:0.78rem;color:rgba(255,255,255,0.6)';
  selectorWrap.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">' +
      '<rect x="2" y="7" width="20" height="14" rx="2"/>' +
      '<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' +
    '</svg>' +
    '<select id="deviceSelect" style="' +
      'background:#1e2d3d;color:#fff;border:1px solid rgba(255,255,255,0.15);' +
      'padding:4px 8px;font-size:0.78rem;font-family:Barlow,sans-serif;' +
      'border-radius:4px;cursor:pointer;outline:none' +
    '"><option>Loading devices…</option></select>';

  var dateSpan = document.getElementById('currentDate');
  topbarRight.insertBefore(selectorWrap, dateSpan);

  /* ── FETCH DEVICE LIST then populate dropdown */
  fetch('/api/devices')
    .then(function(res) { return res.json(); })
    .then(function(list) {
      devices = list;
      activeDevice = list[0].id;
      var select = document.getElementById('deviceSelect');
      select.innerHTML = list.map(function(d) {
        return '<option value="' + d.id + '">' + d.label + '</option>';
      }).join('');
      /* Start fetching data now that we have devices */
      fetchData();
      setInterval(fetchData, 30000);
    })
    .catch(function(err) {
      console.error('Failed to load devices:', err);
    });

  /* Listen for device change */
  document.getElementById('deviceSelect').addEventListener('change', function() {
    activeDevice = this.value;
    hist.labels = []; hist.temp = []; hist.hum = [];
    hist.pm25 = []; hist.aqi = []; hist.co2 = []; hist.voc = [];
    drawMainCharts(hist);
    fetchData();
  });

  /* ── AQI CATEGORY HELPER */
  function aqiCategory(v) {
    if (v <= 50)  return { label: 'Good',                  color: '#15803d', flag: 'flag-ok'   };
    if (v <= 100) return { label: 'Moderate',              color: '#92400e', flag: 'flag-warn' };
    if (v <= 150) return { label: 'Unhealthy (Sensitive)', color: '#c2410c', flag: 'flag-warn' };
    if (v <= 200) return { label: 'Unhealthy',             color: '#991b1b', flag: 'flag-crit' };
    return               { label: 'Very Unhealthy',        color: '#7e22ce', flag: 'flag-crit' };
  }

  /* ── BADGE HELPER */
  function setBadge(id, level, text) {
    var el = document.getElementById(id);
    el.className = 'status-flag';
    if (level === 'ok')   { el.classList.add('flag-ok');   el.textContent = text || 'Normal';  }
    if (level === 'warn') { el.classList.add('flag-warn'); el.textContent = text || 'Elevated'; }
    if (level === 'crit') { el.classList.add('flag-crit'); el.textContent = text || 'Alert';    }
  }

  /* ── UPDATE SENSOR CARDS */
  function updateCards() {
    var n    = hist.temp.length - 1;
    var t    = hist.temp[n];
    var h    = hist.hum[n];
    var pm25 = parseFloat(hist.pm25[n]);
    var aqi  = parseInt(hist.aqi[n]);
    var co2  = hist.co2[n];
    var voc  = hist.voc[n];

    var tempEl = document.getElementById('tempVal');
    tempEl.innerHTML = t;
    tempEl.classList.remove('loading');

    var humEl = document.getElementById('humVal');
    humEl.innerHTML = h;
    humEl.classList.remove('loading');

    var aqiEl = document.getElementById('aqiVal');
    aqiEl.innerHTML = pm25;
    aqiEl.classList.remove('loading');

    var co2El = document.getElementById('co2Val');
    co2El.innerHTML = co2;
    co2El.classList.remove('loading');

    var vocEl = document.getElementById('vocVal');
    vocEl.innerHTML = voc;
    vocEl.classList.remove('loading');

    document.querySelector('.sensor-card.temp  .sensor-spark').classList.remove('loading');
    document.querySelector('.sensor-card.humid .sensor-spark').classList.remove('loading');
    document.querySelector('.sensor-card.aqi   .sensor-spark').classList.remove('loading');
    document.querySelector('.sensor-card.co2   .sensor-spark').classList.remove('loading');
    document.querySelector('.sensor-card.voc   .sensor-spark').classList.remove('loading');

    setBadge('tempBadge', t > 28 ? 'crit' : t > 26 ? 'warn' : 'ok');
    setBadge('humBadge',  h > 70 ? 'crit' : h > 65 ? 'warn' : 'ok');

    var aqiBadge   = document.getElementById('aqiBadge');
    var aqiLabelEl = document.getElementById('aqiLabel');
    var cat = aqiCategory(aqi);
    aqiBadge.className   = 'status-flag ' + (pm25 > 55.4 ? 'flag-crit' : pm25 > 35.4 ? 'flag-warn' : 'flag-ok');
    aqiBadge.textContent = pm25 > 55.4 ? 'Unhealthy' : pm25 > 35.4 ? 'Elevated' : 'Good';
    aqiLabelEl.textContent = 'AQI: ' + aqi;
    aqiLabelEl.style.color = cat.color;

    setBadge('co2Badge', co2 > 1500 ? 'crit' : co2 > 1000 ? 'warn' : 'ok');
    setBadge('vocBadge', voc > 300  ? 'crit' : voc > 200  ? 'warn' : 'ok');

    document.getElementById('lastUpdated').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

    /* ── REFRESH CHARTS with latest hist data */
    if (window.tempChart) {
      window.tempChart.data.labels           = hist.labels;
      window.tempChart.data.datasets[0].data = hist.temp;
      window.tempChart.data.datasets[1].data = hist.hum;
      window.tempChart.update();
    }

    if (window.aqiChart) {
      window.aqiChart.data.labels           = hist.labels;
      window.aqiChart.data.datasets[0].data = hist.pm25;
      window.aqiChart.data.datasets[1].data = hist.co2;
      window.aqiChart.data.datasets[2].data = hist.voc;
      window.aqiChart.update();
    }

    /* ── REFRESH SPARKLINES */
    drawAllSparklines(hist);

    /* ── UPDATE STATUS PILL with active device name */
    var activeInfo = devices.find(function(d) { return d.id === activeDevice; });
    var pill = document.querySelector('.status-pill');
    if (pill && activeInfo) {
      pill.innerHTML = '<div class="pulse-dot"></div> ' + activeInfo.label + ' — ' + activeInfo.location;
    }

    updateAlerts(t, h, pm25, aqi, co2, voc);
  }

  /* ── BUILD ALERTS PANEL */
  function updateAlerts(t, h, pm25, aqi, co2, voc) {
    var activeInfo = devices.find(function(d) { return d.id === activeDevice; });
    var devLabel   = activeInfo ? activeInfo.label : 'Unknown Device';
    var alerts = [];

    if (co2 > 1000) alerts.push({
      type:  co2 > 1500 ? 'crit' : 'warn',
      msg:   'CO\u2082 level ' + (co2 > 1500 ? 'critical' : 'elevated') + ' \u2014 ' + devLabel,
      meta:  'Reading: ' + co2 + ' ppm \xb7 Threshold: 1,000 ppm',
      label: co2 > 1500 ? 'Critical' : 'Warning',
      time:  'Just now'
    });

    if (voc > 200) alerts.push({
      type:  voc > 300 ? 'crit' : 'warn',
      msg:   'VOC level ' + (voc > 300 ? 'critical' : 'elevated') + ' \u2014 ' + devLabel,
      meta:  'Reading: ' + voc + ' ppb \xb7 Threshold: 200 ppb',
      label: voc > 300 ? 'Critical' : 'Warning',
      time:  'Just now'
    });

    if (aqi > 50) alerts.push({
      type:  aqi > 100 ? 'crit' : 'warn',
      msg:   'Air Quality ' + (aqi > 100 ? 'unhealthy' : 'moderate') + ' \u2014 ' + devLabel,
      meta:  'AQI: ' + aqi + ' \xb7 Threshold: 50 (Good)',
      label: aqi > 100 ? 'Unhealthy' : 'Moderate',
      time:  'Just now'
    });

    if (t > 26) alerts.push({
      type:  t > 28 ? 'crit' : 'warn',
      msg:   'Temperature ' + (t > 28 ? 'critical' : 'elevated') + ' \u2014 ' + devLabel,
      meta:  'Reading: ' + t + '\u00b0C \xb7 Threshold: 26\u00b0C',
      label: t > 28 ? 'Critical' : 'Warning',
      time:  'Just now'
    });

    var card = document.getElementById('alertsCard');

    if (alerts.length === 0) {
      card.innerHTML =
        '<div style="padding:24px;font-size:0.88rem;color:var(--success);' +
        'display:flex;align-items:center;gap:8px">' +
        '<span style="font-size:1.2rem">&#10003;</span> All readings within normal thresholds</div>';
      document.getElementById('alertCount').textContent = '0';
      return;
    }

    document.getElementById('alertCount').textContent = alerts.length;

    card.innerHTML = alerts.map(function (a) {
      return (
        '<div class="alert-row">' +
          '<div class="alert-bar ' + a.type + '"></div>' +
          '<div class="alert-body">' +
            '<div class="alert-msg">'  + a.msg  + '</div>' +
            '<div class="alert-meta">' + a.meta + '</div>' +
          '</div>' +
          '<span class="alert-tag ' + a.type + '">' + a.label + '</span>' +
          '<div class="alert-time">' + a.time + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ── FETCH LIVE DATA — passes device ID as query param */
  function fetchData() {

    fetch('/api/ha/latest?device=' + activeDevice)
      .then(function(res) { return res.json(); })
      .then(function(live) {

        if (live && live.temperature !== undefined) {
          var now   = new Date();
          var label = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

          hist.labels.push(label);
          hist.temp.push( parseFloat(live.temperature) || 0);
          hist.hum.push(  parseFloat(live.humidity)    || 0);
          hist.pm25.push( parseFloat(live.pm25)        || 0);
          hist.aqi.push(  parseInt(live.aqi)           || 0);
          hist.co2.push(  parseInt(live.co2)           || 0);
          hist.voc.push(  parseInt(live.voc)           || 0);

          /* Keep only last 48 points */
          var MAX = 48;
          if (hist.labels.length > MAX) {
            hist.labels = hist.labels.slice(-MAX);
            hist.temp   = hist.temp.slice(-MAX);
            hist.hum    = hist.hum.slice(-MAX);
            hist.pm25   = hist.pm25.slice(-MAX);
            hist.aqi    = hist.aqi.slice(-MAX);
            hist.co2    = hist.co2.slice(-MAX);
            hist.voc    = hist.voc.slice(-MAX);
          }

          updateCards();
        }
      })
      .catch(function(err) {
        console.log('Fetch error:', err);
      });

    /* Device status pill */
    fetch('/api/ha/status?device=' + activeDevice)
      .then(function(res) { return res.json(); })
      .then(function(status) {
        var pill = document.querySelector('.status-pill');
        var activeInfo = devices.find(function(d) { return d.id === activeDevice; });
        if (pill && activeInfo) {
          var online = status.online;
          pill.innerHTML =
            '<div class="pulse-dot" style="' + (online ? '' : 'background:#ef4444') + '"></div> ' +
            activeInfo.label + (online ? ' Online' : ' Offline');
        }
      })
      .catch(function(err) {
        console.log('Status error:', err);
      });

  }

  /* Expose fetchData globally for the Refresh button */
  window.fetchData = fetchData;

  /* ── LOAD DEVICES TABLE ─────────────────────────── */
  function formatLastSeen(secondsAgo) {
    if (secondsAgo < 10)  return 'Just now';
    if (secondsAgo < 60)  return secondsAgo + 's ago';
    if (secondsAgo < 3600) return Math.floor(secondsAgo / 60) + 'm ago';
    return Math.floor(secondsAgo / 3600) + 'h ago';
  }

  function loadDevicesTable() {
    fetch('/api/devices')
      .then(function(res) { return res.json(); })
      .then(function(list) {
        /* Fetch status for ALL devices in parallel */
        var statusPromises = list.map(function(d) {
          return fetch('/api/ha/status?device=' + d.id)
            .then(function(res) { return res.json(); })
            .catch(function() { return { device: d.id, online: false, seconds_ago: null }; });
        });

        Promise.all(statusPromises).then(function(statuses) {
          var onlineCount = statuses.filter(function(s) { return s.online; }).length;
          document.getElementById('deviceCountBadge').textContent =
            list.length + ' registered · ' + onlineCount + ' online';

          var tbody = document.getElementById('devicesTableBody');
          tbody.innerHTML = list.map(function(d, i) {
            var s       = statuses[i];
            var online  = s.online;
            var lastSeen = s.seconds_ago !== null ? formatLastSeen(s.seconds_ago) : 'Unknown';
            return (
              '<tr>' +
                '<td><div class="device-name">' + d.label + '</div></td>' +
                '<td>' + d.location + '</td>' +
                '<td>' +
                  '<span class="' + (online ? 'online' : 'offline') + '">' +
                    '<i class="' + (online ? 'dot-on' : 'dot-off') + '"></i>' +
                    (online ? 'Online' : 'Offline') +
                  '</span>' +
                '</td>' +
                '<td>' + lastSeen + '</td>' +
                '<td>Temp, Humidity, CO&#x2082;, VOC, PM2.5</td>' +
              '</tr>'
            );
          }).join('');
        });
      })
      .catch(function(err) {
        console.error('Devices table error:', err);
      });
  }

  /* Load table on start, refresh every 60 seconds */
  loadDevicesTable();
  setInterval(loadDevicesTable, 60000);

}); /* end DOMContentLoaded */


/* ══════════════════════════════════════════
   GLOBAL FUNCTIONS
══════════════════════════════════════════ */

function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  var btn    = document.getElementById('darkBtn');
  var isDark = document.body.classList.contains('dark-mode');
  btn.innerHTML = isDark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> Light'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark';
  localStorage.setItem('emosys_darkmode', isDark ? '1' : '0');
}

function updateCards() {
  if (typeof window.fetchData === 'function') window.fetchData();
}