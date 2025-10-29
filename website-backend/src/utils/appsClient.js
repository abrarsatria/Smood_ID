'use strict';

const axios = require('axios');

const APPS_API_URL = process.env.APPS_API_URL || 'http://localhost:8000';
const APPS_SERVICE_USERNAME = process.env.APPS_SERVICE_USERNAME || process.env.APPS_USERNAME || '';
const APPS_SERVICE_PASSWORD = process.env.APPS_SERVICE_PASSWORD || process.env.APPS_PASSWORD || '';

let tokenCache = {
  token: null,
  // naive expiry control; apps token expires in 24h, we refresh on 401 as well
  obtainedAt: 0,
};
// Token cache per base URL for multi-instance calls
const tokenCacheByBase = new Map(); // baseUrl -> { token, obtainedAt }

async function login(baseUrl = APPS_API_URL) {
  if (!APPS_SERVICE_USERNAME || !APPS_SERVICE_PASSWORD) {
    console.error('APPS service credentials not configured:', { username: APPS_SERVICE_USERNAME ? 'SET' : 'NOT_SET', password: APPS_SERVICE_PASSWORD ? 'SET' : 'NOT_SET' });
    throw new Error('APPS service credentials are not configured');
  }
  console.log('DEBUG: Attempting login to Apps instance', { baseUrl, username: APPS_SERVICE_USERNAME });
  try {
    const { data } = await axios.post(`${baseUrl}/api/auth/login`, {
      username: APPS_SERVICE_USERNAME,
      password: APPS_SERVICE_PASSWORD,
    });
    console.log('DEBUG: Apps login response received', { hasToken: !!data?.token, baseUrl });
    if (!data?.token) throw new Error('APPS login failed: token missing');
    if (baseUrl === APPS_API_URL) {
      tokenCache = { token: data.token, obtainedAt: Date.now() };
    } else {
      tokenCacheByBase.set(baseUrl, { token: data.token, obtainedAt: Date.now() });
    }
    return data.token;
  } catch (err) {
    console.error('DEBUG: Apps login failed', {
      baseUrl,
      username: APPS_SERVICE_USERNAME,
      error: err?.response?.data || err?.message,
      status: err?.response?.status
    });
    throw err;
  }
}

async function ensureToken(baseUrl = APPS_API_URL) {
  if (baseUrl === APPS_API_URL) {
    if (tokenCache.token) return tokenCache.token;
    return await login(baseUrl);
  }
  const cached = tokenCacheByBase.get(baseUrl);
  if (cached?.token) return cached.token;
  return await login(baseUrl);
}

async function request(method, path, { params, data, headers } = {}) {
  let token = await ensureToken(APPS_API_URL);
  try {
    const res = await axios({
      method,
      url: `${APPS_API_URL}${path.startsWith('/') ? path : '/' + path}`,
      params,
      data,
      headers: { ...(headers || {}), Authorization: `Bearer ${token}` },
    });
    return res;
  } catch (err) {
    if (err?.response?.status === 401) {
      // refresh token and retry once
      token = await login(APPS_API_URL);
      const res = await axios({
        method,
        url: `${APPS_API_URL}${path.startsWith('/') ? path : '/' + path}`,
        params,
        data,
        headers: { ...(headers || {}), Authorization: `Bearer ${token}` },
      });
      return res;
    }
    throw err;
  }
}

// Request ke baseUrl tertentu (per instance Apps)
async function requestTo(baseUrl, method, path, { params, data, headers } = {}) {
  const base = baseUrl?.replace(/\/$/, '') || APPS_API_URL;
  let token = await ensureToken(base);
  try {
    const res = await axios({
      method,
      url: `${base}${path.startsWith('/') ? path : '/' + path}`,
      params,
      data,
      headers: { ...(headers || {}), Authorization: `Bearer ${token}` },
    });
    return res;
  } catch (err) {
    if (err?.response?.status === 401) {
      token = await login(base);
      const res = await axios({
        method,
        url: `${base}${path.startsWith('/') ? path : '/' + path}`,
        params,
        data,
        headers: { ...(headers || {}), Authorization: `Bearer ${token}` },
      });
      return res;
    }
    throw err;
  }
}

module.exports = { request, requestTo };
