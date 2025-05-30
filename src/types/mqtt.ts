import type { EvaluateDrawingsOutput } from '@/ai/flows/evaluate-drawings';

export type MqttMessageType =
  | 'NEW_GAME_ANNOUNCEMENT'
  | 'JOIN_REQUEST'
  | 'PLAYER_ASSIGNED'
  | 'GAME_START'
  | 'DRAWING_UPDATE'
  | 'TIME_UP'
  | 'GAME_RESULTS'
  | 'PLAYER_DISCONNECTED' // Optional for handling disconnects
  | 'ERROR_MESSAGE'; // For sending errors like game full

export interface BaseMqttMessage<T extends MqttMessageType, P> {
  type: T;
  payload: P;
  timestamp: number;
  senderId?: string; // MQTT client ID
}

// Specific Message Payloads
export interface NewGameAnnouncementPayload {
  topic: string;
  gameId: string; // To potentially differentiate games, though current setup is global
}
export type NewGameAnnouncementMessage = BaseMqttMessage<'NEW_GAME_ANNOUNCEMENT', NewGameAnnouncementPayload>;

export interface JoinRequestPayload {
  studentId: string; // Typically MQTT client ID
  studentName?: string; // Optional: student can provide a name
}
export type JoinRequestMessage = BaseMqttMessage<'JOIN_REQUEST', JoinRequestPayload>;

export type PlayerSlot = 'player1' | 'player2';
export interface PlayerAssignedPayload {
  studentId: string;
  slot: PlayerSlot;
  topic: string;
  gameId: string;
  assignedName?: string; // Teacher can assign a name like "Player 1"
}
export type PlayerAssignedMessage = BaseMqttMessage<'PLAYER_ASSIGNED', PlayerAssignedPayload>;

export interface GameStartPayload {
  duration: number; // in seconds
}
export type GameStartMessage = BaseMqttMessage<'GAME_START', GameStartPayload>;

export interface DrawingUpdatePayload {
  slot: PlayerSlot;
  drawingData: string; // data URI
}
export type DrawingUpdateMessage = BaseMqttMessage<'DRAWING_UPDATE', DrawingUpdatePayload>;

export type TimeUpMessage = BaseMqttMessage<'TIME_UP', {}>;

export interface GameResultsPayload {
  results: EvaluateDrawingsOutput;
  topic: string;
}
export type GameResultsMessage = BaseMqttMessage<'GAME_RESULTS', GameResultsPayload>;

export interface PlayerDisconnectedPayload {
  slot: PlayerSlot;
  studentId: string;
}
export type PlayerDisconnectedMessage = BaseMqttMessage<'PLAYER_DISCONNECTED', PlayerDisconnectedPayload>;

export interface ErrorMessagePayload {
  message: string;
  forStudentId?: string; // If error is specific to a student
}
export type ErrorMessage = BaseMqttMessage<'ERROR_MESSAGE', ErrorMessagePayload>;


// Union type for all possible messages
export type MqttMessage =
  | NewGameAnnouncementMessage
  | JoinRequestMessage
  | PlayerAssignedMessage
  | GameStartMessage
  | DrawingUpdateMessage
  | TimeUpMessage
  | GameResultsMessage
  | PlayerDisconnectedMessage
  | ErrorMessage;

// MQTT Configuration
export const MQTT_BROKER_URL = process.env.NODE_ENV === 'production' ? 'wss://broker.emqx.io:8084/mqtt' : 'ws://broker.emqx.io:8083/mqtt';
export const MQTT_TOPIC = 'drawpkla/all';
