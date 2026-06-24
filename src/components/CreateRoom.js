import React, { useEffect, useRef, useState } from 'react';
import { createRoom, generatePlayerId, generateSerialNumber } from '../firebase';
import { useToast } from './Toast';
import { sounds } from '../sounds';
import DollarBill from './DollarBill';
import './CreateRoom.css';

const CreateRoom = ({ onBack, onRoomCreated }) => {
  const toast = useToast();
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [serialNumber, setSerialNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    setSerialNumber(generateSerialNumber());
    nameRef.current?.focus();
  }, []);

  const handleRegenerateSerial = () => {
    if (isCreating) return;
    sounds.tick();
    setSerialNumber(generateSerialNumber());
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast('Enter your name to open a table', 'warn');
      nameRef.current?.focus();
      return;
    }

    setIsCreating(true);
    try {
      const playerId = generatePlayerId();
      const roomId = await createRoom(playerId, playerName.trim(), serialNumber);

      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', playerName.trim());
      localStorage.setItem('serialNumber', serialNumber);

      sounds.bet();
      toast('Table opened — share the code', 'success');
      onRoomCreated?.(roomId, playerId, playerName.trim(), serialNumber);
    } catch (error) {
      console.error('Error creating room:', error);
      toast('Could not open the table. Try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="lobby center-col">
      <div className="lobby-card shell-max stagger">
        <button className="tp-back" onClick={onBack}>◂ Lobby</button>

        <div className="lobby-head">
          <span className="tp-eyebrow">New Table</span>
          <h1 className="lobby-title tp-display">Open a Table</h1>
          <p className="lobby-sub">You'll be the house. Deal yourself in and invite the floor.</p>
        </div>

        <DollarBill serialNumber={serialNumber} label="Your Note" owner={playerName.trim() || undefined}>
          <button className="tp-btn ghost amber" onClick={handleRegenerateSerial} disabled={isCreating}>
            ↻ Re-deal Serial
          </button>
        </DollarBill>

        <div className="tp-field lobby-field">
          <label htmlFor="playerName">Trader Name</label>
          <input
            ref={nameRef}
            id="playerName"
            className="tp-input"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            placeholder="e.g. Meriwether"
            maxLength={20}
            disabled={isCreating}
          />
        </div>

        <button className="tp-btn lobby-go" onClick={handleCreateRoom} disabled={isCreating || !playerName.trim()}>
          {isCreating ? 'Opening…' : '▸ Open Table'}
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;
