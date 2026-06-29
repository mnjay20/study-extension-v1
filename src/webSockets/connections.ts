import { nanoid } from "nanoid";
import { getSessionCollection } from "../database/collections.js";
import { Events } from "../utils/events.js";
import { getIO } from "./server.js";
import { SessionSchema } from "../schmas/session_schema.js";
import { SessionCreateHandler , SessionJoinHandler} from "./handlers/sessions.js";

const io = getIO()



io.on('connection',(socket)=>{
    console.log(`connected with ${socket.id}`)
    

    SessionCreateHandler(socket)
    SessionJoinHandler(socket)
})