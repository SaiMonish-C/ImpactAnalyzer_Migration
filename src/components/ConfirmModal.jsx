import { useEffect } from 'react'
import { createPortal } from 'react-dom'

function ConfirmModal({ onConfirm, onCancel }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const container = document.getElementById('modal-container')
  if (!container) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 className="modal-title">Return to Home?</h3>
        <p className="modal-body">
          You are about to leave the current view. Your analysis results
          will not be saved and you will need to upload the file again.
        </p>
        <ul className="modal-instructions">
          <li>Any results on screen will be cleared</li>
          <li>You will be taken back to the upload page</li>
          <li>The file will need to be re-uploaded to analyze again</li>
        </ul>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} autoFocus>
            Stay Here
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Yes, Go Back
          </button>
        </div>
      </div>
    </div>,
    container,
  )
}

export default ConfirmModal
