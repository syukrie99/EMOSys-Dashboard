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
            borderColor:     '#0057B8',
            borderWidth:     1,
            padding:         12,
            cornerRadius:    0,
            titleFont:       { family: 'Barlow Condensed', size: 13, weight: 'bold' },
            bodyFont:        { family: 'Barlow', size: 12 },
            callbacks: {
                label: function(context) {
                    var label = context.dataset.label || '';
                    var value = context.parsed.y;
                    if (label.includes('°C'))    return '  ' + label + ': ' + value + ' °C';
                    if (label.includes('%'))     return '  ' + label + ': ' + value + ' %';
                    if (label.includes('ppm'))   return '  ' + label + ': ' + value + ' ppm';
                    if (label.includes('ppb'))   return '  ' + label + ': ' + value + ' ppb';
                    if (label.includes('μg/m³')) return '  ' + label + ': ' + value + ' μg/m³';
                    return '  ' + label + ': ' + value;
                }
            }
        }
    },
    scales: {
        x: {
            ticks: { color: '#9ca3af', font: { size: 10 }, maxTicksLimit: 8 },
            grid:  { color: '#f0f2f5' }
        }
    }
};

function drawSparkline(id, data, labels, color) {
    var existing = Chart.getChart(id);
    if (existing) existing.destroy();

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
    drawSparkline('tempSpark', hist.temp,  hist.labels, '#e53e3e');
    drawSparkline('humSpark',  hist.hum,   hist.labels, '#0ea5e9');
    drawSparkline('aqiSpark',  hist.pm25,  hist.labels, '#10b981');
    drawSparkline('co2Spark',  hist.co2,   hist.labels, '#7c3aed');
    drawSparkline('vocSpark',  hist.voc,   hist.labels, '#f59e0b');
}

function drawMainCharts(hist) {

    /* ── TEMP & HUMIDITY — dual Y-axis so both lines are visible */
    if (window.tempChart) window.tempChart.destroy();

    window.tempChart = new Chart(document.getElementById('mainTempChart'), {
        type: 'line',
        data: {
            labels: hist.labels,
            datasets: [
                {
                    label:           'Temperature (°C)',
                    data:            hist.temp,
                    borderColor:     '#e53e3e',
                    backgroundColor: 'rgba(229,62,62,0.07)',
                    fill:       true,
                    tension:    0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                    yAxisID:    'yTemp'
                },
                {
                    label:           'Humidity (%)',
                    data:            hist.hum,
                    borderColor:     '#0ea5e9',
                    backgroundColor: 'rgba(14,165,233,0.05)',
                    fill:       true,
                    tension:    0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                    yAxisID:    'yHum'
                }
            ]
        },
        options: Object.assign({}, mainChartOptions, {
            scales: {
                x: mainChartOptions.scales.x,
                yTemp: {
                    type:     'linear',
                    position: 'left',
                    title:    { display: true, text: '°C', color: '#e53e3e', font: { size: 10 } },
                    ticks:    { color: '#e53e3e', font: { size: 10 } },
                    grid:     { color: '#f0f2f5' },
                    suggestedMin: 15,
                    suggestedMax: 40
                },
                yHum: {
                    type:     'linear',
                    position: 'right',
                    title:    { display: true, text: '%RH', color: '#0ea5e9', font: { size: 10 } },
                    ticks:    { color: '#0ea5e9', font: { size: 10 } },
                    grid:     { drawOnChartArea: false },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        })
    });

    /* ── AQI CHART — dual Y-axis: PM2.5 left, CO₂/VOC right */
    if (window.aqiChart) window.aqiChart.destroy();

    window.aqiChart = new Chart(document.getElementById('mainAqiChart'), {
        type: 'line',
        data: {
            labels: hist.labels,
            datasets: [
                {
                    label:           'PM2.5 (μg/m³)',
                    data:            hist.pm25,
                    borderColor:     '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.06)',
                    fill:       true,
                    tension:    0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                    yAxisID:    'yPM'
                },
                {
                    label:           'CO₂ (ppm)',
                    data:            hist.co2,
                    borderColor:     '#7c3aed',
                    backgroundColor: 'rgba(124,58,237,0.05)',
                    fill:       true,
                    tension:    0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                    yAxisID:    'yCO2'
                },
                {
                    label:           'VOC (ppb)',
                    data:            hist.voc,
                    borderColor:     '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.05)',
                    fill:       true,
                    tension:    0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                    yAxisID:    'yCO2'
                }
            ]
        },
        options: Object.assign({}, mainChartOptions, {
            scales: {
                x: mainChartOptions.scales.x,
                yPM: {
                    type:     'linear',
                    position: 'left',
                    title:    { display: true, text: 'μg/m³', color: '#10b981', font: { size: 10 } },
                    ticks:    { color: '#10b981', font: { size: 10 } },
                    grid:     { color: '#f0f2f5' },
                    suggestedMin: 0,
                    suggestedMax: 100
                },
                yCO2: {
                    type:     'linear',
                    position: 'right',
                    title:    { display: true, text: 'ppm / ppb', color: '#7c3aed', font: { size: 10 } },
                    ticks:    { color: '#7c3aed', font: { size: 10 } },
                    grid:     { drawOnChartArea: false }
                }
            }
        })
    });
}