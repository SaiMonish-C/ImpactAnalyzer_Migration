import * as XLSX from 'xlsx';
import { getExchangeRates } from './rates.js';

/**
 * Parses a raw CSV text string into a 2D array of rows/columns.
 * Handles quoted fields (including escaped double-quotes) and
 * multiple line-ending styles (\n, \r\n, \r).
 *
 * @param {string} text  - The raw CSV content.
 * @param {string} delimiter - Column separator (',' or ';').
 * @returns {string[][]} Array of rows, each row being an array of trimmed field values.
 */
function parseCSV(text, delimiter) {
  const rows = [];
  let current = [];   // fields collected for the current row
  let field = '';      // accumulator for the current field value
  let inQuotes = false; // tracks whether we're inside a quoted field

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      // Inside a quoted field: only a double-quote can change state
      if (ch === '"') {
        // Two consecutive quotes → escaped literal quote
        if (text[i + 1] === '"') { field += '"'; i++; }
        // Single quote → end of the quoted section
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        // Opening quote — enter quoted-field mode
        inQuotes = true;
      } else if (ch === delimiter) {
        // Delimiter encountered — push current field, start next
        current.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        // Line feed or CRLF — finalize current row
        current.push(field.trim());
        field = '';
        if (current.length > 1 || current[0] !== '') rows.push(current);
        current = [];
        if (ch === '\r') i++; // skip the \n half of \r\n
      } else if (ch === '\r') {
        // Bare carriage return (old Mac style) — finalize row
        current.push(field.trim());
        field = '';
        if (current.length > 1 || current[0] !== '') rows.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
  }

  // Flush any remaining field / row after end-of-file
  if (field || current.length > 0) {
    current.push(field.trim());
    if (current.length > 1 || current[0] !== '') rows.push(current);
  }
  return rows;
}

/**
 * Converts a 2D array (first row = headers, rest = data) into
 * an array of objects keyed by header names.
 *
 * @param {string[][]} rows - Parsed CSV rows from parseCSV().
 * @returns {Object[]} Array of row objects, e.g. { CustomerName: '...', Credit: '...', ... }
 */
function csvToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

/**
 * Reads and parses a CSV file, trying multiple text encodings
 * (UTF-8, Windows-1252, ISO-8859-1) and delimiters (',' and ';')
 * until a valid multi-column parse is found.
 *
 * @param {File} file - The uploaded CSV File object.
 * @returns {Promise<Object[]>} Parsed row objects.
 * @throws {Error} If no encoding/delimiter combination produces valid data.
 */
async function readCSV(file) {
  const buffer = await file.arrayBuffer();
  const encodings = ['utf-8', 'windows-1252', 'iso-8859-1'];
  const delimiters = [',', ';'];

  for (const encoding of encodings) {
    let text;
    try { text = new TextDecoder(encoding).decode(buffer); } catch { continue; }
    for (const delimiter of delimiters) {
      const rows = parseCSV(text, delimiter);
      // Accept the first combination that yields at least 2 rows with >1 column
      if (rows.length > 1 && rows[0].length > 1) {
        return csvToObjects(rows);
      }
    }
  }
  throw new Error('Could not read CSV file. Tried multiple encodings and delimiters.');
}

/**
 * Reads and parses an Excel file (.xlsx / .xls) using the SheetJS library.
 * Only the first worksheet is processed.
 *
 * @param {File} file - The uploaded Excel File object.
 * @returns {Promise<Object[]>} Parsed row objects (first sheet only).
 * @throws {Error} If the XLSX library is not loaded on the page.
 */
