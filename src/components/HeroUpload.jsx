import { useRef, useState } from 'react'

function HeroUpload({ mode, onModeChange, onFilesSelected }) {
  const isTimeline = mode === 'timeline'
  const inputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function handleZoneClick() {
    inputRef.current?.click()
  }

  function handleInputClick(e) {
    // Prevent click from bubbling back up to the zone and opening picker twice
    e.stopPropagation()
  }

  function handleInputChange(e) {
    if (e.target.files?.length) {
      onFilesSelected([...e.target.files])
      // Reset so the same file can be re-selected after an error
      e.target.value = ''
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    onFilesSelected([...e.dataTransfer.files])
  }

  return (
    <div className="hero">
      <div className="hero-top stagger stagger-1">
        <h1 className="hero-title">
          Transaction data,<br /><span className="hl">clarified.</span>
        </h1>
        <p className="hero-subtitle">
          An authoritative engine for transaction deduplication, currency conversion, and incident tracking. Drop your exports and see the truth.
        </p>
      </div>

      <div className="hero-modes stagger stagger-2">
        <button
          className={`mode-card${!isTimeline ? ' mode-card-active' : ''}`}
          data-mode="standard"
          onClick={() => onModeChange('single')}
        >
          <div className="mode-card-header">
            <div className="mode-card-icon mc-icon-standard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div className="mode-card-title">Transaction Analysis</div>
          </div>
          <p className="mode-card-desc">Deduplicate exports, convert 165+ currencies to USD, and view precise per-currency breakdowns.</p>
        </button>

        <button
          className={`mode-card${isTimeline ? ' mode-card-active' : ''}`}
          data-mode="timeline"
          onClick={() => onModeChange('timeline')}
        >
          <div className="mode-card-header">
            <div className="mode-card-icon mc-icon-timeline">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="mode-card-title">Incident Timeline</div>
          </div>
          <p className="mode-card-desc">Parse PSP reports into per-minute incident charts, dynamically filtered by return codes.</p>
        </button>
      </div>

      <div
        className={`upload-zone stagger stagger-3${isDragOver ? ' drag-over' : ''}`}
        id="upload-zone"
        onClick={handleZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          id="file-input"
          accept=".csv,.xlsx,.xls"
          multiple={mode !== 'timeline'}
          hidden
          onClick={handleInputClick}
          onChange={handleInputChange}
        />
        <div className="upload-inner">
          <div className="upload-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="upload-text">
            <p className="upload-title">Upload Export Files</p>
            <p className="upload-hint">
              {isTimeline ? 'Select or drag a single export file' : 'Select or drag CSV, XLSX files'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroUpload
