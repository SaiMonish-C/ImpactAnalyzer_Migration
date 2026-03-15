import { useMemo, useState } from 'react'
import { computeTimelineBuckets } from '../../logic/engine'
import {
  IconActivity,
  IconFile,
  IconFilter,
  IconChevronDown,
  IconX,
  IconZap,
  IconClock,
} from '../Icons'
import TimelineChart from './TimelineChart'

function TimelineView({ timelineData, fileName, theme, onNew }) {
  const { rows, returnCodes, paymentTypes } = timelineData

  const [selectedCodes, setSelectedCodes]               = useState([])
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState([])
  const [codesOpen, setCodesOpen]                       = useState(true)
  const [typesOpen, setTypesOpen]                       = useState(true)

  const buckets = useMemo(
    () => computeTimelineBuckets(rows, selectedCodes, selectedPaymentTypes),
    [rows, selectedCodes, selectedPaymentTypes],
  )

  const timeSpan = buckets.labels.length > 0
    ? `${buckets.labels[0]} \u2014 ${buckets.labels[buckets.labels.length - 1]}`
    : 'N/A'

  function handleCodeChange(code, checked) {
    setSelectedCodes(prev =>
      checked ? [...prev, code] : prev.filter(c => c !== code)
    )
  }

  function handleTypeChange(type, checked) {
    setSelectedPaymentTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    )
  }

  const hasCodeSelection = selectedCodes.length > 0
  const hasTypeSelection = selectedPaymentTypes.length > 0

  return (
    <div className="tl-page">
      <div className="results-header stagger stagger-1">
        <div className="tl-title-group">
          <div className="tl-title-icon">{IconActivity}</div>
          <div>
            <h2>Incident Timeline</h2>
            <span className="tl-file-badge">{IconFile} {fileName}</span>
          </div>
        </div>
        <div className="results-actions">
          <button className="btn btn-ghost" onClick={onNew}>New Analysis</button>
        </div>
      </div>

      <div className="tl-filter-bar stagger stagger-2">
        <div className="tl-filter-bar-label">{IconFilter} Filters</div>
        <div className="tl-filter-panels">
          <div className="tl-filter-panel">
            <div
              className="tl-filter-header"
              onClick={() => setCodesOpen(o => !o)}
            >
              <span className="tl-filter-header-left">Return Codes</span>
              <span className="tl-filter-meta">
                <span className="tl-filter-count">
                  {hasCodeSelection
                    ? `${selectedCodes.length} of ${returnCodes.length}`
                    : `All (${returnCodes.length})`}
                </span>
                <span className="tl-chevron">{IconChevronDown}</span>
              </span>
            </div>
            <div className={`tl-filter-list${codesOpen ? '' : ' tl-filter-collapsed'}`}>
              {hasCodeSelection && (
                <button
                  className="tl-clear-btn"
                  onClick={e => { e.stopPropagation(); setSelectedCodes([]) }}
                >
                  {IconX} Clear
                </button>
              )}
              {returnCodes.map(code => (
                <label key={code} className="tl-chip">
                  <input
                    type="checkbox"
                    value={code}
                    checked={selectedCodes.includes(code)}
                    onChange={e => handleCodeChange(code, e.target.checked)}
                  />
                  <span>{code}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="tl-filter-panel">
            <div
              className="tl-filter-header"
              onClick={() => setTypesOpen(o => !o)}
            >
              <span className="tl-filter-header-left">Payment Types</span>
              <span className="tl-filter-meta">
                <span className="tl-filter-count">
                  {hasTypeSelection
                    ? `${selectedPaymentTypes.length} of ${paymentTypes.length}`
                    : `All (${paymentTypes.length})`}
                </span>
                <span className="tl-chevron">{IconChevronDown}</span>
              </span>
            </div>
            <div className={`tl-filter-list${typesOpen ? '' : ' tl-filter-collapsed'}`}>
              {hasTypeSelection && (
                <button
                  className="tl-clear-btn"
                  onClick={e => { e.stopPropagation(); setSelectedPaymentTypes([]) }}
                >
                  {IconX} Clear
                </button>
              )}
              {paymentTypes.map(pt => (
                <label key={pt} className="tl-chip">
                  <input
                    type="checkbox"
                    value={pt}
                    checked={selectedPaymentTypes.includes(pt)}
                    onChange={e => handleTypeChange(pt, e.target.checked)}
                  />
                  <span>{pt}</span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="tl-stats stagger stagger-3">
        <div className="tl-stat-card tl-stat-accent">
          <div className="tl-stat-icon">{IconActivity}</div>
          <div className="tl-stat-body">
            <div className="tl-stat-value">{buckets.totalFiltered.toLocaleString()}</div>
            <div className="tl-stat-label">Transactions</div>
          </div>
        </div>
        <div className="tl-stat-card">
          <div className="tl-stat-icon">{IconClock}</div>
          <div className="tl-stat-body">
            <div className="tl-stat-value tl-stat-mono">{timeSpan}</div>
            <div className="tl-stat-label">Time Span</div>
          </div>
        </div>
        <div className="tl-stat-card tl-stat-warn">
          <div className="tl-stat-icon">{IconZap}</div>
          <div className="tl-stat-body">
            <div className="tl-stat-value">{buckets.maxCount.toLocaleString()}</div>
            <div className="tl-stat-label">Peak / Min</div>
          </div>
        </div>
        <div className="tl-stat-card">
          <div className="tl-stat-icon">{IconClock}</div>
          <div className="tl-stat-body">
            <div className="tl-stat-value">{buckets.labels.length}</div>
            <div className="tl-stat-label">Minutes</div>
          </div>
        </div>
      </div>

      <div className="tl-chart-card stagger stagger-4">
        <div className="tl-chart-header">
          <div className="tl-chart-title">Transactions per Minute</div>
          <div className="tl-chart-legend">
            <span className="tl-legend-dot"></span> Count of unique transactions
          </div>
        </div>
        <TimelineChart buckets={buckets} theme={theme} />
      </div>

    </div>
  )
}

export default TimelineView
