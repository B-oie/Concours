import React from 'react';
import './ChallengeList.css';

function ChallengeList({ challenges }) {
  if (!challenges || challenges.length === 0) {
    return <div className="challenge-list">Aucun défi disponible pour le moment.</div>;
  }

  return (
    <div className="challenge-list-container">
      <h2>Liste des Défis</h2>
      <div className="challenge-list">
        {challenges.map(challenge => (
          <div key={challenge.id} className={`challenge-card level-${challenge.niveau}`}>
            <div className="challenge-header">
              <h3>{challenge.titre}</h3>
              <span className="challenge-level">Niveau {challenge.niveau}</span>
            </div>
            <p className="challenge-description">{challenge.description}</p>
            <div className="challenge-footer">
              <span>Preuve : {challenge.type_preuve}</span>
              <span className={`challenge-status status-${challenge.statut}`}>{challenge.statut}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChallengeList;
