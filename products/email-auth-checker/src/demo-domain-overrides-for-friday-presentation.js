// Hardcode demo data cho 3 domains cố định dùng trong buổi demo thứ 6
// Tránh phụ thuộc DNS production trong khi demo live

export const DEMO_OVERRIDES = {
  // Domain đạt điểm cao — cấu hình đầy đủ
  'inet.vn': {
    spf: {
      exists: true,
      record: 'v=spf1 include:_spf.google.com include:amazonses.com ip4:103.90.225.0/24 -all',
      policy: 'strict',
      lookup_count: 3,
      too_many_lookups: false,
      mechanisms: ['include:_spf.google.com', 'include:amazonses.com', 'ip4:103.90.225.0/24', '-all'],
      error: null,
    },
    dkim: {
      exists: true,
      selectors_found: ['google', 'default'],
      selectors_checked: ['default', 'google', 'k1', 's1', 'selector1', 'selector2', 'mail', 'smtp'],
      public_key_snippet: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A…',
      error: null,
    },
    dmarc: {
      exists: true,
      record: 'v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@inet.vn; adkim=s; aspf=s',
      policy: 'reject',
      pct: 100,
      rua: 'mailto:dmarc@inet.vn',
      ruf: null,
      adkim: 's',
      aspf: 's',
      error: null,
    },
  },

  // Domain thất bại hoàn toàn — không có record nào
  'testfail.example': {
    spf: {
      exists: false,
      record: null,
      policy: 'none',
      lookup_count: 0,
      too_many_lookups: false,
      mechanisms: [],
      error: null,
    },
    dkim: {
      exists: false,
      selectors_found: [],
      selectors_checked: ['default', 'google', 'k1', 's1', 'selector1', 'selector2', 'mail', 'smtp'],
      public_key_snippet: null,
      error: null,
    },
    dmarc: {
      exists: false,
      record: null,
      policy: null,
      pct: 100,
      rua: null,
      ruf: null,
      adkim: null,
      aspf: null,
      error: null,
    },
  },

  // Domain cấu hình một phần — SPF ok, DKIM missing, DMARC p=none
  'partial.example': {
    spf: {
      exists: true,
      record: 'v=spf1 include:_spf.google.com ~all',
      policy: 'softfail',
      lookup_count: 1,
      too_many_lookups: false,
      mechanisms: ['include:_spf.google.com', '~all'],
      error: null,
    },
    dkim: {
      exists: false,
      selectors_found: [],
      selectors_checked: ['default', 'google', 'k1', 's1', 'selector1', 'selector2', 'mail', 'smtp'],
      public_key_snippet: null,
      error: null,
    },
    dmarc: {
      exists: true,
      record: 'v=DMARC1; p=none; rua=mailto:reports@partial.example',
      policy: 'none',
      pct: 100,
      rua: 'mailto:reports@partial.example',
      ruf: null,
      adkim: 'r',
      aspf: 'r',
      error: null,
    },
  },
};
