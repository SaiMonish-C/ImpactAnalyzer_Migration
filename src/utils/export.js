// ──────────────────────────────────────────────
//  CSV Export — Number formatting helpers
// ──────────────────────────────────────────────

/** Formats a number with exactly 2 decimal places and US locale grouping. */
function fmtNum(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formats a number as a USD currency string (e.g. "$1,234.56"). */
function fmtUSD(n) {
  return '$' + fmtNum(n);
}

/**
 * Formats an exchange rate for the CSV report.
 * Returns an em-dash for zero/missing rates.
 * Uses 2 decimals for rates >= 10, 4 decimals for smaller rates.
 *
 * @param {number} rate - The exchange rate value.
 * @returns {string} Formatted rate string or '—'.
 */
function fmtRate(rate) {
  if (!rate || rate === 0) return '\u2014';
  const decimals = rate >= 10 ? 2 : 4;
  return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

// ──────────────────────────────────────────────
//  CSV Export — Cell escaping
// ──────────────────────────────────────────────

/**
 * Escapes a cell value for safe inclusion in a CSV file.
 * Wraps the value in double quotes if it contains commas,
 * double quotes, or newlines. Internal quotes are doubled.
 *
 * @param {*} val - The cell value to escape.
 * @returns {string} CSV-safe string.
 */
function escapeCell(val) {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Joins multiple cell values into a single CSV row string,
 * escaping each cell as needed.
 *
 * @param {...*} cells - Cell values for the row.
 * @returns {string} Comma-separated row string.
 */
function csvRow(...cells) {
  return cells.map(escapeCell).join(',');
}

// ──────────────────────────────────────────────
//  CSV Export — Main export function
// ──────────────────────────────────────────────

/**
 * Generates and downloads a complete CSV impact analysis report.
 *
 * The report includes the following sections:
 *  1. Header — report title, source file name, generation timestamp, rate source.
 *  2. Summary — total/unique transaction counts, credit/debit/total USD values.
 *  3. Currency Breakdown — per-currency table with rate, original amounts,
 *     and USD-converted credit/debit/total.
 *  4. PSP Breakdown (if available) — per-PSP table with transaction counts
 *     and USD credit/debit/total.
 *  5. Unsupported Currencies (if any) — list of currencies without exchange rates.
 *
 * The file is saved with a BOM prefix for Excel UTF-8 compatibility,
 * and the filename includes the source name and current date.
 *
 * @param {Object} data - Analysis result (single file or aggregate).
 * @param {string} fileName - Display name used as CSV filename base.
 */
export function exportCsv(data, fileName) {
  const lines = [];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // --- Section 1: Report header ---
  lines.push(csvRow('TRANSACTION IMPACT ANALYSIS REPORT'));
  lines.push(csvRow(''));
  lines.push(csvRow('Source File', fileName));
  lines.push(csvRow('Generated', `${dateStr} at ${timeStr}`));
  if (data.rate_source) lines.push(csvRow('Exchange Rates', data.rate_source));

  // --- Section 2: Summary metrics ---
  lines.push(csvRow(''));
  lines.push(csvRow('SUMMARY'));
  lines.push(csvRow('Metric', 'Value'));
  lines.push(csvRow('Total Transactions (incl. duplicates)', data.summary.total_txn_count.toLocaleString()));
  lines.push(csvRow('Unique Transactions (after dedup)', data.summary.unique_txn_count.toLocaleString()));
  lines.push(csvRow('Total Credit USD (unique)', fmtUSD(data.summary.unique_total_credit_usd)));
  lines.push(csvRow('Total Debit USD (unique)', fmtUSD(data.summary.unique_total_debit_usd)));
  lines.push(csvRow('Total USD Value (unique)', fmtUSD(data.summary.unique_total_amount_usd)));

  // --- Section 3: Per-currency breakdown ---
  if (data.by_currency && data.by_currency.length > 0) {
    lines.push(csvRow(''));
    lines.push(csvRow('BREAKDOWN BY CURRENCY'));
    lines.push(csvRow('Currency', 'Total Txns', 'Unique Txns', 'Rate', 'Original Amount', 'Credit (USD)', 'Debit (USD)', 'Total (USD)'));
    for (const c of data.by_currency) {
      lines.push(csvRow(
        c.currency,
        c.total_txn_count.toLocaleString(),
        c.unique_txn_count.toLocaleString(),
        fmtRate(c.exchange_rate),
        fmtNum(c.original_amount),
        fmtUSD(c.credit_usd),
        fmtUSD(c.debit_usd),
        fmtUSD(c.amount_in_usd),
      ));
    }
  }

  // --- Section 4: Per-PSP breakdown (only if PspName data exists) ---
  if (data.by_psp && data.by_psp.length > 0) {
    lines.push(csvRow(''));
    lines.push(csvRow('BREAKDOWN BY PSP'));
    lines.push(csvRow('PSP Name', 'Total Txns', 'Unique Txns', 'Credit (USD)', 'Debit (USD)', 'Total (USD)'));
    for (const p of data.by_psp) {
      lines.push(csvRow(
        p.psp_name,
        p.total_txn_count.toLocaleString(),
        p.unique_txn_count.toLocaleString(),
        fmtUSD(p.credit_usd),
        fmtUSD(p.debit_usd),
        fmtUSD(p.amount_usd),
      ));
    }
  }

  // --- Section 5: Unsupported currencies warning ---
  if (data.warnings && data.warnings.length > 0) {
    lines.push(csvRow(''));
    lines.push(csvRow('UNSUPPORTED CURRENCIES'));
    lines.push(csvRow('The following currencies could not be converted (no exchange rate found):'));
    lines.push(csvRow(data.warnings.join(', ')));
  }

  // --- Footer ---
  lines.push(csvRow(''));
  lines.push(csvRow('--- End of Report ---'));

  // Build the CSV blob with BOM prefix for Excel UTF-8 compatibility
  const csv = lines.join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Generate a descriptive download filename: <source>_impact_report_<date>.csv
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const timestamp = now.toISOString().slice(0, 10);
  const downloadName = `${baseName}_impact_report_${timestamp}.csv`;

  // Trigger download by creating a temporary anchor element
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
