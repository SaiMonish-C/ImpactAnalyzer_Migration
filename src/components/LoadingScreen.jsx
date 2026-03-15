function LoadingScreen({ fileName }) {
  return (
    <div className="loading-overlay">
      <div className="spinner-ring"></div>
      <p className="loading-text">Processing {fileName}\u2026</p>
    </div>
  )
}

export default LoadingScreen
