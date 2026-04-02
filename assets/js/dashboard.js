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

  /* ── MOCK HISTORY DATA */
  var hist = { labels: [], temp: [], hum: [], aqi: [], co2: [], voc: [] };

  for (var i = 23; i >= 0; i--) {
    var d = new Date(Date.now() - i * 3600000);
    hist.labels.push(d.getHours() + ':00');
    hist.temp.push(+(22 + Math.sin(i / 4) * 3   + Math.random() * 0.5).toFixed(1));
    hist.hum.push( +(55 + Math.cos(i / 5) * 10  + Math.random()).toFixed(1));
    hist.aqi.push( +(35 + Math.sin(i / 3) * 20  + Math.random() * 5).toFixed(0));
    hist.co2.push( +(900 + Math.sin(i / 3) * 200 + Math.random() * 50).toFixed(0));
    hist.voc.push( +(120 + Math.random() * 80).toFixed(0));
  }

  /* ── DRAW CHARTS */
  drawAllSparklines(hist);
  drawMainCharts(hist);

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
    var n   = hist.temp.length - 1;
    var t   = hist.temp[n];
    var h   = hist.hum[n];
    var aqi = parseInt(hist.aqi[n]);
    var co2 = hist.co2[n];
    var voc = hist.voc[n];

    document.getElementById('tempVal').textContent = t;
    document.getElementById('tempVal').classList.remove('loading');

    document.getElementById('humVal').textContent  = h;
    document.getElementById('humVal').classList.remove('loading');

    document.getElementById('aqiVal').textContent  = aqi;
    document.getElementById('aqiVal').classList.remove('loading');

    document.getElementById('co2Val').textContent  = co2;
    document.getElementById('co2Val').classList.remove('loading');

    document.getElementById('vocVal').textContent  = voc;
    document.getElementById('vocVal').classList.remove('loading');

    setBadge('tempBadge', t > 28 ? 'crit' : t > 26 ? 'warn' : 'ok');
    setBadge('humBadge',  h > 70 ? 'crit' : h > 65 ? 'warn' : 'ok');

    var cat      = aqiCategory(aqi);
    var aqiBadge = document.getElementById('aqiBadge');
    aqiBadge.className   = 'status-flag ' + cat.flag;
    aqiBadge.textContent = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy';

    var aqiLabelEl = document.getElementById('aqiLabel');
    aqiLabelEl.textContent = cat.label;
    aqiLabelEl.style.color = cat.color;

    setBadge('co2Badge', co2 > 1500 ? 'crit' : co2 > 1000 ? 'warn' : 'ok');
    setBadge('vocBadge', voc > 300  ? 'crit' : voc > 200  ? 'warn' : 'ok');

    document.getElementById('lastUpdated').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

    updateAlerts(t, h, aqi, co2, voc);
  }

  /* ── BUILD ALERTS PANEL */
  function updateAlerts(t, h, aqi, co2, voc) {
    var alerts = [];

    if (co2 > 1000) alerts.push({
      type:  co2 > 1500 ? 'crit' : 'warn',
      msg:   'CO\u2082 level ' + (co2 > 1500 ? 'critical' : 'elevated') + ' \u2014 Server Room A',
      meta:  'Reading: ' + co2 + ' ppm \xb7 Threshold: 1,000 ppm',
      label: co2 > 1500 ? 'Critical' : 'Warning',
      time:  'Just now'
    });

    if (voc > 200) alerts.push({
      type:  voc > 300 ? 'crit' : 'warn',
      msg:   'VOC level ' + (voc > 300 ? 'critical' : 'elevated') + ' \u2014 Server Room A',
      meta:  'Reading: ' + voc + ' ppb \xb7 Threshold: 200 ppb',
      label: voc > 300 ? 'Critical' : 'Warning',
      time:  'Just now'
    });

    if (aqi > 50) alerts.push({
      type:  aqi > 100 ? 'crit' : 'warn',
      msg:   'Air Quality ' + (aqi > 100 ? 'unhealthy' : 'moderate') + ' \u2014 Office Floor 2',
      meta:  'AQI: ' + aqi + ' \xb7 Threshold: 50 (Good)',
      label: aqi > 100 ? 'Unhealthy' : 'Moderate',
      time:  'Just now'
    });

    if (t > 26) alerts.push({
      type:  t > 28 ? 'crit' : 'warn',
      msg:   'Temperature ' + (t > 28 ? 'critical' : 'elevated') + ' \u2014 Server Room A',
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

  /* ── LIVE SIMULATION */
  setInterval(function () {
    var n = hist.temp.length - 1;
    hist.temp.push(+(hist.temp[n] + (Math.random() - 0.5) * 0.4).toFixed(1));
    hist.hum.push( +(hist.hum[n]  + (Math.random() - 0.5) * 1  ).toFixed(1));
    hist.aqi.push( +(Math.max(0, Math.min(200, hist.aqi[n] + (Math.random() - 0.5) * 5))).toFixed(0));
    hist.co2.push( +(hist.co2[n]  + (Math.random() - 0.5) * 30 ).toFixed(0));
    hist.voc.push( +(hist.voc[n]  + (Math.random() - 0.5) * 10 ).toFixed(0));
    updateCards();
  }, 10000);

  /* ── FOOTER DATE */
  document.getElementById('footerDate').textContent =
    'System time: ' + new Date().toLocaleTimeString();

  /* ── INITIAL RENDER */
  updateCards();

}); /* end DOMContentLoaded */


/* ══════════════════════════════════════════
   GLOBAL FUNCTIONS
   These must be OUTSIDE DOMContentLoaded
   because they are called from onclick=""
   attributes in the HTML
══════════════════════════════════════════ */

/* ── HAMBURGER MENU (mobile) */
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

/* ── DARK MODE TOGGLE */
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  var btn    = document.getElementById('darkBtn');
  var isDark = document.body.classList.contains('dark-mode');
  btn.innerHTML = isDark
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> Light'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark';
  localStorage.setItem('emosys_darkmode', isDark ? '1' : '0');
}