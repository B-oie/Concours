import React, { useState } from 'react';
import './VotingPanel.css';

const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

// --- Fonctions d'aide à l'affichage (déplacées en dehors du composant) ---

const renderMedia = (filePath) => {
  const fullUrl = `${apiUrl}${filePath}`;
  const extension = filePath.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return <img src={fullUrl} alt="Preuve" className="proof-media" />;
  } else if (['mp4', 'webm', 'ogg'].includes(extension)) {
    return <video src={fullUrl} controls className="proof-media" />;
  } else {
    return <p className="proof-text">Fichier de preuve : <a href={fullUrl} target="_blank" rel="noopener noreferrer">{filePath}</a></p>;
  }
};

const renderProof = (proof) => {
  if (!proof) return <p className="proof-text">Aucune preuve fournie.</p>;

  // Gère le nouveau format de preuve (objet)
  if (typeof proof === 'object' && proof !== null) {
    return (
      <>
        {proof.text && <p className="proof-text">"{proof.text}"</p>}
        {proof.file && renderMedia(proof.file)}
      </>
    );
  }

  // Gère l'ancien format (string) pour la compatibilité
  if (typeof proof === 'string') {
    if (proof.startsWith('/uploads/')) {
      return renderMedia(proof);
    }
    return <p className="proof-text">Preuve : "{proof}"</p>;
  }

  return null;
};

// --- Composant Principal ---

const VotingPanel = ({ gameData, onVote, isOpen, onClose, currentPlayerId }) => {
  const [errors, setErrors] = useState({});

  if (!gameData || !gameData.challenges || !gameData.votes) {
    return null;
  }

  const handleVote = async (challengeId, decision) => {
    const votingPlayerId = currentPlayerId;

    try {
      const response = await fetch(`${apiUrl}/api/votes/${challengeId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: votingPlayerId, decision }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Erreur lors du vote.');
      }

      onVote();

    } catch (err) {
      setErrors(prev => ({ ...prev, [challengeId]: err.message }));
    }
  };

  const getChallengeDetails = (challengeId) => {
    const challenge = gameData.challenges.find(c => c.id === challengeId);
    const territory = gameData.territories.find(t => t.id === challenge?.territoryId);
    const player = gameData.players.find(p => p.id === challenge?.playerId);
    return { challenge, territory, player };
  }

  const pendingChallenges = gameData.challenges.filter(c => c.status === 'pending');

  return (
    <>
      {isOpen && <div className={`voting-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>}
      <div className={`voting-panel ${isOpen ? 'open' : ''}`}>
        <button className="voting-panel-close-button" onClick={onClose}>&times;</button>
        <h2 className="panel-title">Votes en Cours</h2>
        <div className="vote-list">
          {pendingChallenges.length > 0 ? (
            pendingChallenges.map(challenge => {
              const { territory, player } = getChallengeDetails(challenge.id);
              const vote = gameData.votes.find(v => v.challengeId === challenge.id);

              if (!territory || !player || !vote) return null;

              const hasVoted = vote.voters.includes(currentPlayerId);
              const isSubmitter = challenge.playerId === currentPlayerId;
              const error = errors[challenge.id];

              return (
                <div key={challenge.id} className="vote-item">
                  <div className="vote-info">
                    <p>
                      <strong>{player.name}</strong> tente de prendre/améliorer <strong>{territory.name}</strong> avec le défi :
                    </p>
                    <h3>{challenge.titre} (Niveau {challenge.niveau})</h3>
                    <p className="challenge-description-vote">{challenge.description}</p>
                    {renderProof(challenge.proof)}
                    {error && <p className="error-message">{error}</p>}
                  </div>
                  <div className="vote-actions">
                    <button 
                      className="vote-button for" 
                      onClick={() => handleVote(challenge.id, 'for')}
                      disabled={hasVoted || isSubmitter}
                    >
                      Pour ({vote.votesFor})
                    </button>
                    <button 
                      className="vote-button against" 
                      onClick={() => handleVote(challenge.id, 'against')}
                      disabled={hasVoted || isSubmitter}
                    >
                      Contre ({vote.votesAgainst})
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-votes">Aucun vote en cours.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default VotingPanel;

