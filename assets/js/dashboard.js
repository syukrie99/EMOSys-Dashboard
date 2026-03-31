document.addEventListener('DOMContentLoaded', function () {

  /* ── AUTH CHECK
     requireAuth() is defined in auth.js.
     If no valid session exists it redirects to Login.html and returns null. */
  var user = requireAuth();
  if (!user) return;
  document.getElementById('userName').textContent   = user.name  || 'Admin';
  document.getElementById('userRole').textContent   = user.role  || 'User';
  document.getElementById('userAvatar').textContent = (user.name || 'A')[0].toUpperCase();


  var now = new Date();
  document.getElementById('currentDate').textContent =
    now.toLocaleDateString('en-MY', {
      weekday: 'short', day: 'numeric',
      month: 'short',   year: 'numeric'
    });

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


  drawAllSparklines(hist);
  drawMainCharts(hist);


  function aqiCategory(v) {
    if (v <= 50)  return { label: 'Good',                   color: '#15803d', flag: 'flag-ok'   };
    if (v <= 100) return { label: 'Moderate',               color: '#92400e', flag: 'flag-warn' };
    if (v <= 150) return { label: 'Unhealthy (Sensitive)',  color: '#c2410c', flag: 'flag-warn' };
    if (v <= 200) return { label: 'Unhealthy',              color: '#991b1b', flag: 'flag-crit' };
    return               { label: 'Very Unhealthy',         color: '#7e22ce', flag: 'flag-crit' };
  }

  function setBadge(id, level, text) {
    var el = document.getElementById(id);
    el.className  = 'status-flag';
    if (level === 'ok')   { el.classList.add('flag-ok');   el.textContent = text || 'Normal';   }
    if (level === 'warn') { el.classList.add('flag-warn'); el.textContent = text || 'Elevated';  }
    if (level === 'crit') { el.classList.add('flag-crit'); el.textContent = text || 'Alert';     }
  }

  function updateCards() {
    var n   = hist.temp.length - 1;
    var t   = hist.temp[n];
    var h   = hist.hum[n];
    var aqi = parseInt(hist.aqi[n]);
    var co2 = hist.co2[n];
    var voc = hist.voc[n];


    document.getElementById('tempVal').textContent = t;
    document.getElementById('humVal').textContent  = h;
    document.getElementById('aqiVal').textContent  = aqi;
    document.getElementById('co2Val').textContent  = co2;
    document.getElementById('vocVal').textContent  = voc;

    setBadge('tempBadge', t > 28 ? 'crit' : t > 26 ? 'warn' : 'ok');
    setBadge('humBadge', h > 70 ? 'crit' : h > 65 ? 'warn' : 'ok');

    var cat = aqiCategory(aqi);
    var aqiBadge = document.getElementById('aqiBadge');
    aqiBadge.className   = 'status-flag ' + cat.flag;
    aqiBadge.textContent = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy';

    var aqiLabelEl = document.getElementById('aqiLabel');
    aqiLabelEl.textContent = cat.label;
    aqiLabelEl.style.color = cat.color;

    setBadge('co2Badge', co2 > 1500 ? 'crit' : co2 > 1000 ? 'warn' : 'ok');
    setBadge('vocBadge', voc > 300 ? 'crit' : voc > 200 ? 'warn' : 'ok');
    document.getElementById('lastUpdated').textContent =
      'Last updated: ' + new Date().toLocaleTimeString();

    updateAlerts(t, h, aqi, co2, voc);
  }


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
          '<span class="alert-tag '  + a.type + '">' + a.label + '</span>' +
          '<div class="alert-time">' + a.time  + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ── LIVE SIMULATION (10-second random walk)
     In production: replace the push() calls with a fetch() to
     api/sensor-data.php that returns the latest real reading.
     The chart objects from charts.js update themselves through
     the shared `hist` object reference. */
  setInterval(function () {
    var n = hist.temp.length - 1;

    hist.temp.push(+(hist.temp[n] + (Math.random() - 0.5) * 0.4).toFixed(1));
    hist.hum.push( +(hist.hum[n]  + (Math.random() - 0.5) * 1  ).toFixed(1));
    hist.aqi.push( +(Math.max(0, Math.min(200, hist.aqi[n] + (Math.random() - 0.5) * 5))).toFixed(0));
    hist.co2.push( +(hist.co2[n]  + (Math.random() - 0.5) * 30 ).toFixed(0));
    hist.voc.push( +(hist.voc[n]  + (Math.random() - 0.5) * 10 ).toFixed(0));

    updateCards();
  }, 10000);

  document.getElementById('footerDate').textContent =
    'System time: ' + new Date().toLocaleTimeString();

  updateCards();

}); 