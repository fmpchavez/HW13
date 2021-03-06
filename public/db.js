import { openDB } from 'https://unpkg.com/idb?module';

let db;

( async ()=> {
  db = await openDB("budget", 1, {
    upgrade(db) {
      const objectStore = db.createObjectStore("pending", {
        keyPath: "offlineId",

        autoIncrement: true 
        });

      console.log( `~ created the db/upgraded it:`, objectStore.name );
    } });
})();


async function saveOfflineRecord( newTransaction ) {
  const trans = db.transaction("pending", "readwrite");
  const pendingTable = trans.objectStore("pending");
  pendingTable.add( newTransaction );

  await trans.done;

  console.log(`Saving new record offline: ` + JSON.stringify(newTransaction));
}

async function syncOfflineToServer() {


  const pendingList = await db.getAll("pending");
  console.log( `pendingList: `, pendingList );

  if( pendingList.length ){

    const response = await fetch("/api/transaction/bulk", {
      method: "POST",
      body: JSON.stringify(pendingList),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json"
      }
    });

    const responseData = await response.json();

    console.log( `items accepted and sync'd by server:`, responseData.offlineIds );
    // now in theory the server will verify it saved each of these posts,
    
    // if successful delete from indexDb
    for( let id of responseData.offlineIds ){
      // delete entry
      console.log( `.. deleting pending transaction (sync ok): id=${id}`, id );
      await db.delete("pending", id );
    }
  }
}

function browserOnline() {
  console.log("Browser is online. Writing to database...");
  syncOfflineToServer();
}

function browserOffline() {
  console.log("Browser is offline. Saving locally...");
}

// listen for app coming back online
window.addEventListener("online", browserOnline);
window.addEventListener("offline", browserOffline);

export default saveOfflineRecord;