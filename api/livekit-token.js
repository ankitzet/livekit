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
      return res.status(500).json({ error: 'LiveKit credentials not configured' });
    }

    // Validate that API key and secret are properly formatted
    if (!livekitApiKey.startsWith('API') || livekitApiSecret.length < 32) {
      console.error('Invalid LiveKit credential format:', {
        apiKeyFormat: livekitApiKey.substring(0, 3),
        secretLength: livekitApiSecret.length
      });
      return res.status(500).json({ error: 'Invalid LiveKit credential format' });
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
    
    // Check if it's a credential-related error
    if (error.message && error.message.includes('cryptographic primitive')) {
      return res.status(500).json({ 
        error: 'Invalid LiveKit credentials. Please check your API key and secret.',
        details: 'The API key and secret do not match or are invalid.'
      });
    }

    res.status(500).json({ error: 'Failed to generate token' });
  }
}