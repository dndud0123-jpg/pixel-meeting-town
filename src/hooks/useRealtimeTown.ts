import { useEffect, useRef, useState, useCallback } from 'react';
import type { 
  Player, Opinion, Direction, BroadcastMovePayload, 
  BroadcastSpeakPayload, BroadcastActionPayload, BroadcastLikePayload 
} from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { sound } from '../utils/audio';

const INITIAL_OPINIONS: Opinion[] = [
  {
    id: 'seed-1',
    playerId: 'system-1',
    playerName: '지우',
    playerColor: '#ef4444',
    text: '포켓몬 회의실에 오신 것을 환영합니다! 폰으로 QR을 찍고 의견을 남겨보세요!',
    timestamp: Date.now() - 1000 * 60 * 3,
    likes: 5,
  },
  {
    id: 'seed-2',
    playerId: 'system-2',
    playerName: '이슬',
    playerColor: '#06b6d4',
    text: '모바일 패드로 캐릭터를 이동하고 B버튼으로 점프도 할 수 있어요 🏃‍♂️✨',
    timestamp: Date.now() - 1000 * 60 * 1,
    likes: 3,
  },
];

interface UseRealtimeTownProps {
  role: 'screen' | 'pad';
  myPlayer?: Player | null;
}

export function useRealtimeTown({ role, myPlayer }: UseRealtimeTownProps) {
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [opinions, setOpinions] = useState<Opinion[]>(INITIAL_OPINIONS);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const localBcRef = useRef<BroadcastChannel | null>(null);
  const playersRef = useRef(players);
  const opinionsRef = useRef(opinions);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    opinionsRef.current = opinions;
  }, [opinions]);

  // Connect Supabase Realtime channel + Local BroadcastChannel fallback
  useEffect(() => {
    const { client, isConfigured: hasConfig } = getSupabaseClient();
    setIsConfigured(hasConfig);

    // Multi-tab local fallback bridge
    let localBc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBc = new BroadcastChannel('pkmn_retro_town_tab_sync');
        localBcRef.current = localBc;

        localBc.onmessage = (e) => {
          handleIncomingEvent(e.data.event, e.data.payload);
        };
      }
    } catch {
      // BroadcastChannel optional
    }

    const channel = client.channel('retro-town', {
      config: {
        broadcast: { self: true },
        presence: { key: myPlayer?.id || 'screen_' + Math.random().toString(36).slice(2, 7) },
      },
    });
    channelRef.current = channel;

    // Presence: track online participants
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setOnlineCount(Math.max(count, 1));
    });

    // Broadcast event listeners
    channel
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        handleIncomingEvent('move', payload);
      })
      .on('broadcast', { event: 'speak' }, ({ payload }) => {
        handleIncomingEvent('speak', payload);
      })
      .on('broadcast', { event: 'action' }, ({ payload }) => {
        handleIncomingEvent('action', payload);
      })
      .on('broadcast', { event: 'like' }, ({ payload }) => {
        handleIncomingEvent('like', payload);
      })
      .on('broadcast', { event: 'sync_request' }, () => {
        // Only screen responds to sync request to provide authoritative opinions
        if (role === 'screen') {
          channel.send({
            type: 'broadcast',
            event: 'sync_response',
            payload: {
              opinions: opinionsRef.current,
            },
          });
        }
      })
      .on('broadcast', { event: 'sync_response' }, ({ payload }) => {
        if (payload?.opinions?.length) {
          setOpinions(payload.opinions);
        }
      });

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        if (myPlayer) {
          channel.track({
            id: myPlayer.id,
            name: myPlayer.name,
            color: myPlayer.color,
            avatar: myPlayer.avatar,
            onlineAt: new Date().toISOString(),
          });
        }
        // Ask for existing state
        channel.send({
          type: 'broadcast',
          event: 'sync_request',
          payload: {},
        });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
      }
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (localBc) {
        localBc.close();
      }
    };
  }, [role, myPlayer?.id]);

  // Handle incoming broadcast events (from Supabase or local BroadcastChannel)
  const handleIncomingEvent = (event: string, payload: unknown) => {
    switch (event) {
      case 'move': {
        const p = payload as BroadcastMovePayload;
        const dir = p.dir || p.direction || 'down';
        const isMoving = p.isMoving ?? true;
        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(p.id);
          if (existing) {
            next.set(p.id, {
              ...existing,
              targetX: p.x,
              targetY: p.y,
              direction: dir,
              isMoving,
            });
          } else {
            next.set(p.id, {
              id: p.id,
              name: `트레이너 #${p.id.slice(-3)}`,
              color: '#3b82f6',
              avatar: 'red',
              x: p.x,
              y: p.y,
              targetX: p.x,
              targetY: p.y,
              direction: dir,
              isMoving,
            });
          }
          return next;
        });
        break;
      }

      case 'speak': {
        sound.playSpeak();
        const p = payload as BroadcastSpeakPayload;
        const opinionId = p.opinionId || ('op_' + Math.random().toString(36).slice(2, 9));
        const timestamp = p.timestamp || Date.now();
        const color = p.color || '#3b82f6';
        const avatar = p.avatar || 'red';

        const newOpinion: Opinion = {
          id: opinionId,
          playerId: p.id,
          playerName: p.name,
          playerColor: color,
          avatar,
          text: p.text,
          timestamp,
          likes: 0,
        };

        setOpinions((prev) => [newOpinion, ...prev.filter((o) => o.id !== opinionId)]);

        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(p.id);
          if (existing) {
            next.set(p.id, {
              ...existing,
              name: p.name,
              color,
              lastSpokenText: p.text,
              lastSpokenTime: timestamp,
            });
          } else {
            next.set(p.id, {
              id: p.id,
              name: p.name,
              color,
              avatar,
              x: 10,
              y: 8,
              direction: 'down',
              lastSpokenText: p.text,
              lastSpokenTime: timestamp,
            });
          }
          return next;
        });
        break;
      }

      case 'action': {
        const p = payload as BroadcastActionPayload;
        if (p.actionType === 'jump') sound.playJump();
        else if (p.actionType === 'heart') sound.playLike();

        setPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(p.id);
          if (existing) {
            next.set(p.id, {
              ...existing,
              lastAction: p.actionType,
              lastActionTime: p.timestamp,
            });
          }
          return next;
        });
        break;
      }

      case 'like': {
        sound.playLike();
        const p = payload as BroadcastLikePayload;
        setOpinions((prev) =>
          prev.map((op) => (op.id === p.opinionId ? { ...op, likes: op.likes + 1 } : op))
        );
        break;
      }
    }
  };

  // Broadcast sender helper (sends via Supabase Realtime + local BroadcastChannel fallback)
  const broadcast = useCallback((event: string, payload: unknown) => {
    // 1. Supabase Realtime
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event,
        payload,
      });
    }

    // 2. Local BroadcastChannel for instant local multi-tab sync
    if (localBcRef.current) {
      localBcRef.current.postMessage({ event, payload });
    }
  }, []);

  // Action: Send Move
  const sendMove = useCallback((x: number, y: number, direction: Direction, isMoving: boolean) => {
    if (!myPlayer) return;
    const payload: BroadcastMovePayload = {
      id: myPlayer.id,
      x,
      y,
      direction,
      isMoving,
    };
    broadcast('move', payload);
  }, [myPlayer, broadcast]);

  // Action: Send Speak
  const sendSpeak = useCallback((text: string) => {
    if (!myPlayer) return;
    const timestamp = Date.now();
    const opinionId = 'op_' + Math.random().toString(36).substring(2, 9);
    const payload: BroadcastSpeakPayload = {
      id: myPlayer.id,
      name: myPlayer.name,
      color: myPlayer.color,
      avatar: myPlayer.avatar,
      text,
      timestamp,
      opinionId,
    };
    broadcast('speak', payload);
  }, [myPlayer, broadcast]);

  // Action: Send Action (Jump, Heart, etc.)
  const sendAction = useCallback((actionType: 'jump' | 'heart' | 'wave' | 'alert') => {
    if (!myPlayer) return;
    const payload: BroadcastActionPayload = {
      id: myPlayer.id,
      actionType,
      timestamp: Date.now(),
    };
    broadcast('action', payload);
  }, [myPlayer, broadcast]);

  // Action: Like Opinion
  const sendLike = useCallback((opinionId: string) => {
    const payload: BroadcastLikePayload = { opinionId };
    broadcast('like', payload);
  }, [broadcast]);

  return {
    players,
    opinions,
    onlineCount,
    isConnected,
    isConfigured,
    sendMove,
    sendSpeak,
    sendAction,
    sendLike,
  };
}
