export default function handler(req, res) {
  if (req.method === 'GET') {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: 'development',
      version: '1.0.0',
      services: {
        livekit: process.env.VITE_LIVEKIT_API_KEY ? 'configured' : 'not_configured',
        deepgram: process.env.VITE_DEEPGRAM_API_KEY ? 'configured' : 'not_configured',
        gemini: process.env.VITE_GEMINI_API_KEY ? 'configured' : 'not_configured'
      }
    };
    
    res.status(200).json(healthStatus);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}