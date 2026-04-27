import { useMemo } from 'react';
import './UserPanel.css';

const UserPanel = ({ user, gridData, gridVersion, cooldownActive }) => {
  const myTileCount = useMemo(() => {
    if (!user) return 0;
    let count = 0;
    gridData.forEach((tile) => {
      if (tile.ownerId === user.id) count++;
    });
    return count;
  }, [user, gridData, gridVersion]);

  const ownershipPercent = ((myTileCount / 2500) * 100).toFixed(1);

  if (!user) {
    return (
      <div className="user-panel" id="user-panel">
        <div className="user-panel-loading">
          <div className="spinner-small" />
          Connecting...
        </div>
      </div>
    );
  }

  return (
    <div className="user-panel" id="user-panel">
      <div className="user-panel-title">Your Identity</div>

      <div className="user-info">
        <div className="user-avatar" style={{ backgroundColor: user.color }}>
          {user.name.charAt(0)}
        </div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div className="user-id">
            {cooldownActive ? '⏳ Cooldown...' : '✨ Ready to claim'}
          </div>
        </div>
      </div>

      <div className="user-stats">
        <div className="user-stat">
          <div className={`user-stat-value ${myTileCount > 0 ? 'animated' : ''}`}>
            {myTileCount}
          </div>
          <div className="user-stat-label">Tiles Owned</div>
        </div>
        <div className="user-stat">
          <div className="user-stat-value">{ownershipPercent}%</div>
          <div className="user-stat-label">Grid Control</div>
        </div>
      </div>

      <div className="user-color-bar" style={{ backgroundColor: user.color }} />
    </div>
  );
};

export default UserPanel;
