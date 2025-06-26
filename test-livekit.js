import { AccessToken } from 'livekit-server-sdk';
import fetch from 'node-fetch';

// Your LiveKit credentials
const LIVEKIT_URL = 'wss://test-vumsi8kt.livekit.cloud';
const LIVEKIT_API_KEY = 'APIS2SFaNwEVz3R';
const LIVEKIT_API_SECRET = 'jCJoffQwRcIeBGYEqUkYWxOvYMpeNX0hdrG42S1JiUlB';

async function testLiveKitCredentials() {
  console.log('🔧 Testing LiveKit credentials...');
  console.log('URL:', LIVEKIT_URL);
  console.log('API Key:', LIVEKIT_API_KEY);
  
  try {
    // Test 1: Create an access token
    console.log('\n📝 Test 1: Creating access token...');
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: 'test-user',
      name: 'Test User',
    });

    token.addGrant({
      room: 'test-room',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    console.log('✅ Access token created successfully');
    console.log('Token length:', jwt.length);
    
    // Test 2: Make API call to LiveKit server
    console.log('\n🌐 Test 2: Testing API connection...');
    
    // Convert WebSocket URL to HTTP URL for API calls
    const httpUrl = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
    const apiUrl = `${httpUrl}/twirp/livekit.RoomService/ListRooms`;
    
    console.log('API URL:', apiUrl);
    
    // Create authorization header
    const authHeader = `Bearer ${jwt}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({}),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful');
      console.log('Response data:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed');
      console.log('Error response:', errorText);
    }
    
    // Test 3: Validate URL format
    console.log('\n🔍 Test 3: Validating URL format...');
    const urlPattern = /^wss?:\/\/[a-zA-Z0-9.-]+\.livekit\.cloud$/;
    if (urlPattern.test(LIVEKIT_URL)) {
      console.log('✅ URL format is valid');
    } else {
      console.log('⚠️ URL format might be incorrect');
    }
    
    // Test 4: Check API key format
    console.log('\n🔑 Test 4: Validating API key format...');
    if (LIVEKIT_API_KEY.startsWith('API') && LIVEKIT_API_KEY.length > 10) {
      console.log('✅ API key format looks correct');
    } else {
      console.log('⚠️ API key format might be incorrect');
    }
    
    console.log('\n🎉 LiveKit credential test completed!');
    
  } catch (error) {
    console.error('❌ Error testing LiveKit credentials:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testLiveKitCredentials();