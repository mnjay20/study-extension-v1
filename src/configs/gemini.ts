import { ChatGoogle} from '@langchain/google'
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import { env } from '../utils/env.js'


export const model = new ChatGoogle({
    apiKey : env.GOOGLE_API_KEY,
    model : env.MODEL,
    temperature : 0.2,
    maxRetries : 2
})

export const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey : env.GOOGLE_API_KEY,
    model : env.EMBEDDING_MODEL
})


