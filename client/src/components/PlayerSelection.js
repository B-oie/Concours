import React, { useState } from 'react';
import './PlayerSelection.css';
import GameRulesModal from './GameRulesModal';

const PlayerSelection = ({ players, onPlayerSelect }) => {
  const [isRulesModalOpen, setRulesModalOpen] = useState(false);

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
          <button 
            className="player-button spectator-button"
            onClick={() => onPlayerSelect({ id: 'spectator', name: 'Spectateur', color: '#888' })}
          >
            Continuer en tant que Spectateur
          </button>
        </div>
        <button className="rules-button" onClick={() => setRulesModalOpen(true)}>
          Règles du Jeu
        </button>
      </div>
      <GameRulesModal isOpen={isRulesModalOpen} onClose={() => setRulesModalOpen(false)} />
    </div>
  );
};

export default PlayerSelection;
