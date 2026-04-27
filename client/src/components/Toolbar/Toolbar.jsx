import './Toolbar.css';

const Toolbar = ({ isConnected, onlineCount, gridSize, error }) => {
  return (
    <header className="toolbar" id="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-logo">
          <span className="logo-icon">⚡</span>
          PixelClash
        </div>
        <div className="toolbar-divider" />
        <span className="toolbar-grid-info">
          {gridSize.width}×{gridSize.height} grid
        </span>
      </div>

      <div className="toolbar-right">
        {error && <div className="toolbar-error">⚠️ {error}</div>}

        <div className="toolbar-badge" id="online-count-badge">
          <span className={`dot ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? `${onlineCount} online` : 'Reconnecting...'}
        </div>
      </div>
    </header>
  );
};

export default Toolbar;
