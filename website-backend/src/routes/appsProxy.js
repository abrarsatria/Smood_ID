'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { request } = require('../utils/appsClient');

const router = express.Router();

async function forward(req, res) {
  try {
    // '*' segment is captured in req.params[0]
    const wildcard = req.params[0] || '';
    const targetPath = `/api/${wildcard}`;
    const method = req.method;
    const params = req.query;
    const data = Object.keys(req.body || {}).length ? req.body : undefined;
    const r = await request(method, targetPath, { params, data });
    // mirror upstream status/data
    if (typeof r.data === 'object') {
      return res.status(r.status).json(r.data);
    }
    return res.status(r.status).send(r.data);
  } catch (e) {
    const status = e?.response?.status || 500;
    const data = e?.response?.data || { message: e.message || 'Apps proxy error' };
    return res.status(status).json(data);
  }
}

// Client area proxy -> requires user auth
router.all('/client/apps/*', auth, forward);

// Admin area proxy -> requires admin
router.all('/admin/apps/*', auth, requireAdmin, forward);

module.exports = router;
