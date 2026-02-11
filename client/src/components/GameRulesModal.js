import React from 'react';
import './GameRulesModal.css'; // We'll create this CSS file next

function GameRulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Règles du Jeu de Territoire</h2>
        <p>
          Bienvenue dans le Jeu de Territoire ! Voici les règles de base pour vous aider à démarrer :
        </p>
        <h3>Objectif</h3>
        <p>
          Accumuler le maximum de points sur 10 mois (1er mars → 31 décembre) en contrôlant des territoires.
        </p>
        <h3>Structure des Territoires</h3>
        <ul>
          <li>10 territoires répartis en 3 régions :</li>
          <ul>
            <li>Cœur : 2 territoires (C1, C2) → Bonus +3 pts/h si contrôle complet</li>
            <li>Ouest : 4 territoires (O1-O4) → Bonus +2 pts/h si contrôle complet</li>
            <li>Est : 4 territoires (E1-E4) → Bonus +2 pts/h si contrôle complet</li>
          </ul>
        </ul>
        <h3>Niveaux de Territoires</h3>
        <ul>
          <li>Niveau 0 : Territoire non capturé (défi initial disponible)</li>
          <li>Niveau 1 : Généré 1 pt/h</li>
          <li>Niveau 2 : Généré 2 pts/h</li>
          <li>Niveau 3 : Généré 4 pts/h (niveau maximum)</li>
        </ul>
        <h3>Système de Défis</h3>
        <h4>Capture/Amélioration</h4>
        <ul>
          <li>Pour capturer un territoire niveau 0 → réussir le défi de base → territoire passe niveau 1</li>
          <li>Pour voler un territoire à quelqu'un → réussir le défi actuel → territoire redescend niveau 1 pour le nouveau propriétaire</li>
          <li>Pour améliorer son propre territoire → réussir le défi actuel → territoire monte d'un niveau</li>
        </ul>
        <h4>Soumission de Preuve</h4>
        <ul>
          <li>Le joueur soumet une preuve (texte/lien/image/vidéo)</li>
          <li>Le territoire est bloqué pendant le vote (aucun nouveau défi ne peut être soumis)</li>
          <li>Les autres joueurs votent</li>
        </ul>
        <h3>Système de Vote</h3>
        <ul>
          <li>Qui vote : Tous les joueurs SAUF celui qui a soumis le défi</li>
          <li>Majorité simple : 50% + 1 des votants</li>
          <li>Durée max : 24h OU dès que la majorité est atteinte</li>
          <li>Si validé : Le joueur gagne le territoire au niveau cible</li>
          <li>Si refusé : Le territoire reste à l'ancien propriétaire (ou reste disponible si niveau 0)</li>
        </ul>
        <h3>Points Rétroactifs</h3>
        <ul>
          <li>Les points sont calculés depuis le début du vote jusqu'à sa résolution</li>
          <li>Exemple : Vote dure 20h, territoire niveau 1 → +20 points d'un coup au gagnant</li>
          <li>Si refusé et territoire occupé → l'ancien propriétaire récupère ces points rétroactifs</li>
        </ul>
        <h3>Génération de Points</h3>
        <ul>
          <li>Calcul automatique toutes les heures</li>
          <li>Points de base par territoire : 1 pt/h (N1), 2 pts/h (N2), 4 pts/h (N3)</li>
          <li>Bonus régionaux si contrôle 100% d'une région</li>
        </ul>
        <button onClick={onClose} className="close-button">Fermer</button>
      </div>
    </div>
  );
}

export default GameRulesModal;
