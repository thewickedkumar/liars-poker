import React, { useEffect, useRef, useState } from 'react';
import { joinRoom, generatePlayerId } from '../firebase';
import { useToast } from './Toast';
import { sounds } from '../sounds';
import './JoinRoom.css';

const JoinRoom = ({ onBack, onRoomJoined }) => {
  const toast = useToast();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [isJoining, setIsJoining] = useState(false);
  const [errField, setErrField] = useState('');
  const codeRef = useRef(null);
  const nameRef = useRef(null);

  // Prefill from a shared link: ?room=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    if (r) {
      setRoomCode(r);
      nameRef.current?.focus();
    } else {
      codeRef.current?.focus();
    }
  }, []);

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setErrField(!roomCode.trim() ? 'code' : 'name');
      toast('Enter both a room code and your name', 'warn');
      return;
    }

    setIsJoining(true);
    setErrField('');
    try {
      const playerId = generatePlayerId();
      const roomData = await joinRoom(roomCode.trim(), playerId, playerName.trim());

      localStorage.setItem('playerId', playerId);
      localStorage.setItem('playerName', playerName.trim());
      localStorage.setItem('serialNumber', roomData.playerSerialNumber);

      sounds.join();
      toast('Seated at the table', 'success');
      onRoomJoined?.(roomCode.trim(), playerId, playerName.trim(), roomData.playerSerialNumber, roomData);
    } catch (error) {
      console.error('Error joining room:', error);
      if (error.message === 'Room not found') {
        setErrField('code');
        toast('No table with that code', 'error');
      } else {
        toast('Could not join. Try again.', 'error');
      }
    } finally {
      setIsJoining(false);
    }
  };

  const onKey = (e) => e.key === 'Enter' && handleJoinRoom();

  return (
    <div className="lobby center-col">
      <div className="lobby-card join-card shell-max stagger">
        <button className="tp-back" onClick={onBack}>◂ Lobby</button>

        <div className="lobby-head">
          <span className="tp-eyebrow">Take a Seat</span>
          <h1 className="lobby-title tp-display">Join a Table</h1>
          <p className="lobby-sub">Enter the code from the host to get dealt in.</p>
        </div>

        <div className="tp-field lobby-field">
          <label htmlFor="roomCode">Room Code</label>
          <input
            ref={codeRef}
            id="roomCode"
            className={`tp-input code-input ${errField === 'code' ? 'error' : ''}`}
            type="text"
            value={roomCode}
            onChange={(e) => { setRoomCode(e.target.value); setErrField(''); }}
            onKeyDown={onKey}
            placeholder="paste code"
            maxLength={30}
            disabled={isJoining}
          />
        </div>

        <div className="tp-field lobby-field">
          <label htmlFor="playerName">Trader Name</label>
          <input
            ref={nameRef}
            id="playerName"
            className={`tp-input ${errField === 'name' ? 'error' : ''}`}
            type="text"
            value={playerName}
            onChange={(e) => { setPlayerName(e.target.value); setErrField(''); }}
            onKeyDown={onKey}
            placeholder="e.g. Gutfreund"
            maxLength={20}
            disabled={isJoining}
          />
        </div>

        <button className="tp-btn lobby-go" onClick={handleJoinRoom} disabled={isJoining || !roomCode.trim() || !playerName.trim()}>
          {isJoining ? 'Seating…' : '▸ Sit Down'}
        </button>
      </div>
    </div>
  );
};

export default JoinRoom;
