import React, { useState, useEffect } from 'react';
import './EventLog.css';

const EventLog = () => {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/events');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                setError(error.message);
                console.error("Failed to fetch events:", error);
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 15000); // Refresh every 15 seconds

        return () => clearInterval(interval);
    }, []);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (error) {
        return <div className="event-log-container">Erreur: {error}</div>;
    }

    return (
        <div className="event-log-container">
            <h3>Historique des Événements</h3>
            <ul className="event-list">
                {events.map(event => (
                    <li key={event.id} className="event-item">
                        <span className="event-timestamp">{formatTimestamp(event.timestamp)}</span>
                        <span className="event-message">{event.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default EventLog;
