export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { participantName, roomName } = req.body;

    if (!participantName || !roomName) {
      return res.status(400).json({ error: 'Missing participantName or roomName' });
    }

    // In a real app, we would use the LiveKit server SDK to generate a token
    // For demo purposes, we'll return a mock token
    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTA3ODAwMDAsImlzcyI6IkFQSVMyU0ZhTndFVnozUiIsIm5hbWUiOiJUZXN0IFVzZXIiLCJuYmYiOjE3NTA2OTM2MDAsInN1YiI6InRlc3QtdXNlciIsInZpZGVvIjp7InJvb20iOiJ0ZXN0LXJvb20iLCJyb29tSm9pbiI6dHJ1ZX19.HS4A0Nj_OdVe9rGFvHFEkCVnrfn2F2WTYUIkTlTDtlk";
    
    res.json({ 
      token: mockToken,
      url: import.meta.env.VITE_LIVEKIT_URL || "wss://test-vumsi8kt.livekit.cloud",
      roomName
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}