import { IconWarn } from '../Icons'

function WarningsPanel({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  return (
    <div className="warnings-panel">
      <div className="warnings-header">
        {IconWarn}
        <span>Unsupported Currencies</span>
      </div>
      <p>The following currencies could not be converted (no exchange rate found). Their USD values are shown as $0.00.</p>
      <div className="warning-tags">
        {warnings.map(w => (
          <span key={w} className="warning-tag">{w}</span>
        ))}
      </div>
    </div>
  )
}

export default WarningsPanel
