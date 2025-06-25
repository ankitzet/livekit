import type { InterviewBlock } from '@/hooks/use-interview-timer';

export function parseInterviewPlan(planText: string): InterviewBlock[] {
  console.log('🔧 parseInterviewPlan called with:', JSON.stringify(planText));
  
  if (!planText || !planText.trim()) {
    console.log('🔧 Empty plan text, returning empty array');
    return [];
  }

  const lines = planText.split('\n').filter(line => line.trim());
  console.log('🔧 Lines to parse:', lines);
  
  const blocks: InterviewBlock[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    console.log('🔧 Processing line:', trimmedLine);
    
    // Match patterns like "Intro - 10", "Project discussion - 15", "start - 1", etc.
    const match = trimmedLine.match(/^(.+?)\s*-\s*(\d+)$/);
    console.log('🔧 Match result:', match);
    
    if (match) {
      const label = match[1].trim();
      const minutes = parseInt(match[2], 10);
      
      console.log('🔧 Extracted:', { label, minutes });
      
      if (label && minutes > 0) {
        blocks.push({ label, minutes });
        console.log('🔧 Added block:', { label, minutes });
      }
    }
  }

  console.log('🔧 Final parsed blocks:', blocks);
  return blocks;
}

export function formatInterviewPlan(blocks: InterviewBlock[]): string {
  return blocks.map(block => `${block.label} - ${block.minutes}`).join('\n');
}

export function calculateTotalTime(blocks: InterviewBlock[]): number {
  return blocks.reduce((total, block) => total + block.minutes, 0);
}

export function getBlockAtTime(blocks: InterviewBlock[], elapsedMinutes: number): { 
  currentBlock: InterviewBlock | null; 
  nextBlock: InterviewBlock | null;
  blockIndex: number;
} {
  if (!blocks.length) {
    return { currentBlock: null, nextBlock: null, blockIndex: -1 };
  }

  let cumulative = 0;
  
  for (let i = 0; i < blocks.length; i++) {
    cumulative += blocks[i].minutes;
    
    if (elapsedMinutes < cumulative) {
      return {
        currentBlock: blocks[i],
        nextBlock: i < blocks.length - 1 ? blocks[i + 1] : null,
        blockIndex: i
      };
    }
  }

  // If we've exceeded all planned time, return the last block
  return {
    currentBlock: blocks[blocks.length - 1],
    nextBlock: null,
    blockIndex: blocks.length - 1
  };
}