import SummaryCards from './SummaryCards'
import CurrencyTable from './CurrencyTable'
import WarningsPanel from './WarningsPanel'
import { IconCheck, IconFile, IconDownload, IconClock } from '../Icons'

function SingleResults({ data, fileName, onExport, onNew }) {
  return (
    <div className="results-page">
      <div className="results-header stagger stagger-1">
        <div className="res-title-group">
          <div className="res-title-icon">{IconCheck}</div>
          <div>
            <h2>Analysis Complete</h2>
            <span className="res-file-badge">{IconFile} {fileName}</span>
          </div>
        </div>
        <div className="results-actions">
          <button className="btn btn-primary" onClick={onExport}>
            {IconDownload} Export CSV
          </button>
          <button className="btn btn-ghost" onClick={onNew}>New Analysis</button>
        </div>
      </div>

      {data.rate_source && (
        <span className="rate-source stagger stagger-2">
          {IconClock} {data.rate_source}
        </span>
      )}

      <SummaryCards summary={data.summary} />
      <CurrencyTable data={data.by_currency} />
      {/* PSP chart — Batch 3 */}
      <WarningsPanel warnings={data.warnings} />
    </div>
  )
}

export default SingleResults
