import React from 'react';
import './PlayerList.css';

const PlayerList = ({ players, currentPlayerId }) => {
  if (!players || players.length === 0) {
    return null;
  }

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="player-list-container">
      <h2 className="player-list-title">Scores des Joueurs</h2>
      <div className="player-cards">
        {sortedPlayers.map(player => (
          <div key={player.id} className={`player-card ${player.id === currentPlayerId ? 'current-player' : ''}`}>
            <div className="player-color-indicator" style={{ backgroundColor: player.color }}></div>
            <span className="player-name">{player.name}</span>
            <span className="player-score">{player.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
