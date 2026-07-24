import { fmtUsd } from '../lib/format'

export interface PurchaseIntent {
  label: string
  price: number
  keys: string[]
  note?: string
}

export function ConfirmModal({
  intent,
  onConfirm,
  onCancel,
}: {
  intent: PurchaseIntent
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="modalVeil" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modalTitle">Confirm purchase</h3>
        <div className="modalItem">{intent.label}</div>
        <div className="modalPrice">{fmtUsd(intent.price)}</div>
        {intent.note && <div className="modalNote">{intent.note}</div>}
        <div className="modalNote" style={{ marginTop: 8 }}>
          Demonstration checkout — no payment is processed. The content unlocks immediately
          in this browser.
        </div>
        <div className="modalBtns">
          <button className="cancelBtn" onClick={onCancel}>
            Cancel
          </button>
          <button className="buyBtn" onClick={onConfirm}>
            Purchase &amp; unlock
          </button>
        </div>
      </div>
    </div>
  )
}
