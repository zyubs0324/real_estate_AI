'use client'

interface ConfirmDialogProps {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ width: 360, maxWidth: '90vw', borderRadius: 12, background: '#fff', padding: 24 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
        {description && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgba(0,0,0,0.56)' }}>{description}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button type="button" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} style={{ color: '#ff3b30' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
