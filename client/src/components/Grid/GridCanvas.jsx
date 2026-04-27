import { useRef, useEffect, useState, useCallback } from 'react';
import { hexToRgba } from '../../utils/colors';
import './GridCanvas.css';

const TILE_SIZE = 20;
const TILE_GAP = 1;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;
const UNCLAIMED_COLOR = '#141927';
const UNCLAIMED_HOVER = '#202535';
const GRID_BG = '#0a0e19';

const GridCanvas = ({
  gridData, gridVersion, gridSize, user,
  isConnected, cooldownActive, onClaimTile,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const [hoveredTile, setHoveredTile] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // ripple effect when you claim a tile
  const ripplesRef = useRef([]);

  // convert mouse position to grid coordinates
  const screenToGrid = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - offset.x) / zoom;
    const y = (screenY - rect.top - offset.y) / zoom;

    const tileX = Math.floor(x / (TILE_SIZE + TILE_GAP));
    const tileY = Math.floor(y / (TILE_SIZE + TILE_GAP));

    if (tileX >= 0 && tileX < gridSize.width && tileY >= 0 && tileY < gridSize.height) {
      return { x: tileX, y: tileY };
    }
    return null;
  }, [offset, zoom, gridSize]);

  // main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();

    // handle retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = GRID_BG;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const tileUnit = TILE_SIZE + TILE_GAP;

    // only render tiles that are actually visible (perf optimization)
    const startX = Math.max(0, Math.floor(-offset.x / zoom / tileUnit));
    const startY = Math.max(0, Math.floor(-offset.y / zoom / tileUnit));
    const endX = Math.min(gridSize.width, Math.ceil((width - offset.x) / zoom / tileUnit) + 1);
    const endY = Math.min(gridSize.height, Math.ceil((height - offset.y) / zoom / tileUnit) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const key = `${x},${y}`;
        const tile = gridData.get(key);
        const isHovered = hoveredTile && hoveredTile.x === x && hoveredTile.y === y;
        const px = x * tileUnit;
        const py = y * tileUnit;

        if (tile && tile.color) {
          // claimed tile
          ctx.fillStyle = tile.color;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // subtle lighting effect on top-left edges
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(px, py, TILE_SIZE, 2);
          ctx.fillRect(px, py, 2, TILE_SIZE);

          if (isHovered) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.strokeRect(px - 0.5, py - 0.5, TILE_SIZE + 1, TILE_SIZE + 1);
          }
        } else {
          // unclaimed tile
          ctx.fillStyle = isHovered ? UNCLAIMED_HOVER : UNCLAIMED_COLOR;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          if (isHovered) {
            // preview the user's color on hover
            if (user && user.color) {
              ctx.fillStyle = hexToRgba(user.color, 0.3);
              ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
            ctx.strokeStyle = user ? hexToRgba(user.color, 0.8) : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.strokeRect(px - 0.5, py - 0.5, TILE_SIZE + 1, TILE_SIZE + 1);
          }
        }
      }
    }

    // draw ripple animations
    const now = Date.now();
    ripplesRef.current = ripplesRef.current.filter((r) => now - r.start < 600);

    ripplesRef.current.forEach((ripple) => {
      const elapsed = now - ripple.start;
      const progress = elapsed / 600;
      const radius = progress * TILE_SIZE * 2;
      const alpha = 1 - progress;

      const rpx = ripple.x * tileUnit + TILE_SIZE / 2;
      const rpy = ripple.y * tileUnit + TILE_SIZE / 2;

      ctx.beginPath();
      ctx.arc(rpx, rpy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(ripple.color, alpha * 0.6);
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();
    });

    ctx.restore();

    if (ripplesRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(render);
    }
  }, [gridData, gridVersion, gridSize, offset, zoom, hoveredTile, user]);

  useEffect(() => { render(); }, [render]);

  // center the grid when it first loads
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    const gridPxW = gridSize.width * (TILE_SIZE + TILE_GAP);
    const gridPxH = gridSize.height * (TILE_SIZE + TILE_GAP);

    const fitZoom = Math.min((width * 0.85) / gridPxW, (height * 0.85) / gridPxH);
    const initialZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom));

    setZoom(initialZoom);
    setOffset({
      x: (width - gridPxW * initialZoom) / 2,
      y: (height - gridPxH * initialZoom) / 2,
    });
  }, [gridSize]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // zoom with scroll wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));

    // zoom toward mouse cursor
    const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom);

    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [zoom, offset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
    }
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffset({ x: dragStartRef.current.offsetX + dx, y: dragStartRef.current.offsetY + dy });
      setHoveredTile(null);
    } else {
      const tile = screenToGrid(e.clientX, e.clientY);
      setHoveredTile(tile);
      if (tile) setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, screenToGrid]);

  const handleMouseUp = useCallback((e) => {
    if (isDragging) {
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);

      // if the mouse barely moved, treat it as a click instead of a drag
      if (dx < 5 && dy < 5) {
        const tile = screenToGrid(e.clientX, e.clientY);
        if (tile && onClaimTile) {
          onClaimTile(tile.x, tile.y);

          ripplesRef.current.push({
            x: tile.x, y: tile.y,
            color: user?.color || '#6C5CE7',
            start: Date.now(),
          });

          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = requestAnimationFrame(render);
        }
      }
    }
    setIsDragging(false);
  }, [isDragging, screenToGrid, onClaimTile, user, render]);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredTile(null);
  }, []);

  const hoveredTileData = hoveredTile
    ? gridData.get(`${hoveredTile.x},${hoveredTile.y}`)
    : null;

  return (
    <div className="grid-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="grid-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
      />

      {hoveredTile && !isDragging && (
        <div className="grid-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <div className="tooltip-coords">[{hoveredTile.x}, {hoveredTile.y}]</div>
          {hoveredTileData ? (
            <div className="tooltip-owner">
              <span className="tooltip-color" style={{ backgroundColor: hoveredTileData.color }} />
              <span>{hoveredTileData.ownerName}</span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)' }}>Unclaimed — click to capture!</div>
          )}
        </div>
      )}

      <div className="zoom-indicator">
        {Math.round(zoom * 100)}% · Scroll to zoom · Drag to pan
      </div>

      {cooldownActive && <div className="cooldown-overlay">⏳ Cooldown...</div>}

      {!isConnected && (
        <div className="connection-lost">
          <h3>⚡ Connection Lost</h3>
          <p>Reconnecting to server...</p>
          <div className="spinner" />
        </div>
      )}
    </div>
  );
};

export default GridCanvas;
