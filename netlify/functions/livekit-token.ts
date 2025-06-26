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
        body: JSON.stringify({ 
          error: 'LiveKit credentials not configured',
          details: 'Please check your environment variables: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL'
        })
      };
    }

    // Enhanced credential validation
    if (!apiKey.startsWith('API')) {
      console.error('Invalid LiveKit API Key format - should start with "API"');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid LiveKit API Key format',
          details: 'API Key should start with "API". Please check your credentials at https://cloud.livekit.io'
        })
      };
    }

    if (apiSecret.length < 32) {
      console.error('Invalid LiveKit API Secret format - too short');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid LiveKit API Secret format',
          details: 'API Secret appears to be too short. Please check your credentials at https://cloud.livekit.io'
        })
      };
    }

    // Validate URL format
    const urlPattern = /^wss?:\/\/[a-zA-Z0-9.-]+\.livekit\.cloud$/;
    if (!urlPattern.test(livekitUrl)) {
      console.error('Invalid LiveKit URL format:', livekitUrl);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid LiveKit URL format',
          details: 'URL should be in format: wss://your-project.livekit.cloud'
        })
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
    
    // Enhanced error handling for credential issues
    if (error.message && (error.message.includes('cryptographic primitive') || error.message.includes('invalid token'))) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Invalid LiveKit credentials',
          details: 'The API key and secret do not match or are invalid. Please verify your credentials at https://cloud.livekit.io and ensure they are from the same project.',
          troubleshooting: [
            'Check that API Key and API Secret are from the same LiveKit project',
            'Verify credentials haven\'t been rotated or expired',
            'Ensure no extra spaces or characters in the credentials',
            'Visit https://cloud.livekit.io to get fresh credentials'
          ]
        })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate token',
        details: error.message 
      })
    };
  }
};