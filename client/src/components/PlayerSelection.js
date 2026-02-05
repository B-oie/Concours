import React from 'react';
import './PlayerSelection.css';

const PlayerSelection = ({ players, onPlayerSelect }) => {
  if (!players || players.length === 0) {
    return <div className="player-selection-container">Chargement des joueurs...</div>;
  }

  return (
    <div className="player-selection-container">
      <div className="player-selection-box">
        <h1>Qui êtes-vous ?</h1>
        <div className="player-buttons">
          {players.map(player => (
            <button 
              key={player.id} 
              className="player-button"
              onClick={() => onPlayerSelect(player)}
              style={{ '--player-color': player.color }}
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerSelection;
