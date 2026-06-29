import 'dotenv/config'

import {z} from 'zod'
import { config } from 'dotenv';

const envSchema = z.object({
    GOOGLE_API_KEY : z.string().min(1,"API key is required!"),
    MODEL : z.string().default("gemini-3-flash-preview"),
    PORT : z.coerce.number().int().min(1).max(65535),
    MONGO_DB_URI : z.string().min(1,"Mongodb uri is required"),
    MONGO_DB_NAME: z.string().min(1,"Mongodb name is required"),
    EMBEDDING_MODEL : z.string().default("gemini-embedding-2")

})

const parsed = envSchema.safeParse(process.env)

if(!parsed.success){
    console.log('invalid environment variables')
    process.exit(1)
}

export const env = Object.freeze(parsed.data)
