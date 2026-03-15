import { useState } from 'react'
import Topbar from './components/layout/Topbar'
import Footer from './components/layout/Footer'
import HeroUpload from './components/HeroUpload'
import LoadingScreen from './components/LoadingScreen'
import ErrorPanel from './components/ErrorPanel'
import SingleResults from './components/results/SingleResults'
import MultiResults from './components/results/MultiResults'

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
  const handleRetry       = () => setView('idle')
  const handleExport      = () => {} // Batch 3
  const handleNew         = () => setView('idle')

  function renderMainContent() {
    if (view === 'loading') {
      return <LoadingScreen fileName={fileName} />
    }
    if (view === 'error') {
      return <ErrorPanel error={error} onRetry={handleRetry} />
    }
    if (view === 'results') {
      if (multiData) {
        return (
          <MultiResults
            multiData={multiData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNew={handleNew}
          />
        )
      }
      if (data) {
        return (
          <SingleResults
            data={data}
            fileName={fileName}
            onNew={handleNew}
          />
        )
      }
    }
    return <HeroUpload mode={mode} />
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
