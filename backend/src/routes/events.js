const express = require('express');
const { validateEvent } = require('../middleware/validate');
const capi = require('../services/capi');

const router = express.Router();

function normalizeIp(value) {
  if (!value) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  return normalized.startsWith('::ffff:')
    ? normalized.slice(7)
    : normalized;
}

function readForwardedIp(headerValue) {
  if (!headerValue) return null;

  const firstValue = String(headerValue)
    .split(',')
    .map((part) => normalizeIp(part))
    .find(Boolean);

  return firstValue || null;
}

function getClientIp(req) {
  const cfConnectingIp = normalizeIp(req.get('cf-connecting-ip'));
  if (cfConnectingIp) {
    return { value: cfConnectingIp, source: 'cf-connecting-ip' };
  }

  const forwardedIp = readForwardedIp(req.get('x-forwarded-for'));
  if (forwardedIp) {
    return { value: forwardedIp, source: 'x-forwarded-for' };
  }

  const requestIp = normalizeIp(req.ip);
  return {
    value: requestIp,
    source: 'req.ip'
  };
}

function getIpVersion(ip) {
  if (!ip) return null;
  return ip.includes(':') ? 'ipv6' : 'ipv4';
}

router.post('/events', validateEvent, async (req, res) => {
  const { event_name, event_id, event_time, source_url, fbp, fbc, custom_data } = req.body;
  const clientIp = getClientIp(req);
  const trafficContext = {
    has_fbp: Boolean(fbp),
    has_fbc: Boolean(fbc),
    contact_method: custom_data?.contact_method || null,
    client_ip_source: clientIp.source,
    client_ip_version: getIpVersion(clientIp.value),
    page_variant: custom_data?.page_variant || null,
    page_path: custom_data?.page_path || null,
    source_url: source_url || null
  };

  try {
    await capi.sendEvent({
      event_name,
      event_id,
      event_time,
      source_url,
      fbp,
      fbc,
      custom_data,
      client_ip_address: clientIp.value,
      client_user_agent: req.get('user-agent')
    });

    console.log('CAPI event sent', {
      event_name,
      event_id,
      status: 200,
      ...trafficContext
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('CAPI event failed', {
      event_name,
      event_id,
      status: 502,
      ...trafficContext
    });

    return res.status(502).json({ error: 'Failed to send event' });
  }
});

module.exports = router;
