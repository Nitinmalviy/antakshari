'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  latency: number;
  emit: <T = unknown>(event: string, data?: T) => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const pendingEmits = useRef<{ event: string; data: unknown }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    // Connect to current origin automatically (works across localhost, LAN IPs, and mobile devices)
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      console.log('[Socket] Connected with ID:', socket.id);

      // Flush any queued emits
      while (pendingEmits.current.length > 0) {
        const item = pendingEmits.current.shift();
        if (item) {
          console.log(`[Socket] Flushing pending emit: "${item.event}"`);
          socket.emit(item.event, item.data);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
      setIsReconnecting(true);
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('reconnect_attempt', (attempt) => {
      setIsReconnecting(true);
      console.log(`[Socket] Reconnect attempt #${attempt}...`);
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      console.log('[Socket] Reconnected successfully');

      while (pendingEmits.current.length > 0) {
        const item = pendingEmits.current.shift();
        if (item) {
          socket.emit(item.event, item.data);
        }
      }
    });

    socket.on('connect_error', (err) => {
      setIsReconnecting(true);
      console.warn('[Socket] Connection error:', err.message);
    });

    // Ping / Latency tracker
    const interval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping', () => {
          setLatency(Date.now() - start);
        });
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.log(`[Socket] Queuing emit "${event}" until connection is established...`);
      pendingEmits.current.push({ event, data });
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    latency,
    emit,
  };
}
