function ErrorPanel({ error, onRetry }) {
  return (
    <div className="error-panel stagger">
      <p>Analysis Failed</p>
      <p className="error-detail">{error}</p>
      <br />
      <button className="btn btn-primary" onClick={onRetry}>Try Again</button>
    </div>
  )
}

export default ErrorPanel
