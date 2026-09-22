/**
 * Lucky Dental Care — Global Configuration & Utilities
 * Centralized API Base URL and shared helper functions
 */

(function () {
  'use strict';

  // 1. Centralized API Base URL Configuration & Resilient Fallback (Section 9, 22)
  const API_BASE_URL = 'https://api.luckydentalcare.com';

  const isFile = window.location.protocol === 'file:';
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.local') ||
    isFile
  );

  window.LUCKY_API_BASE_URL = window.LUCKY_API_BASE_OVERRIDE || (
    isLocalhost ? 'http://localhost:5000' : API_BASE_URL
  );
  window.LUCKY_FALLBACK_API_URL = isLocalhost ? API_BASE_URL : 'http://localhost:5000';

  /**
   * Resilient Fetch with Automatic Fallback (Localhost <-> Cloud API)
   * Prevents "Cannot connect to server" when one backend is offline
   */
  window.fetchWithBackendFallback = async function (endpoint, options = {}) {
    const primary = window.LUCKY_API_BASE_URL || 'http://localhost:5000';
    const fallback = window.LUCKY_FALLBACK_API_URL || (primary.includes('localhost') ? API_BASE_URL : 'http://localhost:5000');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

    try {
      const res = await fetch(`${primary}${cleanEndpoint}`, options);
      return res;
    } catch (primaryErr) {
      console.warn(`Lucky API: Primary backend (${primary}) unreachable, attempting fallback (${fallback})...`);
      try {
        const fallbackRes = await fetch(`${fallback}${cleanEndpoint}`, options);
        // Fallback succeeded, remember it for subsequent requests
        window.LUCKY_API_BASE_URL = fallback;
        window.LUCKY_FALLBACK_API_URL = primary;
        return fallbackRes;
      } catch (fallbackErr) {
        throw primaryErr;
      }
    }
  };

  /**
   * Safe Frontend Error Sanitizer (Section 6, 7)
   * Prevents exposure of internal infrastructure, database tech, or stack traces to public visitors
   */
  window.toSafeErrorMessage = function (err, fallbackMsg) {
    if (!err) return fallbackMsg || 'কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    const raw = String(err?.message || err).toLowerCase();
    if (raw.includes('failed to fetch') || raw.includes('network') || raw.includes('connection refused') || raw.includes('econnrefused')) {
      return 'সার্ভারের সাথে এই মুহূর্তে যোগাযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    }
    if (raw.includes('mongo') || raw.includes('database') || raw.includes('db')) {
      return 'ডাটা সেবা এই মুহূর্তে উপলভ্য নয়।';
    }
    if (raw.includes('unauthorized') || raw.includes('password') || raw.includes('credentials') || raw.includes('লগইন')) {
      return 'লগইন তথ্য সঠিক নয়।';
    }
    if (raw.includes('sms')) {
      return 'SMS সেবা এই মুহূর্তে উপলভ্য নয়।';
    }
    return fallbackMsg || 'কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  };

  // 2. Bengali Number Formatter
  window.toBengaliNumerals = function (num) {
    if (num === undefined || num === null || isNaN(num)) return '০';
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const formattedStr = Math.round(Number(num)).toLocaleString('en-IN');
    return formattedStr.replace(/[0-9]/g, function (d) {
      return bengaliDigits[Number(d)];
    });
  };

  // 3. Currency Formatter (৳ x,xxx)
  window.formatBDT = function (amount) {
    return '৳ ' + window.toBengaliNumerals(amount);
  };

  // 4. Polished Toast Notifications
  window.showToast = function (message, type = 'info') {
    let container = document.getElementById('luckyToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'luckyToastContainer';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:var(--font-base);';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#1e293b';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:10px;font-size:0.92rem;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);display:inline-flex;align-items:center;gap:10px;pointer-events:auto;transition:all 0.3s ease;opacity:0;transform:translateY(15px);`;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // 5. Admin Token Session Management
  const TOKEN_KEY = 'lucky_admin_session_token';

  window.LuckyAuth = {
    getToken: function () {
      try {
        return sessionStorage.getItem(TOKEN_KEY) || null;
      } catch (e) {
        return null;
      }
    },
    setToken: function (token) {
      try {
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      } catch (e) {}
    },
    clearToken: function () {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
    },
    isAuthenticated: function () {
      return Boolean(this.getToken());
    }
  };
})();
