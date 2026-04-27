import { useRef, useEffect, useMemo } from 'react';
import './MiniMap.css';

const MiniMap = ({ gridData, gridVersion, gridSize }) => {
  const canvasRef = useRef(null);

  const stats = useMemo(() => {
    let claimed = 0;
    gridData.forEach(() => claimed++);
    const total = gridSize.width * gridSize.height;
    return {
      claimed,
      total,
      percent: ((claimed / total) * 100).toFixed(1),
    };
  }, [gridData, gridVersion, gridSize]);

  // render a tiny version of the grid — each tile is just 3px
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const px = 3;
    canvas.width = gridSize.width * px;
    canvas.height = gridSize.height * px;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1e3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    gridData.forEach((tile, key) => {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = tile.color || '#6C5CE7';
      ctx.fillRect(x * px, y * px, px, px);
    });
  }, [gridData, gridVersion, gridSize]);

  return (
    <div className="minimap" id="minimap-panel">
      <div className="minimap-title">🗺️ Overview</div>
      <div className="minimap-canvas-wrapper">
        <canvas ref={canvasRef} className="minimap-canvas" />
      </div>
      <div className="minimap-stats">
        <span>{stats.claimed} claimed</span>
        <span>{stats.percent}%</span>
      </div>
    </div>
  );
};

export default MiniMap;
