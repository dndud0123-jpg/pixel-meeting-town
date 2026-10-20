export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  color: string;
  avatar: string;
  direction: Direction;
  isMoving?: boolean;
  lastSpokenText?: string | null;
  lastSpokenTime?: number | null;
  lastAction?: string | null;
  lastActionTime?: number | null;
}

export interface Opinion {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  avatar?: string;
  text: string;
  timestamp: number;
  likes: number;
}

export interface BroadcastMovePayload {
  id: string;
  x: number;
  y: number;
  dir?: Direction;
  direction?: Direction;
  isMoving?: boolean;
}

export interface BroadcastSpeakPayload {
  id: string;
  name: string;
  text: string;
  color?: string;
  avatar?: string;
  timestamp?: number;
  opinionId?: string;
}

export interface BroadcastActionPayload {
  id: string;
  actionType: 'jump' | 'heart' | 'wave' | 'alert';
  timestamp: number;
}

export interface BroadcastLikePayload {
  opinionId: string;
}

export interface TunnelInfo {
  url: string;
  provider: 'cloudflare' | 'localtunnel' | 'local' | 'custom';
  status: 'connecting' | 'connected' | 'fallback' | 'pending';
  notice?: string;
  updatedAt?: number;
}

export type WSClientAction =
  | { type: 'join'; payload: { id: string; name: string; color: string; avatar: string; x?: number; y?: number; direction?: Direction } }
  | { type: 'move'; payload: { x: number; y: number; direction: Direction; isMoving: boolean } }
  | { type: 'speak'; payload: { text: string } }
  | { type: 'action'; payload: { actionType: 'wave' | 'jump' | 'heart' | 'alert' } }
  | { type: 'like_opinion'; payload: { opinionId: string } }
  | { type: 'ping' };

export type WSServerEvent =
  | { type: 'init'; payload: { socketId: string; serverIp: string; tunnelInfo?: TunnelInfo; players: Player[]; opinions: Opinion[] } }
  | { type: 'welcome'; payload: { player: Player; allPlayers: Player[]; opinions: Opinion[] } }
  | { type: 'player_joined'; payload: Player }
  | { type: 'player_left'; payload: { id: string } }
  | { type: 'player_moved'; payload: { id: string; x: number; y: number; direction: Direction; isMoving: boolean } }
  | { type: 'player_spoke'; payload: { id: string; text: string; timestamp: number; opinion: Opinion } }
  | { type: 'player_action'; payload: { id: string; actionType: string; timestamp: number } }
  | { type: 'opinion_liked'; payload: { opinionId: string; likes: number } }
  | { type: 'tunnel_updated'; payload: TunnelInfo }
  | { type: 'pong' };
