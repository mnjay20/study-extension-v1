import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import dns from 'dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

import { initSocketServer } from './webSockets/server.js'
import { env } from './utils/env.js'

import { registerSocketHandlers } from './webSockets/connections.js';

const app = express()

app.use(cors({
    origin : '*'
}))

const httpServer = createServer(app)


initSocketServer(httpServer)
registerSocketHandlers()

httpServer.listen(env.PORT,()=>{
    console.log('server is listening on ', env.PORT)
})

