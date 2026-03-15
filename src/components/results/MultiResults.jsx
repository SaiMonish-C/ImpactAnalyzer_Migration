import SummaryCards from './SummaryCards'
import CurrencyTable from './CurrencyTable'
import WarningsPanel from './WarningsPanel'
import { IconCheck, IconFile, IconDownload, IconClock, IconWarn } from '../Icons'

function MultiResults({ multiData, activeTab, onTabChange, onExport, onNew }) {
  const tabs = [
    { idx: 0, label: `All Files (${multiData.file_count})` },
    ...multiData.files.map((f, i) => ({ idx: i + 1, label: f.file_name })),
  ]

  // activeTab 0 → aggregate; activeTab N → files[N-1]
  const activeData = activeTab === 0
    ? multiData.aggregate
    : multiData.files[activeTab - 1]

  return (
    <div className="results-page">
      <div className="results-header stagger stagger-1">
        <div className="res-title-group">
          <div className="res-title-icon">{IconCheck}</div>
          <div>
            <h2>Multi-File Analysis</h2>
            <span className="res-file-badge">{IconFile} {multiData.file_count} files processed</span>
          </div>
        </div>
        <div className="results-actions">
          <button className="btn btn-primary" onClick={onExport}>
            {IconDownload} Export CSV
          </button>
          <button className="btn btn-ghost" onClick={onNew}>New Analysis</button>
        </div>
      </div>

      {activeData?.rate_source && (
        <span className="rate-source stagger stagger-2">
          {IconClock} {activeData.rate_source}
        </span>
      )}

      <div className="tab-bar stagger stagger-2">
        {tabs.map(t => (
          <button
            key={t.idx}
            className={`tab-btn${t.idx === activeTab ? ' tab-active' : ''}`}
            onClick={() => onTabChange(t.idx)}
          >
            {t.idx === 0 && IconFile} {t.label}
          </button>
        ))}
      </div>

      {multiData.errors.length > 0 && (
        <div className="warnings-panel stagger stagger-3">
          <div className="warnings-header">
            {IconWarn}
            <span>Failed Files</span>
          </div>
          <p>The following files could not be processed:</p>
          <div className="warning-tags">
            {multiData.errors.map(e => (
              <span key={e.file_name} className="warning-tag" title={e.error}>
                {e.file_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeData && (
        <>
          <SummaryCards summary={activeData.summary} />
          <CurrencyTable data={activeData.by_currency} />
          {/* PSP chart — Batch 3 */}
          <WarningsPanel warnings={activeData.warnings} />
        </>
      )}
    </div>
  )
}

export default MultiResults
