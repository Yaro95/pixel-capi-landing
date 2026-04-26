const express = require('express');
const { validateEvent } = require('../middleware/validate');
const capi = require('../services/capi');

const router = express.Router();

router.post('/events', validateEvent, async (req, res) => {
  const { event_name, event_id, event_time, source_url, fbp, fbc, custom_data } = req.body;
  const trafficContext = {
    has_fbp: Boolean(fbp),
    has_fbc: Boolean(fbc),
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
      client_ip_address: req.ip,
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