async function readXLSX(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/**
 * Safely parses a value into a numeric amount.
 * Handles null, empty strings, plain numbers, and European-style
 * comma-as-decimal strings (e.g. "1234,56" → 1234.56).
 *
 * @param {*} value - Raw cell value from the spreadsheet.
 * @returns {number} Parsed amount, or 0 if unparseable.
 */
function parseAmount(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const str = String(value).trim();
  if (str === '') return 0;
  const num = Number(str);
  if (!isNaN(num)) return num;
  // Fallback: treat comma as decimal separator (European format)
  return Number(str.replace(',', '.')) || 0;
}

/** Rounds a number to 2 decimal places (avoids floating-point drift). */
const round2 = n => Math.round(n * 100) / 100;

/**
 * Builds a deduplication key by concatenating the trimmed string values
 * of the specified columns, separated by '|'.
 *
 * @param {Object} row - A single transaction row object.
 * @param {string[]} cols - Column names to include in the key.
 * @returns {string} Pipe-delimited key, e.g. "John|100|0|USD".
 */
function buildDedupKey(row, cols) {
  return cols.map(c => {
    const val = row[c];
    return val == null ? '' : String(val).trim();
  }).join('|');
}

/**
 * Normalizes a raw currency string to uppercase, trimmed.
 * Returns empty string for null/undefined/invalid values so they
 * can be grouped as "unknown" later.
 *
 * @param {*} raw - Raw currency value from the spreadsheet.
 * @returns {string} Uppercase trimmed currency code, or '' if invalid.
 */
function normalizeCurrency(raw) {
  return (raw == null || raw === '' || raw === 'undefined' || raw === 'null')
    ? '' : String(raw).trim().toUpperCase();
}

/**
 * Formats a raw currency value for display purposes.
 * Unlike normalizeCurrency, preserves original casing and returns
 * 'NaN' for invalid/missing values (shown in the UI table).
 *
 * @param {*} raw - Raw currency value.
 * @returns {string} Display-friendly currency string.
 */
function displayCurrency(raw) {
  return (raw == null || raw === '' || raw === 'undefined' || raw === 'null')
    ? 'NaN' : String(raw).trim();
}

/**
 * Parses a RequestTimestamp value into a Date object.
 * Handles ISO strings, common date-time strings, and Excel serial dates.
 *
 * @param {*} value - Raw timestamp from the spreadsheet.
 * @returns {Date|null} Parsed date or null if unparseable.
 */
function parseTimestamp(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + value);
    return epoch;
  }
  const str = String(value).trim();
  if (str === '') return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Truncates a Date to the minute, returning a sortable string key.
 *
 * @param {Date} date
 * @returns {string} Key like "2024-01-15 14:30"
 */
