import { AccessToken } from 'livekit-server-sdk';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get LiveKit credentials from environment variables
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

async function testLiveKitCredentials() {
  console.log('🔧 Testing LiveKit credentials...');
  
  // Check if credentials are loaded
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.error('❌ Missing LiveKit credentials in environment variables');
    console.log('Please ensure your .env file contains:');
    console.log('- LIVEKIT_URL');
    console.log('- LIVEKIT_API_KEY');
    console.log('- LIVEKIT_API_SECRET');
    return;
  }
  
  console.log('URL:', LIVEKIT_URL);
  console.log('API Key:', LIVEKIT_API_KEY);
  console.log('API Secret:', LIVEKIT_API_SECRET.substring(0, 10) + '...');
  
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
      
      if (errorText.includes('invalid token') || errorText.includes('cryptographic primitive')) {
        console.log('\n🔍 Token validation failed - this usually means:');
        console.log('1. The API secret is incorrect');
        console.log('2. The API key doesn\'t match the secret');
        console.log('3. The credentials have been rotated');
        console.log('\nPlease verify your credentials at https://cloud.livekit.io');
      }
    }
    
    // Test 3: Validate URL format
    console.log('\n🔍 Test 3: Validating URL format...');
    const urlPattern = /^wss?:\/\/[a-zA-Z0-9.-]+\.livekit\.cloud$/;
    if (urlPattern.test(LIVEKIT_URL)) {
      console.log('✅ URL format is valid');
    } else {
      console.log('⚠️ URL format might be incorrect');
      console.log('Expected format: wss://your-project.livekit.cloud');
    }
    
    // Test 4: Check API key format
    console.log('\n🔑 Test 4: Validating API key format...');
    if (LIVEKIT_API_KEY.startsWith('API') && LIVEKIT_API_KEY.length > 10) {
      console.log('✅ API key format looks correct');
    } else {
      console.log('⚠️ API key format might be incorrect');
      console.log('Expected format: API followed by alphanumeric characters');
    }
    
    // Test 5: Check API secret format
    console.log('\n🔐 Test 5: Validating API secret format...');
    if (LIVEKIT_API_SECRET.length >= 40) {
      console.log('✅ API secret length looks correct');
    } else {
      console.log('⚠️ API secret might be too short');
      console.log('Expected: Long alphanumeric string (40+ characters)');
    }
    
    console.log('\n🎉 LiveKit credential test completed!');
    console.log('\nIf you\'re still getting token errors:');
    console.log('1. Double-check your credentials at https://cloud.livekit.io');
    console.log('2. Make sure you\'re using the correct project');
    console.log('3. Verify the API secret hasn\'t been rotated');
    
  } catch (error) {
    console.error('❌ Error testing LiveKit credentials:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('invalid token') || error.message.includes('cryptographic')) {
      console.log('\n🔍 This error suggests credential issues. Please:');
      console.log('1. Verify your LIVEKIT_API_SECRET is correct');
      console.log('2. Check that API_KEY and API_SECRET are from the same project');
      console.log('3. Ensure credentials haven\'t been rotated');
    }
  }
}

// Run the test
testLiveKitCredentials();