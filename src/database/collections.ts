import type { Collection } from "mongodb";
import { getDb } from "./mongo.js";


let TranscriptChunkCollecion : Promise<Collection> | null = null
export async function getTranscriptChunkCollecion(): Promise<Collection>{
    if(!TranscriptChunkCollecion){
        TranscriptChunkCollecion = (async ()=>{
            const db = await getDb()
            return db.collection("Transcript-Cache")
        })()
        return TranscriptChunkCollecion

    }
    return TranscriptChunkCollecion
}

