import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { IconZap } from '../Icons'

Chart.register(...registerables)

const PSP_CHART_LIMIT = 10

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtCompact(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}

function PspCharts({ byPsp }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current
    if (!ctx) return

    chartRef.current?.destroy()

    const dark         = document.documentElement.getAttribute('data-theme') !== 'light'
    const creditColor  = dark ? '#34D399' : '#10B981'
    const debitColor   = dark ? '#F87171' : '#EF4444'
    const chartText    = dark ? '#F9F9F9' : '#111827'
    const chartTextDim = dark ? '#A3A3A3' : '#6B7280'
    const border       = dark ? '#262626' : '#E5E7EB'
    const surface      = dark ? '#0C0C0C' : '#FFFFFF'
    const text         = dark ? '#FDFDFD' : '#050505'

    const chartData = byPsp.slice(0, PSP_CHART_LIMIT)
    const labels    = chartData.map(p => p.psp_name)

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Credit (USD)',
            data: chartData.map(p => p.credit_usd),
            backgroundColor: creditColor,
            hoverBackgroundColor: creditColor + 'DD',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.82,
          },
          {
            label: 'Debit (USD)',
            data: chartData.map(p => p.debit_usd),
            backgroundColor: debitColor,
            hoverBackgroundColor: debitColor + 'DD',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.82,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 18 } },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: {
              color: chartText,
              boxWidth: 14,
              boxHeight: 14,
              borderRadius: 3,
              useBorderRadius: true,
              padding: 20,
              font: { family: 'Manrope, sans-serif', size: 12, weight: '600' },
            },
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
              label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.x.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            },
          },
        },
        scales: {
          x: {
            stacked: false,
            grid: { color: border + '44', drawTicks: false },
            border: { display: false },
            ticks: {
              color: chartTextDim,
              font: { family: 'JetBrains Mono, monospace', size: 10 },
              padding: 6,
              callback: v => fmtCompact(v),
            },
          },
          y: {
            stacked: false,
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: chartText,
              font: { family: 'Manrope, sans-serif', size: 12, weight: '600' },
              padding: 8,
              mirror: false,
            },
          },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [byPsp])

  if (!byPsp || byPsp.length === 0) return null

  const showCount = Math.min(byPsp.length, PSP_CHART_LIMIT)
  const chartH    = Math.max(260, showCount * 44 + 70)
  const hasMore   = byPsp.length > PSP_CHART_LIMIT

  return (
    <div className="psp-charts-wrapper stagger stagger-6">
      <div className="section-header">
        <div className="section-icon section-icon-gold">{IconZap}</div>
        <div>
          <h2 className="section-title">Impact by PSP</h2>
          <p className="section-sub">
            {byPsp.length} payment service provider{byPsp.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="psp-chart-card">
        <div className="psp-chart-header">
          <div className="psp-chart-title-text">Top {showCount} PSPs</div>
          <div className="psp-chart-legend">
            <span className="psp-legend-item">
              <span className="psp-legend-dot psp-dot-credit"></span> Credit
            </span>
            <span className="psp-legend-item">
              <span className="psp-legend-dot psp-dot-debit"></span> Debit
            </span>
          </div>
        </div>
        <div style={{ height: chartH }}>
          <canvas ref={canvasRef} id="psp-usd-chart" />
        </div>
      </div>

      <div className="table-wrapper" style={{ marginTop: '14px' }}>
        <div className="table-scroll">
          <table id="psp-table">
            <thead>
              <tr>
                <th className="left">PSP Name</th>
                <th className="right">Total Txns</th>
                <th className="right">Unique Txns</th>
                <th className="right">Credit (USD)</th>
                <th className="right">Debit (USD)</th>
                <th className="right">Total (USD)</th>
              </tr>
            </thead>
            <tbody>
              {byPsp.map((p, i) => (
                <tr
                  key={p.psp_name}
                  style={i >= PSP_CHART_LIMIT && !expanded ? { display: 'none' } : {}}
                >
                  <td className="left"><span className="currency-code">{p.psp_name}</span></td>
                  <td className="right">{p.total_txn_count.toLocaleString()}</td>
                  <td className="right">{p.unique_txn_count.toLocaleString()}</td>
                  <td className="right"><span className="text-credit">${fmt(p.credit_usd)}</span></td>
                  <td className="right"><span className="text-debit">${fmt(p.debit_usd)}</span></td>
                  <td className="right"><span className="text-money">${fmt(p.amount_usd)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <button
            className="btn btn-ghost psp-show-all"
            style={{ marginTop: '10px', width: '100%' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Show top 10 only' : `Show all ${byPsp.length} PSPs`}
          </button>
        )}
      </div>
    </div>
  )
}

export default PspCharts
