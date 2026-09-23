// --- IndexedDB Constants for File Handle Storage ---
const DB_NAME = 'DienstplanAppDB';
const STORE_NAME = 'fileHandles';
const DB_VERSION = 1;

// Helper function to open IndexedDB
export const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to get a file handle from IndexedDB
export const getFileHandleFromDb = async (key = 'lastFile') => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB get error:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to save a file handle to IndexedDB
export const putFileHandleInDb = async (handle, key = 'lastFile') => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("IndexedDB save error:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to remove a file handle from IndexedDB
export const removeFileHandleFromDb = async (key = 'lastFile') => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("IndexedDB delete error:", event.target.error);
      reject(event.target.error);
    };
  });
};

export const deleteFileHandleFromDb = removeFileHandleFromDb;
