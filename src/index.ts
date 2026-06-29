import express from 'express'
import cors from 'cors'
import { createServer } from 'http'

import { initSocketServer } from './webSockets/server.js'
import { env } from './utils/env.js'

const app = express()

app.use(cors({
    origin : '*'
}))

const httpServer = createServer(app)


initSocketServer(httpServer)

httpServer.listen(env.PORT,()=>{
    console.log('server is listening on ', env.PORT)
})

