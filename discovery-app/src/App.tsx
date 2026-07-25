import { MatchStack } from './components/MatchStack';
import type { MatchCard } from './types/matching';

const mockCards: MatchCard[] = [
  { 
    id: '1', 
    name: 'Alice, 28', 
    summary: 'Frontend Developer', 
    details: 'Loves React, Framer Motion, and building smooth user interfaces. Looking for a team that values UX.' 
  },
  { 
    id: '2', 
    name: 'Bob, 32', 
    summary: 'UX Designer', 
    details: 'Figma pro with a background in psychology. I prototype in code when needed.' 
  },
  { 
    id: '3', 
    name: 'Charlie, 26', 
    summary: 'Product Manager', 
    details: 'Data-driven PM who loves running A/B tests and talking to customers.' 
  },
  { 
    id: '4', 
    name: 'Diana, 30', 
    summary: 'DevOps Engineer', 
    details: 'Kubernetes enthusiast. If it can be automated, I have already automated it.' 
  },
];

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200">
      <MatchStack 
        cards={mockCards} 
        onComplete={() => alert("You've reviewed everyone!")} 
      />
    </div>
  );
}

export default App;