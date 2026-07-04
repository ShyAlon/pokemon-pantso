'use strict';

// ============================================================
//  js/db.js — IndexedDB persistence layer
// ============================================================

const DB_NAME = 'pokemon-bantso-db';
const DB_VERSION = 2;

function openDB() {
  console.log('[Bantso:db] Opening IndexedDB…');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      console.log('[Bantso:db] onupgradeneeded — creating stores');
      if (!db.objectStoreNames.contains('playerState')) {
        db.createObjectStore('playerState', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('collection')) {
        db.createObjectStore('collection', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('leagueState')) {
        db.createObjectStore('leagueState', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => {
      console.log('[Bantso:db] IndexedDB opened successfully');
      resolve(e.target.result);
    };
    req.onerror = (e) => {
      console.error('[Bantso:db] Failed to open IndexedDB:', e.target.error);
      reject(e.target.error);
    };
  });
}

function dbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('[Bantso:db] dbGet failed for', store, key, req.error);
      reject(req.error);
    };
  });
}

function dbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('[Bantso:db] dbGetAll failed for', store, req.error);
      reject(req.error);
    };
  });
}

function dbPut(db, store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('[Bantso:db] dbPut failed for', store, value, req.error);
      reject(req.error);
    };
  });
}

function dbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('[Bantso:db] dbDelete failed for', store, key, req.error);
      reject(req.error);
    };
  });
}

function dbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => {
      console.log('[Bantso:db] Cleared store:', store);
      resolve(req.result);
    };
    req.onerror = () => {
      console.error('[Bantso:db] dbClear failed for', store, req.error);
      reject(req.error);
    };
  });
}
