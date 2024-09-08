Q.Media.WebRTC.indexedDbAPI = function (dbName, options) {
    if(!options) {
        options = {};
    }
    const dbConfig = {
        name: dbName,
        version: options.version,
    };

    let _db;

    return {
    
        init() {
            return new Promise((resolve, reject) => {
                if(_db) {
                    resolve();
                    return;
                };
                const request = indexedDB.open(dbConfig.name, dbConfig.version);
    
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (options.stores) {
                        for (let s in options.stores) {
                            let store = options.stores[s]
                            // Check if the object store already exists
                            if (!db.objectStoreNames.contains(store.name)) {
                                // Create the object store
                                const objectStore = db.createObjectStore(store.name, {
                                    keyPath: "objectId",
                                    autoIncrement: true
                                });

                                createOrUpdateIndexes(objectStore, store.indexes);
                            } else {
                                // Object store already exists, get a reference to it
                                const objectStore = event.target.transaction.objectStore(store.name);

                                createOrUpdateIndexes(objectStore, store.indexes);
                            }

                        }

                        function createOrUpdateIndexes(store, indexes) {
                            if (!indexes) return;
                            for (let i in indexes) {
                                if (!store.indexNames.contains(indexes[i].name)) {
                                    store.createIndex(indexes[i].name, indexes[i].name, { unique: indexes[i].unique });
                                }
                            }
                            
                        }
                    }
                    

                };
    
                request.onerror = (event) => {
                    reject(event.target.error);
                };
    
                request.onsuccess = (event) => {
                    _db = event.target.result;
                    resolve();
                };
            });
        },
    
        async get(key, objectStoreName) {
            return new Promise((resolve, reject) => {
                const tx = _db.transaction(objectStoreName, 'readonly');
                const store = tx.objectStore(objectStoreName);
                const request = store.get(key);
    
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
    
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        },
    
        async getAll(objectStoreName) {
            return new Promise((resolve, reject) => {
                const tx = _db.transaction(objectStoreName, 'readonly');
                const store = tx.objectStore(objectStoreName);
                const request = store.openCursor();
                const results = [];
    
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        results.push({key: cursor.key, value: cursor.value});
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
    
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        },
    
        async getByIndex(indexName, indeValue, objectStoreName) {
            return new Promise((resolve, reject) => {
                const transaction = _db.transaction(objectStoreName, 'readonly');
                const objectStore = transaction.objectStore(objectStoreName);
                
                const index = objectStore.index(indexName);

                const records = [];
                const request = index.openCursor(IDBKeyRange.only(indeValue));

                request.onsuccess = function (event) {
                    const cursor = event.target.result;
                    if (cursor) {
                        records.push(cursor.value);
                        cursor.continue();
                    }
                };

                transaction.oncomplete = function () {
                    resolve(records);
                };
            });
        },
    
        async save(record, objectStoreName) {
            return new Promise((resolve, reject) => {
                const tx = _db.transaction(objectStoreName, 'readwrite');
                const store = tx.objectStore(objectStoreName);
                const request = store.put(record);
    
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
    
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        },
    
        async saveWithKey(key, record, objectStoreName) {
            return new Promise((resolve, reject) => {
              const tx = _db.transaction(objectStoreName, 'readwrite');
              const store = tx.objectStore(objectStoreName);
              const request = store.put(record, key);
          
              request.onsuccess = (event) => {
                resolve(event.target.result);
              };
          
              request.onerror = (event) => {
                reject(event.target.error);
              };
            });
          },
    
        async delete(key, objectStoreName) {
            return new Promise((resolve, reject) => {
                const tx = _db.transaction(objectStoreName, 'readwrite');
                const store = tx.objectStore(objectStoreName);
                const request = store.delete(key);
    
                request.onsuccess = (event) => {
                    resolve();
                };
    
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        },

        async clear(objectStoreName) {
            return new Promise((resolve, reject) => {
                const tx = _db.transaction(objectStoreName, 'readwrite');
                const store = tx.objectStore(objectStoreName);
                tx.onerror = (event) => {
                    reject(event.target.error);
                };
                const objectStoreRequest = store.clear();
                objectStoreRequest.onsuccess = (event) => {
                    resolve();
                };
            });
        }
    };

}