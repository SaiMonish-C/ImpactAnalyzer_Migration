import { useState } from 'react'
import { IconActivity } from '../Icons'

function fmtRate(rate) {
  if (!rate || rate === 0) return '\u2014'
  const decimals = rate >= 10 ? 2 : 4
  return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals })
}

function fmt(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const COLUMNS = [
  { key: 'currency',          label: 'Currency',      align: 'left'  },
  { key: 'total_txn_count',   label: 'Total Txns',    align: 'right' },
  { key: 'unique_txn_count',  label: 'Unique Txns',   align: 'right' },
  { key: 'exchange_rate',     label: 'Rate',           align: 'right' },
  { key: 'original_amount',   label: 'Original Amt',  align: 'right' },
  { key: 'credit_usd',        label: 'Credit (USD)',   align: 'right' },
  { key: 'debit_usd',         label: 'Debit (USD)',    align: 'right' },
  { key: 'amount_in_usd',     label: 'Total (USD)',    align: 'right' },
]

function CurrencyTable({ data }) {
  const [sortKey, setSortKey] = useState('amount_in_usd')
  const [sortAsc, setSortAsc] = useState(false)

  if (!data || data.length === 0) return null

  function handleSort(key) {
    if (key === sortKey) {
      setSortAsc(a => !a)
    } else {
      setSortKey(key)
      // String columns default ascending; numeric columns default descending
      setSortAsc(typeof data[0][key] === 'string')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    if (typeof va === 'number') return sortAsc ? va - vb : vb - va
    return sortAsc
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va))
  })

  return (
    <div className="table-wrapper stagger stagger-5">
      <div className="section-header">
        <div className="section-icon">{IconActivity}</div>
        <div>
          <h2 className="section-title">Currency Breakdown</h2>
          <p className="section-sub">
            {data.length} currenc{data.length === 1 ? 'y' : 'ies'} detected
          </p>
        </div>
      </div>
      <div className="table-scroll">
        <table id="currency-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={col.align}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <span className="sort-arrow">
                    {col.key === sortKey ? (sortAsc ? ' \u25B2' : ' \u25BC') : ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const isZero = row.amount_in_usd === 0 && row.original_amount > 0
              return (
                <tr key={row.currency} className={isZero ? 'row-warning' : ''}>
                  <td className="left"><span className="currency-code">{row.currency}</span></td>
                  <td className="right">{row.total_txn_count.toLocaleString()}</td>
                  <td className="right">{row.unique_txn_count.toLocaleString()}</td>
                  <td className="right"><span className="text-rate">{fmtRate(row.exchange_rate)}</span></td>
                  <td className="right">{fmt(row.original_amount)}</td>
                  <td className="right"><span className="text-credit">${fmt(row.credit_usd)}</span></td>
                  <td className="right"><span className="text-debit">${fmt(row.debit_usd)}</span></td>
                  <td className="right">
                    <span className={isZero ? 'text-warning' : 'text-money'}>${fmt(row.amount_in_usd)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CurrencyTable