function toMinuteKey(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d} ${h}:${mi}`;
}

/**
 * Timeline analysis: parses a PSP report file and extracts the metadata
 * needed for incident timeline charting (return codes, payment types,
 * and per-minute bucketing).
 *
 * @param {File} file - Uploaded CSV/XLSX/XLS file.
 * @returns {Promise<Object>} { rows, returnCodes, paymentTypes, totalRows, validRows }
 */
export async function analyzeTimeline(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let rows;
  if (ext === 'csv') {
    rows = await readCSV(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    rows = await readXLSX(file);
  } else {
    throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
  }

  if (!rows || rows.length === 0) throw new Error('File is empty or could not be parsed.');

  const requiredCols = ['RequestTimestamp', 'ReturnCode', 'PaymentType', 'UniqueId'];
  const headers = Object.keys(rows[0]);
  const missing = requiredCols.filter(c => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  rows.forEach(row => {
    row._timestamp = parseTimestamp(row.RequestTimestamp);
    row._minuteKey = row._timestamp ? toMinuteKey(row._timestamp) : null;
    row._returnCode = row.ReturnCode == null ? '' : String(row.ReturnCode).trim();
    row._paymentType = row.PaymentType == null ? '' : String(row.PaymentType).trim();
  });

  const validRows = rows.filter(r => r._minuteKey !== null);

  const returnCodes = [...new Set(validRows.map(r => r._returnCode))].filter(Boolean).sort();
  const paymentTypes = [...new Set(validRows.map(r => r._paymentType))].filter(Boolean).sort();

  return { rows: validRows, returnCodes, paymentTypes, totalRows: rows.length, validRows: validRows.length };
}

/**
 * Filters and groups timeline rows into per-minute buckets,
 * counting distinct UniqueId values in each bucket.
 *
 * @param {Object[]} rows - Parsed rows from analyzeTimeline().
 * @param {string[]} selectedCodes - Return codes to include (empty = all).
 * @param {string[]} selectedPaymentTypes - Payment types to include (empty = all).
 * @returns {{ labels: string[], counts: number[], maxCount: number, totalFiltered: number }}
 */
export function computeTimelineBuckets(rows, selectedCodes, selectedPaymentTypes) {
  let filtered = rows;
  if (selectedCodes.length > 0) {
    filtered = filtered.filter(r => selectedCodes.includes(r._returnCode));
  }
  if (selectedPaymentTypes.length > 0) {
    filtered = filtered.filter(r => selectedPaymentTypes.includes(r._paymentType));
  }

  const buckets = {};
  filtered.forEach(r => {
    if (!buckets[r._minuteKey]) buckets[r._minuteKey] = new Set();
    buckets[r._minuteKey].add(String(r.UniqueId).trim());
  });

  const existingKeys = Object.keys(buckets).sort();

  if (existingKeys.length >= 2) {
    const first = new Date(existingKeys[0].replace(' ', 'T') + ':00');
    const last = new Date(existingKeys[existingKeys.length - 1].replace(' ', 'T') + ':00');
    const cursor = new Date(first);
    while (cursor <= last) {
      const key = toMinuteKey(cursor);
      if (!buckets[key]) buckets[key] = new Set();
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
  }

  const allKeys = Object.keys(buckets).sort();
  const labels = allKeys.map(k => k.split(' ')[1]);
  const counts = allKeys.map(k => buckets[k].size);
  const maxCount = Math.max(0, ...counts);
  const totalFiltered = filtered.length;

  return { labels, counts, maxCount, totalFiltered };
}

/**
 * Main analysis pipeline for a single uploaded file.
 *
 * Steps:
 *  1. Read & parse the file (CSV or XLSX).
 *  2. Validate that required columns exist (CustomerName, Credit, Debit, Currency).
 *  3. Parse credit/debit amounts and normalize currency codes on every row.
 *  4. Deduplicate rows using up to 6 preferred columns (AccountHolder,
 *     CustomerName, Brand, Credit, Debit, Currency), falling back to a
 *     smaller set if fewer than 2 preferred columns are present.
 *  5. Fetch live exchange rates (with fallback) and convert credit/debit
 *     independently to USD.
 *  6. Aggregate per-currency breakdown (totals, counts, exchange rates).
 *  7. Aggregate per-PSP breakdown if "PspName" column exists.
 *  8. Return summary, breakdowns, warnings, and rate source metadata.
 *
 * @param {File} file - The uploaded File object (.csv, .xlsx, .xls).
 * @returns {Promise<Object>} Analysis result containing summary, by_currency,
 *          by_psp, warnings, and rate_source.
 * @throws {Error} On unsupported file type, empty file, or missing columns.
 */
export async function analyze(file) {
  // --- Step 1: Parse file based on extension ---
  const ext = file.name.split('.').pop().toLowerCase();
  let rows;
  if (ext === 'csv') {
    rows = await readCSV(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    rows = await readXLSX(file);
  } else {
    throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
  }

  if (!rows || rows.length === 0) throw new Error('File is empty or could not be parsed.');

  // --- Step 2: Validate required columns ---
  const requiredCols = ['CustomerName', 'Credit', 'Debit', 'Currency'];
  const headers = Object.keys(rows[0]);
  const missing = requiredCols.filter(c => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  const totalCount = rows.length;

  // --- Step 3: Parse amounts and normalize currency on every row ---
  // _credit and _debit are kept separate throughout the pipeline
  // _amount is their sum (used for per-currency original totals)
  rows.forEach(row => {
    row._credit = parseAmount(row.Credit);
    row._debit = parseAmount(row.Debit);
    row._amount = row._credit + row._debit;
    row._currency = normalizeCurrency(row.Currency);
  });

  // --- Step 4: Deduplication ---
  // Prefer using all 6 raw columns for the dedup key when available;
  // fall back to a minimal set if fewer than 2 preferred columns exist
  const preferredCols = ['AccountHolder', 'CustomerName', 'Brand', 'Credit', 'Debit', 'Currency'];
  const availablePref = preferredCols.filter(c => headers.includes(c));
  const dedupCols = availablePref.length >= 2
    ? availablePref
    : ['CustomerName', '_credit', '_debit', '_currency'];

  const seen = new Set();
  const deduped = rows.filter(row => {
    const key = buildDedupKey(row, dedupCols);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const uniqueCount = deduped.length;

  // --- Step 5: Exchange rate conversion ---
  // Fetch live rates (primary API → fallback API → hardcoded fallback)
  const { rates, source: rateSource } = await getExchangeRates();

  // Convert credit and debit independently to USD using the currency's rate
  // If rate is 0 or missing, USD value stays 0 (flagged as unsupported)
  deduped.forEach(row => {
    const rate = rates[row._currency];
    row._creditUsd = (rate && rate !== 0) ? row._credit / rate : 0;
    row._debitUsd = (rate && rate !== 0) ? row._debit / rate : 0;
    row._amountUsd = row._creditUsd + row._debitUsd;
  });

  // Identify currencies present in the data but missing from rate tables
  const allCurrencies = new Set();
  deduped.forEach(row => { if (row._currency) allCurrencies.add(row._currency); });

  const knownCurrencies = new Set(Object.keys(rates));
  const unsupported = [...allCurrencies].filter(c => !knownCurrencies.has(c)).sort();

  // --- Step 6: Compute totals and per-currency breakdown ---
  // Unique-only USD totals (credit, debit, combined)
  const uniqueTotalCreditUsd = deduped.reduce((sum, r) => sum + r._creditUsd, 0);
  const uniqueTotalDebitUsd = deduped.reduce((sum, r) => sum + r._debitUsd, 0);
  const uniqueTotalUsd = uniqueTotalCreditUsd + uniqueTotalDebitUsd;

  // Build currency map: first pass counts ALL rows (including duplicates)
  const currencyMap = {};
  rows.forEach(row => {
    const cur = displayCurrency(row.Currency);
    if (!currencyMap[cur]) {
      currencyMap[cur] = {
        currency: cur, total_txn_count: 0, unique_txn_count: 0,
        original_credit: 0, original_debit: 0, original_amount: 0,
        credit_usd: 0, debit_usd: 0, amount_in_usd: 0,
        exchange_rate: 0,
      };
    }
    currencyMap[cur].total_txn_count++;
  });

  // Second pass: accumulate amounts from deduplicated rows only
  deduped.forEach(row => {
    const display = displayCurrency(row.Currency);
    const entry = currencyMap[display];
    if (entry) {
      entry.unique_txn_count++;
      entry.original_credit += row._credit;
      entry.original_debit += row._debit;
      entry.original_amount += row._amount;
      entry.credit_usd += row._creditUsd;
      entry.debit_usd += row._debitUsd;
      entry.amount_in_usd += row._amountUsd;
    }
  });

  // Attach the exchange rate (rate vs USD) to each currency entry
  // Rounded to 6 decimal places for display precision
  for (const entry of Object.values(currencyMap)) {
    const curUpper = entry.currency.toUpperCase().trim();
    const rate = rates[curUpper];
    entry.exchange_rate = (rate && rate !== 0) ? Math.round(rate * 1e6) / 1e6 : 0;
  }

  // Finalize: round all monetary fields and sort descending by USD total
  const byCurrency = Object.values(currencyMap)
    .map(c => ({
      ...c,
      original_credit: round2(c.original_credit),
      original_debit: round2(c.original_debit),
      original_amount: round2(c.original_amount),
      credit_usd: round2(c.credit_usd),
      debit_usd: round2(c.debit_usd),
      amount_in_usd: round2(c.amount_in_usd),
    }))
    .sort((a, b) => b.amount_in_usd - a.amount_in_usd);

  // --- Step 7: Per-PSP breakdown (only if PspName column exists) ---
  let byPsp = null;
  if (headers.includes('PspName')) {
    const pspMap = {};

    // First pass: count all rows per PSP (including duplicates)
    rows.forEach(row => {
      const psp = (row.PspName == null || row.PspName === '') ? 'Unknown' : String(row.PspName).trim();
      if (!pspMap[psp]) {
        pspMap[psp] = {
          psp_name: psp, total_txn_count: 0, unique_txn_count: 0,
          credit_usd: 0, debit_usd: 0, amount_usd: 0,
        };
      }
      pspMap[psp].total_txn_count++;
    });

    // Second pass: accumulate USD amounts from deduplicated rows only
    deduped.forEach(row => {
      const psp = (row.PspName == null || row.PspName === '') ? 'Unknown' : String(row.PspName).trim();
      const entry = pspMap[psp];
      if (entry) {
        entry.unique_txn_count++;
        entry.credit_usd += row._creditUsd;
        entry.debit_usd += row._debitUsd;
        entry.amount_usd += row._amountUsd;
      }
    });

    // Round and sort PSPs by total USD amount descending
    byPsp = Object.values(pspMap)
      .map(p => ({ ...p, credit_usd: round2(p.credit_usd), debit_usd: round2(p.debit_usd), amount_usd: round2(p.amount_usd) }))
      .sort((a, b) => b.amount_usd - a.amount_usd);
  }

  // --- Step 8: Return the complete analysis result ---
  return {
    summary: {
      total_txn_count: totalCount,
      unique_txn_count: uniqueCount,
      unique_total_credit_usd: round2(uniqueTotalCreditUsd),
      unique_total_debit_usd: round2(uniqueTotalDebitUsd),
      unique_total_amount_usd: round2(uniqueTotalUsd),
    },
    by_currency: byCurrency,
    by_psp: byPsp,
    warnings: unsupported,       // currencies with no exchange rate
    rate_source: rateSource,     // human-readable API source string
  };
}

/**
 * Multi-file analysis orchestrator.
 * Processes each file individually via analyze(), then merges the results
 * into a single aggregate view (summing summary fields, merging currency
 * and PSP breakdowns). Files that fail are captured in an errors array
 * rather than aborting the entire batch.
 *
 * @param {File[]} files - Array of uploaded File objects.
 * @returns {Promise<Object>} Combined result with:
 *   - file_count: total files submitted
 *   - aggregate: merged summary/by_currency/by_psp across all successful files
 *   - files: individual per-file results
 *   - errors: array of { file_name, error } for files that failed
 */
export async function analyzeMulti(files) {
  const results = { file_count: files.length, aggregate: null, files: [], errors: [] };

  // Process each file independently; capture errors without stopping
  for (const file of files) {
    try {
      const result = await analyze(file);
      results.files.push({ file_name: file.name, ...result });
    } catch (err) {
      results.errors.push({ file_name: file.name, error: err.message });
    }
  }

  // Build aggregate only if at least one file succeeded
  if (results.files.length > 0) {
    // Initialize aggregate summary counters
    const aggSummary = {
      total_txn_count: 0, unique_txn_count: 0,
      unique_total_credit_usd: 0, unique_total_debit_usd: 0, unique_total_amount_usd: 0,
    };
    const aggCurrencyMap = {};  // keyed by currency display string
    const aggPspMap = {};       // keyed by PSP name
    const allWarnings = new Set();
    const rateSource = results.files[0].rate_source; // use first file's rate source

    for (const fr of results.files) {
      // Sum up high-level summary counts across files
      aggSummary.total_txn_count += fr.summary.total_txn_count;
      aggSummary.unique_txn_count += fr.summary.unique_txn_count;
      aggSummary.unique_total_credit_usd += fr.summary.unique_total_credit_usd;
      aggSummary.unique_total_debit_usd += fr.summary.unique_total_debit_usd;
      aggSummary.unique_total_amount_usd += fr.summary.unique_total_amount_usd;

      // Merge per-currency rows: create entry on first encounter, then accumulate
      for (const c of fr.by_currency) {
        if (!aggCurrencyMap[c.currency]) {
          aggCurrencyMap[c.currency] = {
            currency: c.currency, total_txn_count: 0, unique_txn_count: 0,
            original_credit: 0, original_debit: 0, original_amount: 0,
            credit_usd: 0, debit_usd: 0, amount_in_usd: 0,
            exchange_rate: c.exchange_rate, // same rate across files
          };
        }
        const agg = aggCurrencyMap[c.currency];
        agg.total_txn_count += c.total_txn_count;
        agg.unique_txn_count += c.unique_txn_count;
        agg.original_credit += c.original_credit;
        agg.original_debit += c.original_debit;
        agg.original_amount += c.original_amount;
        agg.credit_usd += c.credit_usd;
        agg.debit_usd += c.debit_usd;
        agg.amount_in_usd += c.amount_in_usd;
      }

      // Merge per-PSP rows (only if the file had a PspName column)
      if (fr.by_psp) {
        for (const p of fr.by_psp) {
          if (!aggPspMap[p.psp_name]) {
            aggPspMap[p.psp_name] = {
              psp_name: p.psp_name, total_txn_count: 0, unique_txn_count: 0,
              credit_usd: 0, debit_usd: 0, amount_usd: 0,
            };
          }
          const agg = aggPspMap[p.psp_name];
          agg.total_txn_count += p.total_txn_count;
          agg.unique_txn_count += p.unique_txn_count;
          agg.credit_usd += p.credit_usd;
          agg.debit_usd += p.debit_usd;
          agg.amount_usd += p.amount_usd;
        }
      }

      // Collect unsupported currencies from all files
      if (fr.warnings) fr.warnings.forEach(w => allWarnings.add(w));
    }

    // Round aggregated summary values to avoid floating-point drift
    aggSummary.unique_total_credit_usd = round2(aggSummary.unique_total_credit_usd);
    aggSummary.unique_total_debit_usd = round2(aggSummary.unique_total_debit_usd);
    aggSummary.unique_total_amount_usd = round2(aggSummary.unique_total_amount_usd);

    // Finalize aggregated currency breakdown: round and sort by USD total
    const aggByCurrency = Object.values(aggCurrencyMap)
      .map(c => ({
        ...c,
        original_credit: round2(c.original_credit),
        original_debit: round2(c.original_debit),
        original_amount: round2(c.original_amount),
        credit_usd: round2(c.credit_usd),
        debit_usd: round2(c.debit_usd),
        amount_in_usd: round2(c.amount_in_usd),
      }))
      .sort((a, b) => b.amount_in_usd - a.amount_in_usd);

    // Finalize aggregated PSP breakdown (null if no files had PspName)
    const aggPspEntries = Object.values(aggPspMap);
    const aggByPsp = aggPspEntries.length > 0
      ? aggPspEntries
          .map(p => ({ ...p, credit_usd: round2(p.credit_usd), debit_usd: round2(p.debit_usd), amount_usd: round2(p.amount_usd) }))
          .sort((a, b) => b.amount_usd - a.amount_usd)
      : null;

    results.aggregate = {
      summary: aggSummary,
      by_currency: aggByCurrency,
      by_psp: aggByPsp,
      warnings: [...allWarnings].sort(),
      rate_source: rateSource,
    };
  }

  return results;
}
