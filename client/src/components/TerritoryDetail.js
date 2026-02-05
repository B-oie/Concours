import React, { useState, useEffect } from 'react';
import './TerritoryDetail.css';

const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

const TerritoryDetail = ({ territory, owner, onClose, onChallengeSubmit, currentPlayerId, gameData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofText, setProofText] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [error, setError] = useState('');
  const [fetchedChallengeTemplate, setFetchedChallengeTemplate] = useState(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);

  useEffect(() => {
    const fetchChallenge = async () => {
      setLoadingChallenge(true);
      setFetchedChallengeTemplate(null);
      setError('');
      if (!territory || !gameData) { // Add check here to prevent API call if data is not ready
        setLoadingChallenge(false);
        return;
      }
      try {
        const response = await fetch(`${apiUrl}/api/territories/${territory.id}/challenge-template`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || "Erreur lors de la récupération du défi.");
        }
        const data = await response.json();
        setFetchedChallengeTemplate(data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching challenge template:", err);
      } finally {
        setLoadingChallenge(false);
      }
    };

    fetchChallenge();
  }, [territory, gameData]); // Refetch when territory or gameData changes

  if (!territory || !gameData) return null;

  const handleChallengeSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const challengeToSubmit = fetchedChallengeTemplate;

    if (!challengeToSubmit) {
      setError("Aucun défi disponible pour ce territoire.");
      return;
    }

    if (challengeToSubmit.type_preuve !== 'aucune' && !proofText && !proofFile) {
      setError("Vous devez fournir une preuve (texte et/ou fichier) pour ce défi.");
      return;
    }
    if (challengeToSubmit.type_preuve === 'aucune' && (proofText || proofFile)) {
        // If no proof is required, but user provided some, maybe warn or ignore.
        // For now, let's just proceed.
    }


    const formData = new FormData();
    formData.append('territoryId', territory.id);
    formData.append('playerId', currentPlayerId);
    formData.append('proofText', proofText);
    
    if (proofFile) {
      formData.append('proof', proofFile);
    }

    // Append challenge template details
    formData.append('challengeTemplateId', challengeToSubmit.id);
    formData.append('challengeTitle', challengeToSubmit.titre);
    formData.append('challengeDescription', challengeToSubmit.description);
    formData.append('challengeProofType', challengeToSubmit.type_preuve);
    formData.append('challengeLevel', challengeToSubmit.niveau);


    try {
      const response = await fetch(`${apiUrl}/api/challenges`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Une erreur s'est produite.");
      }

      await response.json();
      
      onChallengeSubmit(); // Refresh game data
      setIsSubmitting(false);
      onClose();

    } catch (err) {
      setError(err.message);
    }
  };

  const renderContent = () => {
    if (isSubmitting) {
      return (
        <form onSubmit={handleChallengeSubmit} className="challenge-form">
          <h3>Soumettre une preuve pour "{fetchedChallengeTemplate?.titre}"</h3>
          <p>Pour le territoire : <strong>{territory.name}</strong></p>
          {error && <p className="error-message">{error}</p>}
          
          {fetchedChallengeTemplate?.type_preuve !== 'aucune' && (
            <>
              <label htmlFor="proof-text">Description (contexte, explication) :</label>
              <textarea
                id="proof-text"
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                placeholder="Décrivez votre preuve, collez un lien..."
                rows="3"
              />
              
              <label htmlFor="proof-file">Fichier de preuve (image/vidéo) :</label>
              <input
                id="proof-file"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setProofFile(e.target.files[0])}
              />
            </>
          )}
          {fetchedChallengeTemplate?.type_preuve === 'aucune' && (
            <p>Ce défi ne nécessite pas de preuve. Cliquez sur "Envoyer" pour le réclamer.</p>
          )}

          <div className="form-actions">
            <button type="button" onClick={() => setIsSubmitting(false)} className="cancel-button">Annuler</button>
            <button type="submit" className="action-button">Envoyer</button>
          </div>
        </form>
      );
    }

    const isLocked = territory.activeChallengeId;

    return (
      <>
        <h2 style={{ borderColor: owner ? owner.color : '#555' }}>{territory.name}</h2>
        <div className="details-grid">
          <p><strong>Région :</strong> {territory.region}</p>
          <p><strong>Niveau :</strong> {territory.level}</p>
          <p><strong>Propriétaire :</strong> <span style={{ color: owner?.color || 'white' }}>{owner?.name || 'Aucun'}</span></p>
          <p><strong>Points / heure :</strong> {territory.level === 1 ? 1 : territory.level === 2 ? 2 : territory.level === 3 ? 4 : 0}</p>
        </div>
        <div className="challenge-section">
          <h3>Défi pour ce territoire</h3>
          {isLocked ? (
            <p className="locked-message">Un vote est en cours sur ce territoire.</p>
          ) : loadingChallenge ? (
            <p>Chargement du défi...</p>
          ) : (
            fetchedChallengeTemplate ? (
              <>
                <p><strong>Défi :</strong> {fetchedChallengeTemplate.titre} (Niveau {fetchedChallengeTemplate.niveau})</p>
                <p>{fetchedChallengeTemplate.description}</p>
                <button 
                  className="action-button" 
                  onClick={() => setIsSubmitting(true)}
                  disabled={isLocked}
                >
                  Tenter le défi
                </button>
              </>
            ) : (
              <p>Aucun défi disponible pour ce territoire actuellement.</p>
            )
          )}
        </div>
      </>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        {renderContent()}
      </div>
    </div>
  );
};

export default TerritoryDetail;