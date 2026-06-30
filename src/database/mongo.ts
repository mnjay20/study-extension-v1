import {MongoClient,Db} from "mongodb"
import { env } from "../utils/env.js"

let client : MongoClient | null = null
let db : Db | null = null


export async function getClient():Promise<MongoClient>{
    if(!client){
        client = new MongoClient(env.MONGO_DB_URI, {
            serverSelectionTimeoutMS: 2000,
            connectTimeoutMS: 2000,
        })
        await client.connect()
        console.log("connected to db")
        return client
    }

    return client
}

export async function getDb():Promise<Db>{
    if(!db){
        const extractClient = await getClient()
        db = extractClient.db(env.MONGO_DB_NAME)
        console.log(`using Db ->${env.MONGO_DB_NAME}`)
        return db

    }
    return db
}
