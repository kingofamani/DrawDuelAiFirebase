
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { useMqtt } from '@/hooks/useMqtt';
import { useToast } from '@/hooks/use-toast';
import { generateDrawingTopic } from '@/ai/flows/generate-drawing-topic';
import { evaluateDrawings, type EvaluateDrawingsOutput } from '@/ai/flows/evaluate-drawings';
import type { MqttMessage, PlayerSlot, JoinRequestPayload, DrawingUpdatePayload } from '@/types/mqtt';
import { CountdownTimer } from '@/components/game/CountdownTimer';
import { ResultsDisplay } from '@/components/game/ResultsDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Users, Play, RotateCcw, Loader2, Mic2, Eye, Clock } from 'lucide-react';
import Image from 'next/image';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type GameState = 'idle' | 'waiting_for_players' | 'drawing' | 'judging' | 'results';

interface PlayerInfo {
  id: string; // MQTT client ID
  name: string; // e.g. "Player 1"
  drawingData: string; // data URI
  joined: boolean;
}

const initialPlayerState = (name: string): PlayerInfo => ({
  id: '',
  name,
  drawingData: 'https://placehold.co/400x300.png?text=Waiting...',
  joined: false,
});

const MUSIC_URL = '/audio/tense-loop.mp3'; 


export default function TeacherPage() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [topic, setTopic] = useState<string>('');
  const [topicZh, setTopicZh] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [gameDurationInSeconds, setGameDurationInSeconds] = useState(60); 
  const [timeLeft, setTimeLeft] = useState(gameDurationInSeconds); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const [player1, setPlayer1] = useState<PlayerInfo>(initialPlayerState("Player 1"));
  const [player2, setPlayer2] = useState<PlayerInfo>(initialPlayerState("Player 2"));

  const [results, setResults] = useState<EvaluateDrawingsOutput | null>(null);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isJudging, setIsJudging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const handleMqttMessageCallbackRef = useRef<((topic: string, message: MqttMessage) => void) | null>(null);

  const stableOnMessageHandler = useCallback((receivedTopic: string, message: MqttMessage) => {
    if (handleMqttMessageCallbackRef.current) {
      handleMqttMessageCallbackRef.current(receivedTopic, message);
    }
  }, []);

  const { publish, isConnected } = useMqtt({ onMessage: stableOnMessageHandler });
  
  const currentHandleMqttMessage = useCallback((receivedTopic: string, message: MqttMessage) => {
    console.log("Teacher received MQTT message:", message);
    switch (message.type) {
      case 'JOIN_REQUEST':
        const payload = message.payload as JoinRequestPayload;
        if (!player1.joined) {
          setPlayer1(prev => ({ ...prev, id: payload.studentId, joined: true, drawingData: 'https://placehold.co/400x300.png?text=Joined!' }));
          publishPlayerAssigned(payload.studentId, 'player1');
        } else if (!player2.joined) {
          setPlayer2(prev => ({ ...prev, id: payload.studentId, joined: true, drawingData: 'https://placehold.co/400x300.png?text=Joined!' }));
          publishPlayerAssigned(payload.studentId, 'player2');
        } else {
          publish({type: 'ERROR_MESSAGE', payload: {message: "Game is full.", forStudentId: payload.studentId }});
        }
        break;
      case 'DRAWING_UPDATE':
        const { slot, drawingData } = message.payload as DrawingUpdatePayload;
        if (slot === 'player1') {
          setPlayer1(prev => ({ ...prev, drawingData }));
        } else if (slot === 'player2') {
          setPlayer2(prev => ({ ...prev, drawingData }));
        }
        break;
    }
  }, [player1.joined, player2.joined, topic, topicZh, gameId, publish]); // Added publish to deps

  useEffect(() => {
    handleMqttMessageCallbackRef.current = currentHandleMqttMessage;
  }, [currentHandleMqttMessage]);
  
  useEffect(() => {
    const audioNotAlreadyInitialized = !audioRef.current;

    if (audioNotAlreadyInitialized && typeof window !== 'undefined') {
      try {
        const newAudio = new Audio(MUSIC_URL);
        newAudio.loop = true;
        newAudio.onerror = () => {
          toast({
            title: 'Audio File Error',
            description: `Could not load music from ${MUSIC_URL}. Please ensure the file exists in /public/audio and is a valid MP3. You may need to replace the placeholder.`,
            variant: 'destructive',
            duration: 10000,
          });
          console.error(`Audio element error: Could not load source ${MUSIC_URL}. Check the file exists and is valid.`);
        };
        audioRef.current = newAudio;
      } catch (e) {
        console.error("Error creating Audio object:", e);
        toast({ title: 'Audio Setup Error', description: 'Could not initialize the audio player.', variant: 'destructive' });
      }
    }
    
    const currentAudio = audioRef.current;

    if (currentAudio) {
        if (gameState === 'drawing') {
          currentAudio.play().catch(error => {
            console.error("Error playing audio:", error);
            if (error.name === 'NotAllowedError') {
                 toast({ title: 'Music Playback Blocked', description: 'Browser prevented music from playing automatically. Click the page or interact to enable audio.', variant: 'default' });
            } else if (!currentAudio.error) {
                 toast({ title: 'Music Playback Failed', description: `Could not play music. ${error.message}. Please ensure a valid MP3 file is at ${MUSIC_URL}.`, variant: 'destructive' });
            }
          });
        } else {
          currentAudio.pause();
          if (currentAudio.readyState >= 2 && currentAudio.duration && isFinite(currentAudio.duration) && currentAudio.currentTime > 0) {
            currentAudio.currentTime = 0;
          }
        }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [gameState, toast]);


  const publishPlayerAssigned = useCallback((studentId: string, slot: PlayerSlot) => {
    if (topic && topicZh && gameId) {
      publish({
        type: 'PLAYER_ASSIGNED',
        payload: { studentId, slot, topic, topicZh, gameId, assignedName: slot === 'player1' ? "Player 1" : "Player 2" },
      });
    } else {
      console.warn("Attempted to publish player assignment without topic/gameId");
       toast({ title: 'Assignment Warning', description: 'Topic or Game ID missing. Cannot assign player fully.', variant: 'default' });
    }
  }, [topic, topicZh, gameId, publish, toast]); // Added publish and toast to deps

  const handleNewGame = async () => {
    setIsGeneratingTopic(true);
    setResults(null);
    setPlayer1(initialPlayerState("Player 1"));
    setPlayer2(initialPlayerState("Player 2"));
    setGameState('idle'); 

    if (audioRef.current) { 
        audioRef.current.pause();
        if (audioRef.current.readyState >=2 && audioRef.current.duration && isFinite(audioRef.current.duration) && audioRef.current.currentTime > 0) {
            audioRef.current.currentTime = 0;
        }
    }

    try {
      const { topic: newTopic, topicZh: newTopicZh } = await generateDrawingTopic({});
      const newGameId = `game_${Date.now()}`;
      setTopic(newTopic);
      setTopicZh(newTopicZh);
      setGameId(newGameId);
      setGameState('waiting_for_players');
      setTimeLeft(gameDurationInSeconds);
      setIsTimerRunning(false);
      publish({ type: 'NEW_GAME_ANNOUNCEMENT', payload: { topic: newTopic, topicZh: newTopicZh, gameId: newGameId } });
      toast({ title: 'New Game Created!', description: `Topic (EN): ${newTopic}` });
    } catch (error) {
      console.error('Failed to generate topic:', error);
      toast({ title: 'Error', description: 'Could not generate a drawing topic.', variant: 'destructive' });
      setGameState('idle'); 
    }
    setIsGeneratingTopic(false);
  };

  const handleStartGame = () => {
    if (player1.joined && player2.joined && topic) { 
      setGameState('drawing');
      setIsTimerRunning(true);
      setTimeLeft(gameDurationInSeconds); // Ensure timeLeft is reset to current duration
      publish({ type: 'GAME_START', payload: { duration: gameDurationInSeconds } }); 
      toast({ title: 'Game Started!', description: 'Players can now draw.' });
    } else {
      let description = 'Waiting for both players to join.';
      if (!topic) description = 'Please create a new game to get a topic first.';
      else if (!player1.joined || !player2.joined) description = 'Waiting for both players to join.';
      
      toast({ title: 'Cannot Start Game', description, variant: 'destructive' });
    }
  };

  const handleTimeUp = useCallback(async () => {
    setIsTimerRunning(false);
    setGameState('judging');
    setIsJudging(true);
    publish({ type: 'TIME_UP', payload: {} });
    toast({ title: 'Time Up!', description: 'AI is now judging the drawings.' });

    try {
      if (!topic || !player1.drawingData || !player2.drawingData) {
        toast({ title: 'Evaluation Error', description: 'Missing data (topic or drawings) for evaluation.', variant: 'destructive' });
        setGameState('waiting_for_players'); // Go back if critical data missing
        setIsJudging(false);
        throw new Error("Missing data for evaluation.");
      }
      const drawing1ToEvaluate = (player1.drawingData === 'https://placehold.co/400x300.png?text=Joined!' || player1.drawingData === 'https://placehold.co/400x300.png?text=Waiting...' || player1.drawingData === 'data:,') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : player1.drawingData; 
      const drawing2ToEvaluate = (player2.drawingData === 'https://placehold.co/400x300.png?text=Joined!' || player2.drawingData === 'https://placehold.co/400x300.png?text=Waiting...' || player2.drawingData === 'data:,') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' : player2.drawingData;


      const aiResults = await evaluateDrawings({
        topic, 
        drawing1DataUri: drawing1ToEvaluate, // topicZh is not in this schema, it's in the output schema for context
        drawing2DataUri: drawing2ToEvaluate,
      });
      setResults(aiResults);
      setGameState('results');
      publish({ type: 'GAME_RESULTS', payload: { results: aiResults, topic, topicZh } }); 
      toast({ title: 'Judgment Complete!', description: 'Results are in.' });
    } catch (error) {
      console.error('Failed to evaluate drawings:', error);
      toast({ title: 'Evaluation Error', description: 'Could not evaluate drawings.', variant: 'destructive' });
      setGameState('waiting_for_players'); 
    }
    setIsJudging(false);
  }, [topic, topicZh, player1.drawingData, player2.drawingData, publish, toast]);


  const PlayerCard = ({ player, slot }: { player: PlayerInfo, slot: PlayerSlot }) => (
    <Card className="flex-1 min-w-[300px] shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {player.name}
          {player.joined ? (
            <span className="text-sm text-green-600 flex items-center"><UserCheck className="w-4 h-4 mr-1" /> Joined</span>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center"><Users className="w-4 h-4 mr-1" /> Waiting</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden border border-input flex items-center justify-center">
          {player.drawingData && (
            <Image 
              src={player.drawingData} 
              alt={`${player.name}'s drawing`} 
              width={400} 
              height={300} 
              className="object-contain w-full h-full"
              data-ai-hint="student drawing"
              unoptimized={player.drawingData.startsWith('data:image')}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
  
  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(event.target.value, 10);
    const newDurationSeconds = isNaN(minutes) || minutes <= 0 ? 60 : minutes * 60;
    
    setGameDurationInSeconds(newDurationSeconds);
    if (gameState !== 'drawing' && gameState !== 'judging') {
       setTimeLeft(newDurationSeconds); 
    }
  };


  return (
    <PageWrapper title="Teacher Dashboard" className="bg-gradient-to-br from-background to-secondary/20">
      <div className="flex flex-col h-full">
        <Card className="mb-4 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Mic2 className="w-6 h-6 mr-2"/>
              Game Topic
            </CardTitle>
             <CardDescription>The topic for the current drawing duel. Ensure a valid MP3 audio file is present at /public/audio/tense-loop.mp3 for background music.</CardDescription>
          </CardHeader>
          <CardContent>
            {topic ? (
              <>
                <p className="text-2xl font-semibold text-accent">{topic}</p>
                {topicZh && <p className="text-xl font-semibold text-accent/80 mt-1">{topicZh}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">Click "New Game" to generate a topic.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4 mb-4 items-start">
          <div className="md:col-span-1 space-y-4">
             <Card className="shadow-md">
                <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="game-duration" className="flex items-center"><Clock className="w-4 h-4 mr-2 text-primary"/>Game Duration (minutes)</Label>
                        <Input
                            id="game-duration"
                            type="number"
                            value={gameDurationInSeconds / 60}
                            onChange={handleDurationChange}
                            min="1"
                            className="w-full"
                            disabled={gameState === 'drawing' || gameState === 'judging'}
                        />
                    </div>
                    <Button
                        onClick={handleNewGame}
                        disabled={isGeneratingTopic || gameState === 'drawing' || gameState === 'judging'}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {isGeneratingTopic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                        New Game
                    </Button>
                    <Button
                        onClick={handleStartGame}
                        disabled={gameState !== 'waiting_for_players' || !player1.joined || !player2.joined || isTimerRunning || !topic}
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                        <Play className="mr-2 h-4 w-4" /> Start Game
                    </Button>
                </CardContent>
            </Card>
            {gameState !== 'idle' && gameState !== 'results' && (
              <CountdownTimer
                initialSeconds={timeLeft}
                isRunning={isTimerRunning}
                onComplete={handleTimeUp}
                onTick={setTimeLeft} // Ensure CountdownTimer updates timeLeft for teacher view
                className="bg-card border border-border"
                textClassName="text-accent"
              />
            )}
            {!isConnected && (
                <Card className="border-destructive bg-destructive/10">
                    <CardContent className="p-3">
                        <p className="text-destructive-foreground text-sm text-center font-semibold">MQTT Disconnected. Please check connection or refresh.</p>
                    </CardContent>
                </Card>
            )}
          </div>

          <div className="md:col-span-2">
             {(gameState === 'judging' || isJudging) && (
              <Card className="mb-4 text-center p-6 bg-primary/10 border-primary">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-2" />
                <p className="text-xl font-semibold text-primary">AI Judging in Progress...</p>
                <p className="text-muted-foreground">Please wait while the drawings are evaluated.</p>
              </Card>
            )}
            {results && gameState === 'results' && (
                <ResultsDisplay results={results} topic={topic} topicZh={topicZh} drawing1DataUri={player1.drawingData} drawing2DataUri={player2.drawingData} />
            )}
          </div>
        </div>
        
        {(gameState === 'waiting_for_players' || gameState === 'drawing') && (
          <div className="flex-grow flex flex-col md:flex-row gap-4 items-stretch">
            <PlayerCard player={player1} slot="player1" />
            <PlayerCard player={player2} slot="player2" />
          </div>
        )}

        {gameState === 'idle' && !isGeneratingTopic && (
           <Card className="flex-grow flex flex-col items-center justify-center text-center p-8 bg-card/50 border-dashed">
            <Eye className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">Ready to start a new duel?</h2>
            <p className="text-muted-foreground mb-6">Click the "New Game" button to get a topic and invite players.</p>
            <Button onClick={handleNewGame} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
              <RotateCcw className="mr-2 h-5 w-5" />
              Start New Game
            </Button>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

