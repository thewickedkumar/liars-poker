import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDoc, updateDoc, deleteDoc, doc, onSnapshot,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC84n5E2QWT0Bxk5ExWvxbDI2z6lUJen_Q",
  authDomain: "liars-poker-e2172.firebaseapp.com",
  projectId: "liars-poker-e2172",
  storageBucket: "liars-poker-e2172.firebasestorage.app",
  messagingSenderId: "773209002237",
  appId: "1:773209002237:web:7059a4d9e1f061bd092e94",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections
export const ROOMS_COLLECTION = 'rooms';

// --- Serial numbers (2 letters + 8 digits, like a US bill) ---
export const generateSerialNumber = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let serial = '';
  for (let i = 0; i < 2; i++) serial += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 8; i++) serial += numbers[Math.floor(Math.random() * numbers.length)];
  return serial;
};

export const generatePlayerId = () => 'player_' + Math.random().toString(36).slice(2, 11);

// --- Room lifecycle ---
export const createRoom = async (hostId, hostName, hostSerialNumber) => {
  const roomData = {
    hostId,
    hostName,
    hostSerialNumber,
    players: [{
      id: hostId,
      name: hostName,
      serialNumber: hostSerialNumber,
      isHost: true,
      joinedAt: new Date(),
    }],
    status: 'waiting', // waiting | playing | finished | deleted
    createdAt: new Date(),
    gameState: null,
    betHistory: [],
  };
  const docRef = await addDoc(collection(db, ROOMS_COLLECTION), roomData);
  return docRef.id;
};

export const joinRoom = async (roomId, playerId, playerName) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);

  if (!roomDoc.exists()) throw new Error('Room not found');

  const roomData = roomDoc.data();

  const existingPlayer = roomData.players.find((p) => p.id === playerId);
  if (existingPlayer) return { ...roomData, playerSerialNumber: existingPlayer.serialNumber };

  const serialNumber = generateSerialNumber();
  const updatedPlayers = [...roomData.players, {
    id: playerId,
    name: playerName,
    serialNumber,
    isHost: false,
    joinedAt: new Date(),
  }];

  await updateDoc(roomRef, { players: updatedPlayers });
  return { ...roomData, players: updatedPlayers, playerSerialNumber: serialNumber };
};

export const getRoom = async (roomId) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);
  if (!roomDoc.exists()) return null;
  return { id: roomDoc.id, ...roomDoc.data() };
};

export const listenToRoom = (roomId, callback) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  return onSnapshot(roomRef, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
};

export const updateRoomStatus = async (roomId, status) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  await updateDoc(roomRef, { status });
};

export const deleteRoom = async (roomId) => {
  await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
};

export default db;
