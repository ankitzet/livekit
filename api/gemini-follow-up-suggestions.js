export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { transcriptText, jobDescription, customInstruction } = req.body;

    if (!transcriptText) {
      return res.status(400).json({ error: 'Transcript text is required' });
    }

    // For demo purposes, we'll return mock suggestions
    // In a real app, this would call the Gemini API
    
    let suggestions = [];
    
    if (customInstruction && customInstruction.includes('technical')) {
      suggestions = [
        {
          question: "Could you explain the technical architecture of your most complex project?",
          reasoning: "Assesses depth of technical knowledge and system design skills"
        },
        {
          question: "What technical challenges did you face in your previous role and how did you overcome them?",
          reasoning: "Evaluates problem-solving abilities and technical resilience"
        }
      ];
    } else if (jobDescription && jobDescription.includes('operations')) {
      suggestions = [
        {
          question: "How would you approach scaling operations in a high-growth environment?",
          reasoning: "Directly relevant to the operations role mentioned in the job description"
        },
        {
          question: "Tell me about a time when you improved an operational process. What metrics did you use to measure success?",
          reasoning: "Assesses practical experience with operational improvements"
        }
      ];
    } else {
      // Default suggestions
      suggestions = [
        {
          question: "Can you elaborate on how you handled a difficult situation with a team member?",
          reasoning: "Evaluates interpersonal skills and conflict resolution abilities"
        },
        {
          question: "What's your approach to learning new technologies or methodologies?",
          reasoning: "Assesses adaptability and continuous learning mindset"
        },
        {
          question: "How do you prioritize tasks when working on multiple projects with competing deadlines?",
          reasoning: "Evaluates time management and prioritization skills"
        }
      ];
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Error generating follow-up suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}