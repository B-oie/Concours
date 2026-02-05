const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const multer = require('multer');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// --- Helpers for Database I/O ---
const readDB = async () => {
    try {
        const dbData = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(dbData);
    } catch (error) {
        console.error("Fatal error reading database:", error);
        throw new Error("Could not read database.");
    }
};

const writeDB = async (db) => {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    } catch (error) {
        console.error("Fatal error writing to database:", error);
        throw new Error("Could not write to database.");
    }
};

// --- NOUVEAU : Helper pour l'historique ---
const logEvent = (db, message) => {
    const newEvent = {
        id: crypto.randomUUID(),
        message,
        timestamp: new Date().toISOString(),
    };
    db.events.unshift(newEvent); // Ajoute au début pour un tri naturel
};

// --- Multer Configuration for File Uploads ---
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `proof-${uniqueSuffix}${extension}`);
    }
});
const upload = multer({ storage });


// --- Core Game Logic ---

const getPointsPerHour = (level) => {
    switch (level) {
        case 1: return 1;
        case 2: return 2;
        case 3: return 4;
        default: return 0;
    }
};

const resolveChallenge = (db, challengeId, outcome) => {
    const activeChallengeIndex = db.challenges.findIndex(c => c.id === challengeId);
    if (activeChallengeIndex === -1) return;
    
    const challenge = db.challenges[activeChallengeIndex];
    const territory = db.territories.find(t => t.id === challenge.territoryId);
    const vote = db.votes.find(v => v.challengeId === challengeId);

    if (!territory || !vote) return;

    const challenger = db.players.find(p => p.id === challenge.playerId);
    if (!challenger) return;

    challenge.status = 'resolved';
    vote.status = 'resolved';
    territory.activeChallengeId = null;

    if (outcome === 'approved') {
        const startTime = new Date(vote.createdAt);
        const endTime = new Date();
        const durationHours = Math.ceil((endTime - startTime) / 3600000);
        
        const oldOwnerId = territory.ownerId;
        const oldOwner = db.players.find(p => p.id === oldOwnerId);

        let newTerritoryLevel = territory.level;
        let eventMessage = '';

        if (oldOwnerId !== challenge.playerId) {
            newTerritoryLevel = 1; // Capture or steal
            if (oldOwner) {
                eventMessage = `${challenger.name} a volé le territoire ${territory.name} à ${oldOwner.name} !`;
            } else {
                eventMessage = `${challenger.name} a conquis le territoire ${territory.name} !`;
            }
        } else if (territory.level < 3) {
            newTerritoryLevel++; // Upgrade
            eventMessage = `${challenger.name} a amélioré le territoire ${territory.name} au niveau ${newTerritoryLevel}.`;
        }

        const pointsAwarded = getPointsPerHour(newTerritoryLevel) * durationHours;
        challenger.score += pointsAwarded;

        territory.ownerId = challenge.playerId;
        territory.level = newTerritoryLevel;
        
        if (eventMessage) logEvent(db, eventMessage);

    } else { // 'rejected'
        const eventMessage = `Le défi de ${challenger.name} sur le territoire ${territory.name} a été rejeté par les autres joueurs.`;
        logEvent(db, eventMessage);
    }

    // Unassign the original challenge template
    const template = db.challenges.find(c => c.id === challenge.challengeTemplateId);
    if (template) {
        template.assignedToTerritoryId = null;
    }

    // Clean up resolved challenge and vote
    db.votes = db.votes.filter(v => v.challengeId !== challengeId);
    // We keep the challenge in the main list but mark it as resolved.
};


// --- API Endpoints ---

