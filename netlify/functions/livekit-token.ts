import { Handler } from '@netlify/functions';
import { AccessToken } from 'livekit-server-sdk';

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { roomName, participantName } = JSON.parse(event.body || '{}');

    if (!roomName || !participantName) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Room name and participant name are required' })
      };
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('Missing LiveKit credentials:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasUrl: !!livekitUrl
      });
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'LiveKit credentials not configured' })
      };
    }

    // Validate that API key and secret are properly formatted
    if (!apiKey.startsWith('API') || apiSecret.length < 32) {
      console.error('Invalid LiveKit credential format:', {
        apiKeyFormat: apiKey.substring(0, 3),
        secretLength: apiSecret.length
      });
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid LiveKit credential format' })
      };
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName.split('-').pop() || participantName
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();
    const meetingId = Date.now();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: jwt,
        url: livekitUrl,
        roomName,
        meetingId
      })
    };
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    
    // Check if it's a credential-related error
    if (error.message && error.message.includes('cryptographic primitive')) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid LiveKit credentials. Please check your API key and secret.',
          details: 'The API key and secret do not match or are invalid.'
        })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to generate token' })
    };
  }
};