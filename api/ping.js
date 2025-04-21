export default async function handler(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
  
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
    const key = `visitor:${ip}`;
  
    // Store the IP with a 30-second TTL
    await fetch(`${url}/set/${key}/${now}?EX=30`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  
    // Get all active IP keys
    const keysResp = await fetch(`${url}/keys/visitor:*`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  
    const keys = await keysResp.json();
  
    res.status(200).json({ count: keys.length });
  }
  