// NOUVEAU : Endpoint pour l'historique
app.get('/api/events', async (req, res) => {
    try {
        const db = await readDB();
        // Les événements sont déjà triés du plus récent au plus ancien grâce à unshift
        res.json(db.events || []);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
});


app.get('/api/game', async (req, res) => {
    try {
        const db = await readDB();
        res.json(db);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
});

app.get('/api/territories/:territoryId/challenge-template', async (req, res) => {
    const { territoryId } = req.params;
    try {
        const db = await readDB();
        const territory = db.territories.find(t => t.id === territoryId);

        if (!territory) {
            return res.status(404).json({ message: "Territoire non trouvé." });
        }

        // --- AMÉLIORATION ---
        // Vérifier si un défi est déjà assigné à ce territoire et le renvoyer si c'est le cas.
        const alreadyAssigned = db.challenges.find(c => c.assignedToTerritoryId === territoryId && c.statut === 'disponible');
        if (alreadyAssigned) {
            console.log(`Le défi ${alreadyAssigned.id} est déjà assigné à ${territoryId}, renvoi de celui-ci.`);
            return res.json(alreadyAssigned);
        }

        let targetLevel;
        if (territory.ownerId === null) {
            targetLevel = 1; // Capture
        } else {
            targetLevel = territory.level + 1; // Upgrade or Steal
        }

        if (territory.level >= 3 && territory.ownerId !== null) {
             return res.status(404).json({ message: "Ce territoire est déjà au niveau maximum." });
        }

        const availableTemplates = db.challenges.filter(c =>
            c.niveau === targetLevel &&
            c.statut === 'disponible' &&
            !c.assignedToTerritoryId
        );

        if (availableTemplates.length === 0) {
            return res.status(404).json({ message: `Aucun défi de niveau ${targetLevel} n'est disponible.` });
        }

        const selectedTemplate = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
        
        // Temporarily assign template to prevent re-selection (optional, but good practice)
        const templateInDb = db.challenges.find(c => c.id === selectedTemplate.id);
        if(templateInDb) {
            templateInDb.assignedToTerritoryId = territoryId;
        }
        
        await writeDB(db);
        res.json(selectedTemplate);

    } catch (error) {
        console.error(`Error assigning challenge to territory ${territoryId}:`, error);
        res.status(500).json({ message: "Erreur interne du serveur.", error: error.message });
    }
});

app.post('/api/challenges', upload.single('proof'), async (req, res) => {
    const { territoryId, playerId, proofText, challengeTemplateId, challengeTitle, challengeDescription, challengeProofType, challengeLevel } = req.body;

    try {
        const db = await readDB();
        const territory = db.territories.find(t => t.id === territoryId);
        const player = db.players.find(p => p.id === parseInt(playerId));

        if (!territory || !player) {
            return res.status(404).json({ message: "Territoire ou joueur non trouvé." });
        }
        if (territory.activeChallengeId) {
            return res.status(409).json({ message: "Un vote est déjà en cours sur ce territoire." });
        }

        const newChallengeId = crypto.randomUUID();
        const newChallenge = {
            id: newChallengeId,
            territoryId,
            playerId: parseInt(playerId),
            proof: {
                text: proofText || '',
                file: req.file ? `/uploads/${req.file.filename}` : null
            },
            status: 'pending',
            createdAt: new Date().toISOString(),
            challengeTemplateId: parseInt(challengeTemplateId),
            titre: challengeTitle,
            description: challengeDescription,
            type_preuve: challengeProofType,
            niveau: parseInt(challengeLevel)
        };

        const newVote = {
            challengeId: newChallengeId,
            voters: [],
            votesFor: 0,
            votesAgainst: 0,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
        };

        db.challenges.push(newChallenge);
        db.votes.push(newVote);
        territory.activeChallengeId = newChallengeId;

        logEvent(db, `${player.name} a lancé un défi sur le territoire ${territory.name}.`);

        await writeDB(db);
        res.status(201).json({ message: "Défi soumis et vote créé.", challenge: newChallenge });

    } catch (error) {
        console.error("Erreur lors de la soumission du défi:", error);
        res.status(500).json({ message: "Erreur interne du serveur.", error: error.message });
    }
});

app.post('/api/votes/:challengeId/vote', async (req, res) => {
    const { challengeId } = req.params;
    const { playerId, decision } = req.body;

    try {
        const db = await readDB();
        const vote = db.votes.find(v => v.challengeId === challengeId);
        const challenge = db.challenges.find(c => c.id === challengeId);

        if (!vote || !challenge) {
            return res.status(404).json({ message: "Vote ou défi non trouvé." });
        }
        if (challenge.playerId === parseInt(playerId)) {
            return res.status(403).json({ message: "Vous ne pouvez pas voter pour votre propre défi." });
        }
        if (vote.voters.includes(parseInt(playerId))) {
            return res.status(403).json({ message: "Vous avez déjà voté." });
        }
        if (new Date(vote.expiresAt) < new Date()) {
            return res.status(403).json({ message: "Ce vote est terminé." });
        }

        vote.voters.push(parseInt(playerId));
        if (decision === 'for') vote.votesFor++;
        else if (decision === 'against') vote.votesAgainst++;

        const eligibleVotersCount = db.players.length - 1;
        const majorityThreshold = Math.floor(eligibleVotersCount / 2) + 1;
        let voteResolved = false;
        let outcome = null;

        if (vote.votesFor >= majorityThreshold) {
            outcome = 'approved';
        } else if (vote.votesAgainst >= majorityThreshold) {
            outcome = 'rejected';
        } else if (vote.voters.length === eligibleVotersCount) {
            outcome = vote.votesFor > vote.votesAgainst ? 'approved' : 'rejected';
        }

        if (outcome) {
            voteResolved = true;
            resolveChallenge(db, challengeId, outcome);
        }

        await writeDB(db);
        res.status(200).json({ message: "Vote enregistré.", vote, voteResolved, outcome });

    } catch (error) {
        console.error("Erreur lors de l'enregistrement du vote:", error);
        res.status(500).json({ message: "Erreur interne du serveur.", error: error.message });
    }
});

app.post('/api/players/:targetId/attack', async (req, res) => {
    const { targetId } = req.params;
    const { attackerId, points } = req.body;

    if (!attackerId || !points || points <= 0) {
        return res.status(400).json({ message: "ID de l'attaquant et points (positif) requis." });
    }

    try {
        const db = await readDB();
        const attacker = db.players.find(p => p.id === attackerId);
        const target = db.players.find(p => p.id === parseInt(targetId));

        if (!attacker || !target) {
            return res.status(404).json({ message: "Attaquant ou cible non trouvé." });
        }
        if (attacker.score < points) {
            return res.status(400).json({ message: "Pas assez de points pour cette attaque." });
        }

        attacker.score -= points;
        target.score = Math.max(0, target.score - points);

        logEvent(db, `${attacker.name} a attaqué ${target.name} pour ${points} points de dégâts !`);

        await writeDB(db);
        res.status(200).json({ message: `Attaque réussie.`, attackerNewScore: attacker.score, targetNewScore: target.score });

    } catch (error) {
        console.error("Erreur lors de l'attaque:", error);
        res.status(500).json({ message: "Erreur interne du serveur.", error: error.message });
    }
});


// --- Scheduled Tasks (Cron) ---

const processExpiredVotes = async () => {
    const db = await readDB();
    let dbModified = false;
    const now = new Date();

    for (const vote of db.votes) {
        if (vote.status === 'pending' && new Date(vote.expiresAt) < now) {
            console.log(`Vote expiré détecté pour le défi ${vote.challengeId}`);
            const outcome = vote.votesFor > vote.votesAgainst ? 'approved' : 'rejected';
            resolveChallenge(db, vote.challengeId, outcome);
            dbModified = true;
        }
    }

    if (dbModified) {
        await writeDB(db);
        console.log('Votes expirés résolus et DB mise à jour.');
    }
};

const applyHourlyPointsAndBonuses = async () => {
    // This should run hourly in production, but runs every minute for testing.
    const db = await readDB();
    const pointsGained = {};
    db.players.forEach(p => pointsGained[p.id] = 0);

    // Base points from territories
    db.territories.forEach(t => {
        if (t.ownerId) {
            pointsGained[t.ownerId] += getPointsPerHour(t.level);
        }
    });

    // Regional bonuses
    const regions = { 'Cœur': { bonus: 3, territories: [] }, 'Ouest': { bonus: 2, territories: [] }, 'Est': { bonus: 2, territories: [] } };
    db.territories.forEach(t => {
        if (regions[t.region]) regions[t.region].territories.push(t);
    });

    for (const regionName in regions) {
        const region = regions[regionName];
        const firstOwner = region.territories[0]?.ownerId;
        if (firstOwner && region.territories.every(t => t.ownerId === firstOwner)) {
            pointsGained[firstOwner] += region.bonus;
            const player = db.players.find(p => p.id === firstOwner);
            if(player) {
                logEvent(db, `${player.name} a gagné un bonus de ${region.bonus} points pour le contrôle de la région ${regionName}.`);
            }
        }
    }

    let dbModified = false;
    db.players.forEach(player => {
        if (pointsGained[player.id] > 0) {
            player.score += pointsGained[player.id];
            dbModified = true;
        }
    });

    if (dbModified) {
        await writeDB(db);
        console.log('Points horaires et bonus appliqués.');
    }
};

// Main scheduled task runner
cron.schedule('* * * * *', async () => { // Runs every minute
    console.log('Exécution des tâches planifiées...');
    try {
        await processExpiredVotes();
        await applyHourlyPointsAndBonuses();
    } catch (error) {
        console.error("Erreur lors de l'exécution des tâches planifiées:", error);
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Le serveur est démarré sur http://localhost:${PORT}`);
});
