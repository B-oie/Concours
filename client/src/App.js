import { useState, useEffect, useCallback } from 'react';
import './App.css';
import Map from './components/Map';
import TerritoryDetail from './components/TerritoryDetail';
import VotingPanel from './components/VotingPanel';
import PlayerList from './components/PlayerList';
import EventLog from './components/EventLog';
import PlayerSelection from './components/PlayerSelection';

const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

function App() {
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTerritory, setSelectedTerritory] = useState(null);
  const [isVotingPanelOpen, setVotingPanelOpen] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null); // State for the whole player object

  const fetchGameData = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/game`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGameData(data);
    } catch (e) {
      console.error("Erreur lors de la récupération des données du jeu:", e);
      setError("Impossible de charger les données du jeu. Le serveur est-il bien lancé ?");
    }
  }, []);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  const handlePlayerSelect = (player) => {
    setCurrentPlayer(player);
  };

  const handleTerritorySelect = (territory) => {
    setSelectedTerritory(territory);
  };

  const handleCloseDetail = () => {
    setSelectedTerritory(null);
  };

  const getOwner = (territory) => {
    if (!territory || !gameData) return null;
    return gameData.players.find(p => p.id === territory.ownerId);
  };

  const isSpectator = currentPlayer && currentPlayer.id === 'spectator';
  const pendingChallengesCount = gameData?.challenges.filter(c => c.status === 'pending').length || 0;

  // Render PlayerSelection if no player is chosen yet or if data is not loaded
  if (!currentPlayer) {
    return (
      <PlayerSelection 
        players={gameData?.players || []} 
        onPlayerSelect={handlePlayerSelect} 
      />
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Jeu de Territoire</h1>
        <div className="current-player-info">
          Connecté en tant que : <span style={{ color: currentPlayer.color, fontWeight: 'bold' }}>{currentPlayer.name}</span>
        </div>
      </header>
      <main>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {gameData ? (
          <div className="main-layout">
            <PlayerList players={gameData.players} currentPlayerId={currentPlayer.id} />
            <Map 
              territories={gameData.territories} 
              players={gameData.players}
              onTerritorySelect={handleTerritorySelect}
              isSpectator={isSpectator}
            />
            <EventLog />
          </div>
        ) : (
          <p>Chargement de la carte...</p>
        )}
      </main>

      {!isSpectator && (
        <button className="voting-panel-toggle" onClick={() => setVotingPanelOpen(true)}>
          <span className="toggle-icon">⚖️</span>
          {pendingChallengesCount > 0 && (
            <span className="notification-badge">{pendingChallengesCount}</span>
          )}
        </button>
      )}

      <VotingPanel 
        gameData={gameData} 
        onVote={fetchGameData}
        isOpen={isVotingPanelOpen}
        onClose={() => setVotingPanelOpen(false)}
        currentPlayerId={currentPlayer.id}
        isSpectator={isSpectator}
      />

      {selectedTerritory && (
        <TerritoryDetail 
          territory={selectedTerritory}
          owner={getOwner(selectedTerritory)}
          onClose={handleCloseDetail}
          onChallengeSubmit={fetchGameData}
          currentPlayerId={currentPlayer.id}
          gameData={gameData}
          isSpectator={isSpectator}
        />
      )}
    </div>
  );
}

export default App;
