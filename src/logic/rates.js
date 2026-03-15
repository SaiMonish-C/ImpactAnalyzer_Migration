/**
 * Hardcoded fallback exchange rates (currency → USD).
 * Used when both live API calls fail. Values are approximate
 * and may become outdated — live rates are always preferred.
 * Covers 150+ currencies including major, minor, and exotic pairs.
 */
const FALLBACK_RATES = {
  USD: 1.0, EUR: 0.92, GBP: 0.79, AUD: 1.53, BRL: 5.05,
  CHF: 0.88, AED: 3.67, AFN: 71.0, ALL: 96.0, AMD: 390.0,
  ANG: 1.79, AOA: 920.0, ARS: 1050.0, AWG: 1.79, AZN: 1.70,
  BAM: 1.80, BBD: 2.0, BDT: 110.0, BGN: 1.80, BHD: 0.376,
  BIF: 2870.0, BMD: 1.0, BND: 1.34, BOB: 6.91, BSD: 1.0,
  BTN: 83.0, BWP: 13.6, BYN: 3.27, BZD: 2.0, CAD: 1.36,
  CDF: 2750.0, CLP: 950.0, CNY: 7.25, COP: 4000.0, CRC: 515.0,
  CUP: 24.0, CVE: 101.0, CZK: 23.0, DJF: 177.7, DKK: 6.9,
  DOP: 58.5, DZD: 135.0, EGP: 49.0, ERN: 15.0, ETB: 57.0,
  FJD: 2.27, FKP: 0.79, GEL: 2.73, GHS: 15.5, GIP: 0.79,
  GMD: 68.0, GNF: 8600.0, GTQ: 7.75, GYD: 209.0, HKD: 7.82,
  HNL: 24.7, HRK: 6.93, HTG: 132.0, HUF: 360.0, IDR: 15800.0,
  ILS: 3.7, INR: 83.0, IQD: 1310.0, IRR: 42000.0, ISK: 137.0,
  JMD: 155.0, JOD: 0.71, JPY: 150.0, KES: 129.0, KGS: 89.5,
  KHR: 4100.0, KMF: 453.0, KRW: 1320.0, KWD: 0.307, KYD: 0.833,
  KZT: 460.0, LAK: 21000.0, LBP: 89500.0, LKR: 298.0, LRD: 194.0,
  LSL: 18.5, LYD: 4.85, MAD: 10.0, MDL: 17.7, MGA: 4550.0,
  MKD: 56.5, MMK: 2100.0, MNT: 3430.0, MOP: 8.06, MRU: 39.7,
  MUR: 45.5, MVR: 15.4, MWK: 1740.0, MXN: 17.5, MYR: 4.7,
  MZN: 63.9, NAD: 18.5, NGN: 1600.0, NIO: 36.7, NOK: 10.8,
  NPR: 133.0, NZD: 1.62, OMR: 0.385, PAB: 1.0, PEN: 3.8,
  PGK: 3.92, PHP: 56.0, PKR: 278.0, PLN: 4.0, PYG: 7500.0,
  QAR: 3.64, RON: 4.58, RSD: 108.0, RUB: 92.0, RWF: 1320.0,
  SAR: 3.75, SBD: 8.48, SCR: 14.2, SDG: 601.0, SEK: 10.5,
  SGD: 1.34, SHP: 0.79, SLE: 22.6, SOS: 571.0, SRD: 36.2,
  SSP: 1300.0, STN: 22.5, SYP: 13000.0, SZL: 18.5, THB: 35.0,
  TJS: 10.93, TMT: 3.50, TND: 3.12, TOP: 2.38, TRY: 32.0,
  TTD: 6.78, TWD: 31.5, TZS: 2640.0, UAH: 41.2, UGX: 3780.0,
  UYU: 39.5, UZS: 12700.0, VES: 36.5, VND: 25400.0, VUV: 121.0,
  WST: 2.79, XAF: 603.0, XCD: 2.70, XOF: 603.0, XPF: 110.0,
  YER: 250.0, ZAR: 18.5, ZMW: 27.0, ZWG: 25.58, ZWL: 14000.0,
};

/**
 * Attempts to fetch live exchange rates from the ExchangeRate-API (primary source).
 * Uses USD as the base currency. Includes a 10-second timeout to avoid
 * hanging on slow/unresponsive connections.
 *
 * @returns {Promise<Object|null>} Rate map { currency: rate } or null on failure.
 */
async function fetchExchangeRateAPI() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    if (data.result !== 'success') throw new Error('API error');
    const rates = data.rates || {};
    rates.USD = 1.0; // ensure USD is always present as the base
    return rates;
  } catch {
    return null;
  }
}

/**
 * Attempts to fetch live exchange rates from the Frankfurter API (secondary source).
 * Used as a fallback when the primary ExchangeRate-API is unavailable.
 * Also includes a 10-second timeout.
 *
 * @returns {Promise<Object|null>} Rate map { currency: rate } or null on failure.
 */
async function fetchFrankfurterAPI() {
  try {
    const res = await fetch('https://api.frankfurter.dev/latest?base=USD', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const rates = data.rates || {};
    rates.USD = 1.0; // ensure USD is always present as the base
    return rates;
  } catch {
    return null;
  }
}

/**
 * Fetches exchange rates using a cascading strategy:
 *  1. Try ExchangeRate-API (primary — broadest currency coverage).
 *  2. If that fails, try Frankfurter API (secondary — fewer currencies).
 *  3. If both fail, use hardcoded FALLBACK_RATES (may be outdated).
 *
 * When a live API succeeds, any currencies missing from the API response
 * are backfilled from FALLBACK_RATES to maximize coverage.
 *
 * All currency codes are normalized to uppercase and trimmed in the
 * returned rate map to ensure consistent lookups.
 *
 * @returns {Promise<{ rates: Object, source: string }>}
 *   - rates: Normalized map of { CURRENCY_CODE: rate_vs_USD }
 *   - source: Human-readable string describing where the rates came from
 */
export async function getExchangeRates() {
  // Try primary API first
  let rates = await fetchExchangeRateAPI();
  let source = '';

  if (rates) {
    source = `ExchangeRate-API (${Object.keys(rates).length} currencies)`;
  } else {
    // Fall back to secondary API
    rates = await fetchFrankfurterAPI();
    if (rates) {
      source = `Frankfurter API (${Object.keys(rates).length} currencies)`;
    }
  }

  if (!rates) {
    // Both APIs failed — use hardcoded fallback as last resort
    source = 'Hardcoded fallback (may be outdated)';
    rates = { ...FALLBACK_RATES };
  } else {
    // Backfill any currencies the API didn't cover using the fallback table
    for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
      if (!(code in rates)) rates[code] = rate;
    }
  }

  // Normalize all keys to uppercase and trimmed for consistent lookups
  const normalized = {};
  for (const [k, v] of Object.entries(rates)) {
    normalized[k.toUpperCase().trim()] = v;
  }

  return { rates: normalized, source };
}
