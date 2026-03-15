import { useState } from 'react'
import Topbar from './components/layout/Topbar'
import Footer from './components/layout/Footer'
import HeroUpload from './components/HeroUpload'

function App() {
  const [view, setView]                 = useState('idle')
  const [mode, setMode]                 = useState('single')
  const [theme, setTheme]               = useState('dark')
  const [error, setError]               = useState(null)
  const [data, setData]                 = useState(null)
  const [multiData, setMultiData]       = useState(null)
  const [timelineData, setTimelineData] = useState(null)
  const [activeTab, setActiveTab]       = useState(0)

  const handleToggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <>
      <div id="vanta-bg" className="vanta-bg"></div>
      <div className="app">
        <Topbar theme={theme} onToggleTheme={handleToggleTheme} />
        <main id="main-content">
          <HeroUpload mode={mode} />
        </main>
        <div id="modal-container"></div>
        <Footer />
      </div>
    </>
  )
}

export default App
