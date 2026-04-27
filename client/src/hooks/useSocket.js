import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);

  // using a ref for the grid map so we don't trigger a re-render on every single tile update
  // instead we bump a version counter when we want to actually repaint
  const gridDataRef = useRef(new Map());
  const [gridVersion, setGridVersion] = useState(0);
  const [gridSize, setGridSize] = useState({ width: 50, height: 50 });

  const [onlineCount, setOnlineCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [error, setError] = useState(null);
  const cooldownTimerRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('connect_error', () => {
      setIsConnected(false);
      setError('Can\'t reach the server. Is the backend running?');
    });

    socket.on('user:welcome', (data) => setUser(data));

    // initial grid load
    socket.on('grid:state', (data) => {
      const newGrid = new Map();
      data.tiles.forEach((tile) => {
        newGrid.set(`${tile.x},${tile.y}`, {
          ownerId: tile.ownerId,
          ownerName: tile.ownerName,
          color: tile.color,
        });
      });
      gridDataRef.current = newGrid;
      setGridSize({ width: data.width, height: data.height });
      setGridVersion((v) => v + 1);
    });

    // real-time tile updates
    socket.on('tile:updated', (data) => {
      gridDataRef.current.set(`${data.x},${data.y}`, {
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        color: data.color,
      });
      setGridVersion((v) => v + 1);
    });

    socket.on('users:update', (data) => {
      setOnlineCount(data.online);
      setLeaderboard(data.leaderboard);
    });

    socket.on('tile:error', (data) => {
      if (data.type === 'COOLDOWN') return; // don't show cooldown as an error
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.disconnect();
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const claimTile = useCallback((x, y) => {
    if (!socketRef.current || !isConnected || cooldownActive) return;

    socketRef.current.emit('tile:claim', { x, y });

    // local cooldown so the UI feels responsive
    setCooldownActive(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => setCooldownActive(false), 1000);
  }, [isConnected, cooldownActive]);

  return {
    gridData: gridDataRef.current,
    gridVersion,
    gridSize,
    user,
    onlineCount,
    leaderboard,
    isConnected,
    cooldownActive,
    error,
    claimTile,
  };
};

export default useSocket;
