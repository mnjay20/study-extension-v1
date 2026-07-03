import type { Collection } from "mongodb";
import { getDb } from "./mongo.js";


let NotesCollection : Promise<Collection> | null = null
let SessionCollection : Promise<Collection> | null = null

export async function getNotesCollection(): Promise<Collection>{
    if(!NotesCollection){
        NotesCollection = (async ()=>{
            const db = await getDb()
            const col = db.collection("Notes-Cache")
            await col.createIndex({ sessionId: 1 }, { unique: true })
            // await col.createIndex(
            //   { createdAt: 1 },
            //   { expireAfterSeconds: 60*60*24 }
            // )
            return col
        })()
        return NotesCollection!
    }
    return NotesCollection!
}
    
export async function getSessionCollection(): Promise<Collection>{
    if(!SessionCollection){
        SessionCollection = (async ()=>{
            const db = await getDb()
            const sessions = db.collection('Sessions')
            await Promise.all([
                sessions.createIndex({ sessionId: 1 }, { unique: true }),
                sessions.createIndex({ userId: 1 }),
                // sessions.createIndex(
                //   { createdAt: 1 },
                //   { expireAfterSeconds: 60*60*24 }
                // ),
            ]);
            return sessions
        })()
        return SessionCollection
    }
    return SessionCollection!
}