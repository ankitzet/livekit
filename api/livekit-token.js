import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { participantName, roomName } = req.body;

    if (!participantName || !roomName) {
      return res.status(400).json({ error: 'Missing participantName or roomName' });
    }

    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!livekitApiKey || !livekitApiSecret || !livekitUrl) {
      console.error('Missing LiveKit credentials:', {
        hasApiKey: !!livekitApiKey,
        hasApiSecret: !!livekitApiSecret,
        hasUrl: !!livekitUrl
      });
      return res.status(500).json({ 
        error: 'LiveKit credentials not configured',
        details: 'Please check your environment variables: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL'
      });
    }

    // Enhanced credential validation
    if (!livekitApiKey.startsWith('API')) {
      console.error('Invalid LiveKit API Key format - should start with "API"');
      return res.status(500).json({ 
        error: 'Invalid LiveKit API Key format',
        details: 'API Key should start with "API". Please check your credentials at https://cloud.livekit.io'
      });
    }

    if (livekitApiSecret.length < 32) {
      console.error('Invalid LiveKit API Secret format - too short');
      return res.status(500).json({ 
        error: 'Invalid LiveKit API Secret format',
        details: 'API Secret appears to be too short. Please check your credentials at https://cloud.livekit.io'
      });
    }

    // Validate URL format
    const urlPattern = /^wss?:\/\/[a-zA-Z0-9.-]+\.livekit\.cloud$/;
    if (!urlPattern.test(livekitUrl)) {
      console.error('Invalid LiveKit URL format:', livekitUrl);
      return res.status(500).json({ 
        error: 'Invalid LiveKit URL format',
        details: 'URL should be in format: wss://your-project.livekit.cloud'
      });
    }

    const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: participantName,
      name: participantName,
    });

    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const token = accessToken.toJwt();
    
    res.json({ 
      token,
      url: livekitUrl,
      roomName 
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    
    // Enhanced error handling for credential issues
    if (error.message && (error.message.includes('cryptographic primitive') || error.message.includes('invalid token'))) {
      return res.status(500).json({ 
        error: 'Invalid LiveKit credentials',
        details: 'The API key and secret do not match or are invalid. Please verify your credentials at https://cloud.livekit.io and ensure they are from the same project.',
        troubleshooting: [
          'Check that API Key and API Secret are from the same LiveKit project',
          'Verify credentials haven\'t been rotated or expired',
          'Ensure no extra spaces or characters in the credentials',
          'Visit https://cloud.livekit.io to get fresh credentials'
        ]
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
}