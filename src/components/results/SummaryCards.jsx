function fmtInt(n) {
  return n.toLocaleString('en-US')
}

function fmtUSD(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function SummaryCards({ summary }) {
  const dupCount = summary.total_txn_count - summary.unique_txn_count

  const cards = [
    {
      label: 'Total Transactions',
      value: fmtInt(summary.total_txn_count),
      sub: 'Including duplicates',
      cls: '',
      idx: 2,
    },
    {
      label: 'Unique Transactions',
      value: fmtInt(summary.unique_txn_count),
      sub: dupCount > 0 ? fmtInt(dupCount) + ' duplicates removed' : 'No duplicates found',
      cls: 'card-gold',
      idx: 2,
    },
    {
      label: 'Total Credit',
      value: fmtUSD(summary.unique_total_credit_usd),
      sub: 'Converted to USD',
      cls: 'card-credit',
      idx: 3,
    },
    {
      label: 'Total Debit',
      value: fmtUSD(summary.unique_total_debit_usd),
      sub: 'Converted to USD',
      cls: 'card-debit',
      idx: 3,
    },
    {
      label: 'Total USD Value',
      value: fmtUSD(summary.unique_total_amount_usd),
      sub: 'Credit + Debit combined',
      cls: 'card-total',
      idx: 4,
    },
  ]

  return (
    <div className="summary-cards">
      {cards.map((c, i) => (
        <div key={i} className={`card${c.cls ? ' ' + c.cls : ''} stagger stagger-${c.idx}`}>
          <div className="card-icon-row">
            <div className="card-dot"></div>
            <div className="card-label">{c.label}</div>
          </div>
          <div className="card-value">{c.value}</div>
          <div className="card-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default SummaryCards
