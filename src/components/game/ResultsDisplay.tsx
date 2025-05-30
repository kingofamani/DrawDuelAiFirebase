import type { EvaluateDrawingsOutput } from '@/ai/flows/evaluate-drawings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trophy, Star, MessageSquare } from 'lucide-react';
import Image from 'next/image';

interface ResultsDisplayProps {
  results: EvaluateDrawingsOutput;
  topic: string;
  topicZh?: string;
  drawing1DataUri?: string; 
  drawing2DataUri?: string; 
}

export function ResultsDisplay({ results, topic, topicZh, drawing1DataUri, drawing2DataUri }: ResultsDisplayProps) {
  const getWinnerHighlightClass = (player: 'drawing1' | 'drawing2' | 'tie') => {
    if (results.winner === player) {
      return 'border-accent ring-2 ring-accent shadow-lg scale-105';
    }
    if (results.winner === 'tie' && player !== 'tie') {
      return 'border-yellow-500 ring-2 ring-yellow-500';
    }
    return 'opacity-80';
  };
  
  const PlayerResultCard = ({
    playerName,
    score,
    feedback,
    feedbackZh,
    drawingDataUri,
    highlightClass,
  }: {
    playerName: string;
    score: number;
    feedback: string;
    feedbackZh: string;
    drawingDataUri?: string;
    highlightClass: string;
  }) => (
    <Card className={`w-full transition-all duration-300 ${highlightClass}`}>
      <CardHeader>
        <CardTitle className="text-2xl text-center text-primary">{playerName}</CardTitle>
        {drawingDataUri && (
          <div className="mt-2 aspect-video relative w-full rounded-md overflow-hidden border">
             <Image src={drawingDataUri} alt={`${playerName} drawing`} layout="fill" objectFit="contain" data-ai-hint="evaluated drawing" unoptimized={drawingDataUri.startsWith('data:image')}/>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center text-4xl font-bold text-accent">
          <Star className="w-8 h-8 mr-2 fill-accent" />
          {score} <span className="text-2xl text-muted-foreground">/100</span>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground italic">Feedback (EN):</p>
          <p className="text-foreground/90 text-center break-words">&quot;{feedback}&quot;</p>
          {feedbackZh && (
            <>
              <p className="text-sm text-muted-foreground italic mt-2">Feedback (中):</p>
              <p className="text-foreground/90 text-center break-words">&quot;{feedbackZh}&quot;</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <Card className="text-center bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center justify-center">
            <Trophy className="w-10 h-10 mr-3" /> Game Over!
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 text-lg">
            Topic (EN): &quot;{topic}&quot;
            {topicZh && <span className="block mt-1 text-md">Topic (中): &quot;{topicZh}&quot;</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="text-2xl font-semibold mb-4">
            Winner: {results.winner === 'tie' ? 'It\'s a Tie!' : results.winner === 'drawing1' ? 'Player 1' : 'Player 2'}
          </h2>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <PlayerResultCard
          playerName="Player 1"
          score={results.drawing1Score}
          feedback={results.drawing1Feedback}
          feedbackZh={results.drawing1FeedbackZh}
          drawingDataUri={drawing1DataUri}
          highlightClass={getWinnerHighlightClass('drawing1')}
        />
        <PlayerResultCard
          playerName="Player 2"
          score={results.drawing2Score}
          feedback={results.drawing2Feedback}
          feedbackZh={results.drawing2FeedbackZh}
          drawingDataUri={drawing2DataUri}
          highlightClass={getWinnerHighlightClass('drawing2')}
        />
      </div>
    </div>
  );
}
