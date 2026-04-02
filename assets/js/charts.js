Chart.defaults.font.family = 'Barlow';

var mainChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: { color: '#6b7a8d', font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
            backgroundColor: '#0d1b2a',
            titleColor:      '#ffffff',
            bodyColor:       '#9ca3af',
            borderColor:     '#1e2d40',
            borderWidth:     1
        }
    },
    scales: {
        x: {
            ticks: { color: '#9ca3af', font: { size: 10 }, maxTicksLimit: 8 },
            grid:  { color: '#f0f2f5' }
        },
        y: {
            ticks: { color: '#9ca3af', font: { size: 10 } },
            grid:  { color: '#f0f2f5' }
        }
    }
};

function drawSparkline(id, data, labels, color) {
    new Chart(document.getElementById(id), {
        type: 'line',
        data: {
            labels: labels.slice(-12),
            datasets: [{
                data:            data.slice(-12),
                borderColor:     color,
                borderWidth:     1.5,
                backgroundColor: color + '22',
                fill:            true,
                tension:         0.4,
                pointRadius:     0
            }]
        },
        options: {
            responsive:          true,
            maintainAspectRatio: false,
            plugins: {
                legend:  { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            animation: { duration: 200 }
        }
    });
}

function drawAllSparklines(hist) {
    drawSparkline('tempSpark', hist.temp, hist.labels, '#e53e3e');
    drawSparkline('humSpark',  hist.hum,  hist.labels, '#0ea5e9');
    drawSparkline('aqiSpark',  hist.aqi,  hist.labels, '#10b981');
    drawSparkline('co2Spark',  hist.co2,  hist.labels, '#7c3aed');
    drawSparkline('vocSpark',  hist.voc,  hist.labels, '#f59e0b');
}

function drawMainCharts(hist) {
    new Chart(document.getElementById('mainTempChart'), {
        type: 'line',
        data: {
            labels: hist.labels,
            datasets: [
                {
                    label:           'Temperature (°C)',
                    data:            hist.temp,
                    borderColor:     '#e53e3e',
                    backgroundColor: 'rgba(229,62,62,0.07)',
                    fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
                },
                {
                    label:           'Humidity (%)',
                    data:            hist.hum,
                    borderColor:     '#0ea5e9',
                    backgroundColor: 'rgba(14,165,233,0.05)',
                    fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
                }
            ]
        },
        options: mainChartOptions
    });

    new Chart(document.getElementById('mainAqiChart'), {
        type: 'line',
        data: {
            labels: hist.labels,
            datasets: [
                {
                    label:           'AQI',
                    data:            hist.aqi,
                    borderColor:     '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.06)',
                    fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
                },
                {
                    label:           'CO₂ (ppm)',
                    data:            hist.co2,
                    borderColor:     '#7c3aed',
                    backgroundColor: 'rgba(124,58,237,0.05)',
                    fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
                },
                {
                    label:           'VOC (ppb)',
                    data:            hist.voc,
                    borderColor:     '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.05)',
                    fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
                }
            ]
        },
        options: mainChartOptions
    });
}