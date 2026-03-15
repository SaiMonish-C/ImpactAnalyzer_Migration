import { useState } from 'react'
import { analyze, analyzeMulti, analyzeTimeline } from './logic/engine'
import { exportCsv } from './utils/export'
import Topbar from './components/layout/Topbar'
import Footer from './components/layout/Footer'
import HeroUpload from './components/HeroUpload'
import LoadingScreen from './components/LoadingScreen'
import ErrorPanel from './components/ErrorPanel'
import SingleResults from './components/results/SingleResults'
import MultiResults from './components/results/MultiResults'
import TimelineView from './components/timeline/TimelineView'

const VALID_EXTENSIONS = ['csv', 'xlsx', 'xls']

function App() {
  const [view, setView]                 = useState('idle')
  const [mode, setMode]                 = useState('single')
  const [theme, setTheme]               = useState('dark')
  const [error, setError]               = useState(null)
  const [data, setData]                 = useState(null)
  const [multiData, setMultiData]       = useState(null)
  const [timelineData, setTimelineData] = useState(null)
  const [activeTab, setActiveTab]       = useState(0)
  const [fileName, setFileName]         = useState('')

  const handleToggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  function handleReset() {
    setData(null)
    setMultiData(null)
    setTimelineData(null)
    setFileName('')
    setError(null)
    setActiveTab(0)
    setMode('single')
    setView('idle')
  }

  function handleModeChange(newMode) {
    if (newMode === mode) return
    setMode(newMode)
  }

  async function handleTimelineFile(file) {
    setFileName(file.name)
    setData(null)
    setMultiData(null)
    setTimelineData(null)
    setError(null)
    setActiveTab(0)
    setView('loading')
    try {
      const result = await analyzeTimeline(file)
      setTimelineData(result)
      setView('timeline')
    } catch (err) {
      setError(err.message)
      setView('error')
    }
  }

  async function handleSingleFile(file) {
    setMode('single')
    setFileName(file.name)
    setData(null)
    setMultiData(null)
    setError(null)
    setActiveTab(0)
    setView('loading')
    try {
      const result = await analyze(file)
      setData(result)
      setView('results')
    } catch (err) {
      setError(err.message)
      setView('error')
    }
  }

  async function handleMultiFile(files) {
    setMode('multi')
    setFileName(`${files.length} files`)
    setData(null)
    setMultiData(null)
    setError(null)
    setActiveTab(0)
    setView('loading')
    try {
      const result = await analyzeMulti(files)
      if (result.files.length === 0) throw new Error('All files failed to process.')
      setMultiData(result)
      setView('results')
    } catch (err) {
      setError(err.message)
      setView('error')
    }
  }

  async function handleFilesSelected(files) {
    const valid = files.filter(f =>
      VALID_EXTENSIONS.includes(f.name.split('.').pop().toLowerCase())
    )

    if (valid.length === 0) {
      setError('No supported files selected. Please upload .csv, .xlsx, or .xls files.')
      setView('error')
      return
    }

    if (mode === 'timeline') {
      if (valid.length > 1) {
        setError('Timeline mode accepts only one file. Please select a single file and try again.')
        setView('error')
        return
      }
      await handleTimelineFile(valid[0])
      return
    }

    if (valid.length === 1) {
      handleSingleFile(valid[0])
    } else {
      handleMultiFile(valid)
    }
  }

  function handleExport() {
    if (data && !multiData) {
      exportCsv(data, fileName)
      return
    }
    if (multiData) {
      if (activeTab === 0) {
        exportCsv(multiData.aggregate, `All_Files_${multiData.file_count}`)
      } else {
        const fr = multiData.files[activeTab - 1]
        exportCsv(fr, fr.file_name)
      }
    }
  }

  function renderMainContent() {
    if (view === 'loading') {
      return <LoadingScreen fileName={fileName} />
    }
    if (view === 'error') {
      return <ErrorPanel error={error} onRetry={handleReset} />
    }
    if (view === 'timeline' && timelineData) {
      return (
        <TimelineView
          timelineData={timelineData}
          fileName={fileName}
          theme={theme}
          onNew={handleReset}
        />
      )
    }
    if (view === 'results') {
      if (multiData) {
        return (
          <MultiResults
            multiData={multiData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onExport={handleExport}
            onNew={handleReset}
          />
        )
      }
      if (data) {
        return (
          <SingleResults
            data={data}
            fileName={fileName}
            onExport={handleExport}
            onNew={handleReset}
          />
        )
      }
    }
    return (
      <HeroUpload
        mode={mode}
        onModeChange={handleModeChange}
        onFilesSelected={handleFilesSelected}
      />
    )
  }

  return (
    <>
      <div id="vanta-bg" className="vanta-bg"></div>
      <div className="app">
        <Topbar theme={theme} onToggleTheme={handleToggleTheme} />
        <main id="main-content">
          {renderMainContent()}
        </main>
        <div id="modal-container"></div>
        <Footer />
      </div>
    </>
  )
}

export default App
