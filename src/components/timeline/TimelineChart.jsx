import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

function TimelineChart({ buckets, theme }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ctx = canvasRef.current
    if (!ctx) return

    chartRef.current?.destroy()

    const dark         = theme !== 'light'
    const lineColor    = dark ? '#34D399' : '#10B981'
    const fillColor    = dark ? 'rgba(52,211,153,0.10)' : 'rgba(16,185,129,0.08)'
    const chartText    = dark ? '#F9F9F9' : '#111827'
    const chartTextDim = dark ? '#A3A3A3' : '#6B7280'
    const border       = dark ? '#262626' : '#E5E7EB'
    const surface      = dark ? '#0C0C0C' : '#FFFFFF'
    const text         = dark ? '#FDFDFD' : '#050505'

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: buckets.labels,
        datasets: [{
          label: 'Transactions',
          data: buckets.counts,
          borderColor: lineColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.3,
          pointRadius: buckets.counts.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: lineColor,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Transaction Count per Minute',
            color: chartText,
            font: { family: 'Manrope, sans-serif', size: 14, weight: '700' },
            padding: { bottom: 16 },
          },
          tooltip: {
            backgroundColor: surface,
            titleColor: text,
            bodyColor: chartText,
            borderColor: border,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: 'Manrope, sans-serif', size: 13, weight: '700' },
            bodyFont: { family: 'JetBrains Mono, monospace', size: 12 },
            callbacks: {
              label: ctx => ` Count: ${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: border + '44', drawTicks: false },
            border: { display: false },
            ticks: {
              color: chartTextDim,
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 30,
            },
            title: {
              display: true,
              text: 'Time (minutes)',
              color: chartTextDim,
              font: { family: 'Manrope, sans-serif', size: 12, weight: '600' },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: border + '44', drawTicks: false },
            border: { display: false },
            ticks: {
              color: chartTextDim,
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              padding: 6,
            },
            title: {
              display: true,
              text: 'Count of Transactions',
              color: chartTextDim,
              font: { family: 'Manrope, sans-serif', size: 12, weight: '600' },
            },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [theme])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.data.labels                          = buckets.labels
    chartRef.current.data.datasets[0].data               = buckets.counts
    chartRef.current.data.datasets[0].pointRadius        = buckets.counts.length > 60 ? 0 : 3
    chartRef.current.update('none')
  }, [buckets])

  return (
    <div className="tl-chart-canvas-wrap">
      <canvas ref={canvasRef} id="timeline-chart" />
    </div>
  )
}

export default TimelineChart
