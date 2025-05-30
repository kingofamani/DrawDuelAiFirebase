'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useMqtt } from '@/hooks/useMqtt';
import { useToast } from '@/hooks/use-toast';
import type { MqttMessage, PlayerSlot, PlayerAssignedPayload, GameStartPayload, DrawingUpdatePayload, GameResultsPayload, ErrorMessagePayload } from '@/types/mqtt';
import { DrawingCanvas } from '@/components/game/DrawingCanvas';
import { CountdownTimer } from '@/components/game/CountdownTimer';
import { ResultsDisplay } from '@/components/game/ResultsDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, CheckCircle, Clock, Loader2, AlertTriangle, Eye, Image as ImageIcon, User } from 'lucide-react';
import Image from 'next/image';
import type { EvaluateDrawingsOutput } from '@/ai/flows/evaluate-drawings';


type StudentGameState = 'idle' | 'waiting_for_assignment' | 'ready_to_draw' | 'drawing' | 'judging' | 'results' | 'game_ended_early';

export default function StudentPage() {
  const [gameState, setGameState] = useState<StudentGameState>('idle');
  const [topic, setTopic] = useState<string>('');
  const [mySlot, setMySlot] = useState<PlayerSlot | null>(null);
  const [myName, setMyName] = useState<string>('You');
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const [myDrawingData, setMyDrawingData] = useState<string>('data:,'); // Start with empty data URI
  const [opponentDrawingData, setOpponentDrawingData] = useState<string>('https://placehold.co/400x300.png?text=Waiting...');
  
  const [results, setResults] = useState<EvaluateDrawingsOutput | null>(null);
  const { toast } = useToast();

  const handleMqttMessage = useCallback((receivedTopic: string, message: MqttMessage) => {
    console.log("Student received MQTT message:", message);
    switch (message.type) {
      case 'NEW_GAME_ANNOUNCEMENT':
        // If student joins mid-announcement or page reloads
        if (gameState === 'idle' || gameState === 'waiting_for_assignment') {
          setTopic(message.payload.topic);
          // Student still needs to join
        }
        break;
      case 'PLAYER_ASSIGNED':
        const assignPayload = message.payload as PlayerAssignedPayload;
        if (assignPayload.studentId === getClientId()) {
          setMySlot(assignPayload.slot);
          setTopic(assignPayload.topic);
          setGameState('ready_to_draw');
          setMyName(assignPayload.assignedName || (assignPayload.slot === 'player1' ? "Player 1" : "Player 2"));
          setOpponentName(assignPayload.slot === 'player1' ? "Player 2" : "Player 1");
          toast({ title: 'Joined Game!', description: `You are ${assignPayload.assignedName}. Topic: ${assignPayload.topic}` });
        }
        break;
      case 'GAME_START':
        if (mySlot) { // Only if assigned
          const startPayload = message.payload as GameStartPayload;
          setTimeLeft(startPayload.duration);
          setGameState('drawing');
          setIsTimerRunning(true);
          toast({ title: 'Game Started!', description: 'Time to draw!' });
        }
        break;
      case 'DRAWING_UPDATE':
        const updatePayload = message.payload as DrawingUpdatePayload;
        if (mySlot && updatePayload.slot !== mySlot) {
          setOpponentDrawingData(updatePayload.drawingData);
        }
        break;
      case 'TIME_UP':
        setIsTimerRunning(false);
        setGameState('judging');
        toast({ title: 'Time Up!', description: 'Waiting for results...' });
        break;
      case 'GAME_RESULTS':
        const resultsPayload = message.payload as GameResultsPayload;
        setResults(resultsPayload.results);
        setTopic(resultsPayload.topic); // Update topic just in case it changed or for display
        setGameState('results');
        setIsTimerRunning(false);
        break;
      case 'ERROR_MESSAGE':
        const errorPayload = message.payload as ErrorMessagePayload;
        if (!errorPayload.forStudentId || errorPayload.forStudentId === getClientId()) {
          toast({ title: 'Game Message', description: errorPayload.message, variant: 'destructive' });
          if (errorPayload.message.toLowerCase().includes("full")) {
            setGameState('idle'); // Reset to allow trying again
          }
        }
        break;
    }
  }, [mySlot, gameState, getClientId, toast]);

  const { publish, isConnected, getClientId } = useMqtt({ onMessage: handleMqttMessage });

  const handleJoinGame = () => {
    if (isConnected && getClientId()) {
      setGameState('waiting_for_assignment');
      publish({ type: 'JOIN_REQUEST', payload: { studentId: getClientId()! } });
      toast({ title: 'Joining Game', description: 'Waiting for teacher to assign you...' });
    } else {
      toast({ title: 'MQTT Not Connected', description: 'Cannot join game.', variant: 'destructive' });
    }
  };
  
  const handleDrawEnd = (dataUrl: string) => {
    setMyDrawingData(dataUrl);
    if (mySlot && gameState === 'drawing') {
      publish({ type: 'DRAWING_UPDATE', payload: { slot: mySlot, drawingData: dataUrl } });
    }
  };

  const canvasWidth = typeof window !== 'undefined' ? Math.min(600, window.innerWidth - 80) : 600;
  const canvasHeight = canvasWidth * 0.75;


  const StatusDisplay = () => {
    switch (gameState) {
        case 'waiting_for_assignment':
            return <div className="flex items-center text-lg text-primary"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Waiting for assignment...</div>;
        case 'ready_to_draw':
            return <div className="flex items-center text-lg text-green-600"><CheckCircle className="w-5 h-5 mr-2" />Ready! Waiting for game to start.</div>;
        case 'judging':
            return <div className="flex items-center text-lg text-primary"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Judging in progress...</div>;
        default:
            return null;
    }
  };


  return (
    <PageWrapper title="Student Workspace" className="bg-gradient-to-br from-background to-accent/10">
      <div className="flex flex-col h-full items-center">
        {gameState === 'idle' && (
          <Card className="max-w-md w-full text-center p-8 shadow-xl my-auto">
            <CardHeader>
              <CardTitle className="text-3xl text-primary">Join Drawing Duel!</CardTitle>
              <CardDescription>Ready to show off your drawing skills?</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleJoinGame} disabled={!isConnected} size="lg" className="w-full bg-accent hover:bg-accent/80 text-accent-foreground">
                <Edit3 className="mr-2 h-5 w-5" /> Join Game
              </Button>
              {!isConnected && <p className="text-destructive text-sm mt-2">MQTT Disconnected. Please wait or refresh.</p>}
            </CardContent>
          </Card>
        )}

        {(gameState !== 'idle' && gameState !== 'results') && (
          <div className="w-full max-w-6xl mx-auto space-y-4 flex-grow flex flex-col">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Topic: <span className="font-semibold text-accent">{topic || "Waiting for topic..."}</span></CardTitle>
                 <CardDescription>You are: <span className="font-bold text-primary">{myName}</span></CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDisplay />
              </CardContent>
            </Card>
            
            {isTimerRunning && gameState === 'drawing' && (
                 <CountdownTimer initialSeconds={timeLeft} isRunning={isTimerRunning} className="bg-card border border-border" textClassName="text-accent"/>
            )}
            
            <div className="flex-grow grid md:grid-cols-2 gap-4 items-start">
              <Card className="h-full flex flex-col">
                <CardHeader><CardTitle className="flex items-center"><User className="mr-2 w-5 h-5 text-primary"/>{myName}'s Canvas</CardTitle></CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                  <DrawingCanvas
                    width={canvasWidth}
                    height={canvasHeight}
                    onDrawEnd={handleDrawEnd}
                    isDrawingEnabled={gameState === 'drawing'}
                    initialDataUrl={myDrawingData}
                  />
                </CardContent>
              </Card>
              <Card className="h-full flex flex-col">
                <CardHeader><CardTitle className="flex items-center"><ImageIcon className="mr-2 w-5 h-5 text-secondary"/>{opponentName}'s Drawing</CardTitle></CardHeader>
                <CardContent className="flex-grow flex items-center justify-center p-2">
                  <div className="aspect-[4/3] w-full max-w-[600px] bg-muted rounded-md overflow-hidden border border-input flex items-center justify-center">
                    <Image 
                      src={opponentDrawingData} 
                      alt="Opponent's drawing" 
                      width={canvasWidth} 
                      height={canvasHeight} 
                      className="object-contain w-full h-full"
                      data-ai-hint="opponent drawing"
                      unoptimized={opponentDrawingData.startsWith('data:image')} // Important for data URIs
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {gameState === 'results' && results && (
          <ResultsDisplay 
            results={results} 
            topic={topic} 
            drawing1DataUri={mySlot === 'player1' ? myDrawingData : opponentDrawingData} 
            drawing2DataUri={mySlot === 'player2' ? myDrawingData : opponentDrawingData}
          />
        )}
         {gameState === 'results' && (
            <Button onClick={() => {
                setGameState('idle');
                setTopic('');
                setMySlot(null);
                setTimeLeft(0);
                setMyDrawingData('data:,');
                setOpponentDrawingData('https://placehold.co/400x300.png?text=Waiting...');
                setResults(null);
            }} className="mt-8">Play Again?</Button>
        )}
      </div>
    </PageWrapper>
  );
}
