import useSocket from './hooks/useSocket';
import Toolbar from './components/Toolbar/Toolbar';
import GridCanvas from './components/Grid/GridCanvas';
import UserPanel from './components/UserPanel/UserPanel';
import Leaderboard from './components/Leaderboard/Leaderboard';
import MiniMap from './components/MiniMap/MiniMap';
import './App.css';

function App() {
  const {
    gridData, gridVersion, gridSize,
    user, onlineCount, leaderboard,
    isConnected, cooldownActive, error,
    claimTile,
  } = useSocket();

  return (
    <div className="app">
      <Toolbar
        isConnected={isConnected}
        onlineCount={onlineCount}
        gridSize={gridSize}
        error={error}
      />

      <main className="app-main">
        <div className="app-grid-area">
          <GridCanvas
            gridData={gridData}
            gridVersion={gridVersion}
            gridSize={gridSize}
            user={user}
            isConnected={isConnected}
            cooldownActive={cooldownActive}
            onClaimTile={claimTile}
          />
        </div>

        <aside className="app-sidebar">
          <UserPanel
            user={user}
            gridData={gridData}
            gridVersion={gridVersion}
            cooldownActive={cooldownActive}
          />

          <Leaderboard leaderboard={leaderboard} userId={user?.id} />

          <MiniMap
            gridData={gridData}
            gridVersion={gridVersion}
            gridSize={gridSize}
          />

          <div className="how-to-play">
            <div className="how-to-play-title">How to Play</div>
            <ul>
              <li><span className="step-icon">🖱️</span>Click any tile to claim it</li>
              <li><span className="step-icon">🔄</span>Reclaim others' tiles to compete</li>
              <li><span className="step-icon">🔍</span>Scroll to zoom, drag to pan</li>
              <li><span className="step-icon">⏱️</span>1-second cooldown between claims</li>
              <li><span className="step-icon">🏆</span>Climb the leaderboard!</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
