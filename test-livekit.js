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
    console.log('\n🔗 Get credentials from: https://cloud.livekit.io');
    return;
  }
  
  console.log('URL:', LIVEKIT_URL);
  console.log('API Key:', LIVEKIT_API_KEY);
  console.log('API Secret:', LIVEKIT_API_SECRET.substring(0, 10) + '...');
  
  // Pre-validation checks
  console.log('\n🔍 Pre-validation checks...');
  
  // Check URL format
  const urlPattern = /^wss?:\/\/[a-zA-Z0-9.-]+\.livekit\.cloud$/;
  if (!urlPattern.test(LIVEKIT_URL)) {
    console.log('⚠️ URL format might be incorrect');
    console.log('Expected format: wss://your-project.livekit.cloud');
    console.log('Current URL:', LIVEKIT_URL);
  } else {
    console.log('✅ URL format is valid');
  }
  
  // Check API key format
  if (!LIVEKIT_API_KEY.startsWith('API') || LIVEKIT_API_KEY.length < 10) {
    console.log('⚠️ API key format might be incorrect');
    console.log('Expected format: API followed by alphanumeric characters');
    console.log('Current key starts with:', LIVEKIT_API_KEY.substring(0, 5));
  } else {
    console.log('✅ API key format looks correct');
  }
  
  // Check API secret format
  if (LIVEKIT_API_SECRET.length < 32) {
    console.log('⚠️ API secret might be too short');
    console.log('Expected: Long alphanumeric string (32+ characters)');
    console.log('Current length:', LIVEKIT_API_SECRET.length);
  } else {
    console.log('✅ API secret length looks correct');
  }
  
  try {
    // Test: Create an access token
    console.log('\n📝 Testing token generation...');
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
    
    // Test API connection
    console.log('\n🌐 Testing API connection...');
    
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
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful');
      console.log('Response data:', data);
      console.log('\n🎉 All tests passed! Your LiveKit credentials are working correctly.');
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
    
  } catch (error) {
    console.error('❌ Error testing LiveKit credentials:', error.message);
    
    if (error.message.includes('invalid token') || error.message.includes('cryptographic primitive')) {
      console.log('\n🚨 CREDENTIAL ERROR DETECTED');
      console.log('This error indicates that your LiveKit API Key and API Secret don\'t match.');
      console.log('\n📋 To fix this:');
      console.log('1. Go to https://cloud.livekit.io');
      console.log('2. Select your project');
      console.log('3. Go to Settings > Keys');
      console.log('4. Copy BOTH the API Key and API Secret from the SAME row');
      console.log('5. Update your .env file with the correct values');
      console.log('6. Make sure there are no extra spaces or characters');
      console.log('7. Restart your application');
      console.log('\n⚠️ Common issues:');
      console.log('- Using API Key from one project and API Secret from another');
      console.log('- Using old credentials that have been rotated');
      console.log('- Copy-paste errors (extra spaces, missing characters)');
    } else {
      console.error('Full error:', error);
    }
  }
  
  console.log('\n📚 Additional Resources:');
  console.log('- LiveKit Dashboard: https://cloud.livekit.io');
  console.log('- LiveKit Documentation: https://docs.livekit.io');
  console.log('- API Key Management: https://docs.livekit.io/realtime/concepts/authentication/');
}

// Run the test
testLiveKitCredentials();