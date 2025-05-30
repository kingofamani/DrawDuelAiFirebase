
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useMqtt } from '@/hooks/useMqtt';
import { useToast } from '@/hooks/use-toast';
import type { MqttMessage, PlayerSlot, PlayerAssignedPayload, GameStartPayload, DrawingUpdatePayload, GameResultsPayload, ErrorMessagePayload, NewGameAnnouncementPayload } from '@/types/mqtt';
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
  const [topicZh, setTopicZh] = useState<string>('');
  const [mySlot, setMySlot] = useState<PlayerSlot | null>(null);
  const [myName, setMyName] = useState<string>('You');
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const [myDrawingData, setMyDrawingData] = useState<string>('data:,');
  const [opponentDrawingData, setOpponentDrawingData] = useState<string>('https://placehold.co/400x300.png?text=Waiting...');
  
  const [results, setResults] = useState<EvaluateDrawingsOutput | null>(null);
  const { toast } = useToast();

  const handleMqttMessageCallbackRef = useRef<((topic: string, message: MqttMessage) => void) | null>(null);

  const stableOnMessageHandler = useCallback((receivedTopic: string, message: MqttMessage) => {
    if (handleMqttMessageCallbackRef.current) {
      handleMqttMessageCallbackRef.current(receivedTopic, message);
    }
  }, []); 

  const { publish, isConnected, getClientId } = useMqtt({ 
    onMessage: stableOnMessageHandler 
  });

  const currentHandleMqttMessage = useCallback((receivedTopic: string, message: MqttMessage) => {
    console.log("Student received MQTT message:", message);
    // getClientId() will be called inside switch cases where needed
    switch (message.type) {
      case 'NEW_GAME_ANNOUNCEMENT':
        if (gameState === 'idle' || gameState === 'waiting_for_assignment') {
          const announcePayload = message.payload as NewGameAnnouncementPayload;
          setTopic(announcePayload.topic);
          setTopicZh(announcePayload.topicZh);
        }
        break;
      case 'PLAYER_ASSIGNED':
        const assignPayload = message.payload as PlayerAssignedPayload;
        if (assignPayload.studentId === getClientId()) {
          setMySlot(assignPayload.slot);
          setTopic(assignPayload.topic);
          setTopicZh(assignPayload.topicZh);
          setGameState('ready_to_draw');
          setMyName(assignPayload.assignedName || (assignPayload.slot === 'player1' ? "Player 1" : "Player 2"));
          setOpponentName(assignPayload.slot === 'player1' ? "Player 2" : "Player 1");
          toast({ title: 'Joined Game!', description: `You are ${assignPayload.assignedName}. Topic: ${assignPayload.topic}` });
        }
        break;
      case 'GAME_START':
        if (mySlot) { 
          const startPayload = message.payload as GameStartPayload;
          setTimeLeft(startPayload.duration);
          setGameState('drawing');
          setIsTimerRunning(true); // Timer might still be controlled by teacher, but student UI won't show it
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
        setTopic(resultsPayload.topic); 
        setTopicZh(resultsPayload.topicZh);
        setGameState('results');
        setIsTimerRunning(false);
        break;
      case 'ERROR_MESSAGE':
        const errorPayload = message.payload as ErrorMessagePayload;
        if (!errorPayload.forStudentId || errorPayload.forStudentId === getClientId()) {
          toast({ title: 'Game Message', description: errorPayload.message, variant: 'destructive' });
          if (errorPayload.message.toLowerCase().includes("full")) {
            setGameState('idle'); 
          }
        }
        break;
    }
  }, [mySlot, gameState, getClientId, toast, setMySlot, setTopic, setTopicZh, setGameState, setMyName, setOpponentName, setIsTimerRunning, setTimeLeft, setOpponentDrawingData, setResults]);


  useEffect(() => {
    handleMqttMessageCallbackRef.current = currentHandleMqttMessage;
  }, [currentHandleMqttMessage]);


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
    if (mySlot && gameState === 'drawing') { // Ensure drawing is active for this student
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
                <CardTitle className="text-xl text-primary">
                  Topic (EN): <span className="font-semibold text-accent">{topic || "Waiting for topic..."}</span>
                  {topicZh && <span className="block font-normal text-accent/80 text-lg mt-1">Topic (中): {topicZh}</span>}
                </CardTitle>
                 <CardDescription>You are: <span className="font-bold text-primary">{myName}</span></CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDisplay />
              </CardContent>
            </Card>
            
            {gameState !== 'drawing' && isTimerRunning && (
                 <CountdownTimer initialSeconds={timeLeft} isRunning={isTimerRunning} className="bg-card border border-border" textClassName="text-accent"/>
            )}
            
            <div className="flex-grow items-start">
              {gameState === 'drawing' ? (
                <div className="flex flex-col items-center justify-start pt-4 h-full">
                  <Card className="w-full max-w-2xl h-full flex flex-col shadow-xl">
                    <CardHeader><CardTitle className="flex items-center"><User className="mr-2 w-5 h-5 text-primary"/>{myName}'s Canvas</CardTitle></CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                      <DrawingCanvas
                        width={canvasWidth}
                        height={canvasHeight}
                        onDrawEnd={handleDrawEnd}
                        isDrawingEnabled={true}
                        initialDataUrl={myDrawingData}
                      />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 h-full">
                  <Card className="h-full flex flex-col">
                    <CardHeader><CardTitle className="flex items-center"><User className="mr-2 w-5 h-5 text-primary"/>{myName}'s Canvas</CardTitle></CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                      <DrawingCanvas
                        width={canvasWidth}
                        height={canvasHeight}
                        onDrawEnd={() => {}} 
                        isDrawingEnabled={false} 
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
                          unoptimized={opponentDrawingData.startsWith('data:image')}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'results' && results && (
          <ResultsDisplay 
            results={results} 
            topic={topic} 
            topicZh={topicZh}
            drawing1DataUri={mySlot === 'player1' ? myDrawingData : opponentDrawingData} 
            drawing2DataUri={mySlot === 'player2' ? myDrawingData : opponentDrawingData}
          />
        )}
         {gameState === 'results' && (
            <Button onClick={() => {
                setGameState('idle');
                setTopic('');
                setTopicZh('');
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
