import './Leaderboard.css';

const Leaderboard = ({ leaderboard, userId }) => {
  const getRankClass = (i) => {
    if (i === 0) return 'gold';
    if (i === 1) return 'silver';
    if (i === 2) return 'bronze';
    return '';
  };

  const getRankEmoji = (i) => {
    if (i === 0) return '👑';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `${i + 1}`;
  };

  return (
    <div className="leaderboard" id="leaderboard-panel">
      <h2 className="leaderboard-title">
        <span className="icon">🏆</span>
        Leaderboard
      </h2>

      {leaderboard.length > 0 ? (
        <ul className="leaderboard-list">
          {leaderboard.map((player, i) => (
            <li
              key={player.id}
              className={`leaderboard-item ${player.id === userId ? 'is-you' : ''}`}
            >
              <span className={`leaderboard-rank ${getRankClass(i)}`}>
                {getRankEmoji(i)}
              </span>
              <span
                className="leaderboard-color"
                style={{
                  backgroundColor: player.color,
                  boxShadow: `0 0 8px ${player.color}40`,
                }}
              />
              <span className="leaderboard-name">
                {player.name}
                {player.id === userId && ' (you)'}
              </span>
              <span className="leaderboard-score">{player.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="leaderboard-empty">
          No tiles claimed yet. Be the first! 🎯
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
