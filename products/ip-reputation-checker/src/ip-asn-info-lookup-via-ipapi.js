// ASN / ISP info lookup qua ip-api.com free tier (45 req/phút, không cần API key)
const IPAPI_BASE = 'http://ip-api.com/json';
const FIELDS = 'query,status,country,countryCode,isp,org,as,asname,reverse';
const FETCH_TIMEOUT_MS = 4000;

/**
 * Lấy thông tin ASN/ISP của IP.
 * @param {string} ip
 * @returns {Promise<{ country, countryCode, isp, org, asn, asname }|null>}
 */
export async function lookupAsn(ip) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${IPAPI_BASE}/${ip}?fields=${FIELDS}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 'success') return null;

    return {
      country:     data.country     ?? null,
      countryCode: data.countryCode ?? null,
      isp:         data.isp         ?? null,
      org:         data.org         ?? null,
      asn:         data.as          ?? null,
      asname:      data.asname      ?? null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
