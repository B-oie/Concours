import React from 'react';
import './Map.css';

// Helper function to calculate region owners
const getRegionOwners = (territories) => {
  const regions = {};
  for (const t of territories) {
    if (!regions[t.region]) regions[t.region] = [];
    regions[t.region].push(t);
  }

  const regionOwners = {};
  for (const regionName in regions) {
    const regionTerritories = regions[regionName];
    const firstOwnerId = regionTerritories[0]?.ownerId;
    if (firstOwnerId && regionTerritories.every(t => t.ownerId === firstOwnerId)) {
      regionOwners[regionName] = firstOwnerId;
    } else {
      regionOwners[regionName] = null;
    }
  }
  return regionOwners;
};

// Main Map Component, rewritten for the new column-based CSS structure
const Map = React.memo(({ territories, players, onTerritorySelect }) => {
  // Group territories by region for column-based layout
  const territoriesByRegion = territories.reduce((acc, territory) => {
    (acc[territory.region] = acc[territory.region] || []).push(territory);
    return acc;
  }, {});

  // Calculate region owners for the glow effect
  const regionOwners = getRegionOwners(territories);
  const playerColors = players.reduce((acc, player) => {
    acc[player.id] = player.color;
    return acc;
  }, {});

  // Define the order of regions for consistent display
  const regionOrder = ['Ouest', 'Cœur', 'Est'];

  return (
    <div className="map-container">
      <div className="map-grid">
        {regionOrder.map(regionName => {
          if (!territoriesByRegion[regionName]) return null; // Ne pas afficher la colonne si la région est vide
          
          const regionTerritories = territoriesByRegion[regionName];
          
          // Determine if the region has a glow
          const regionOwnerId = regionOwners[regionName];
          const columnStyle = {};
          if (regionOwnerId) {
            const glowColor = playerColors[regionOwnerId] || '#fff';
            // Appliquer un halo de lumière à la colonne entière
            columnStyle.boxShadow = `0 0 20px 4px ${glowColor}`;
            // Optionnel : renforcer la couleur de la bordure supérieure
            columnStyle.borderColor = glowColor;
          }

          return (
            <div 
              key={regionName} 
              className={`map-column region-${regionName.toLowerCase()}`}
              style={columnStyle} // Appliquer le style de halo ici
            >
              <h3 className="region-title">{regionName}</h3>
              {regionTerritories.map(territory => {
                const owner = players.find(p => p.id === territory.ownerId);
                const isLocked = territory.activeChallengeId;

                const territoryCellStyle = {};
                if (owner) {
                  // Appliquer la couleur du joueur en fond, avec de la transparence (AA = ~66% opacité)
                  territoryCellStyle.backgroundColor = `${owner.color}AA`;
                  // Garder une bordure plus foncée pour la lisibilité
                  territoryCellStyle.borderLeft = `6px solid ${owner.color}`;
                } else {
                  territoryCellStyle.borderLeft = `6px solid transparent`;
                }

                return (
                  <div
                    key={territory.id}
                    className={`territory-cell ${isLocked ? 'locked' : ''}`}
                    style={territoryCellStyle}
                    onClick={() => onTerritorySelect(territory)}
                  >
                    {isLocked && <span className="locked-icon" title="Un vote est en cours">🔒</span>}
                    <span className="territory-name">{territory.name}</span>
                    <span className="territory-level">Niveau {territory.level}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default Map;
