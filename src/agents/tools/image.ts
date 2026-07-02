import { tool } from "langchain";
import z from "zod";
import { Events } from "../../utils/events.js";
import { getIO } from "../../webSockets/server.js";


const inputSchema = z.object({
    timestamp : z.number().min(0).max(10000).describe("The timestamp in seconds for which the frame is to be retrieved."),
    sessionId : z.string().describe("The session ID associated with the video stream."),
})

const outputSchema = z.object({
    success : z.boolean().describe("Indicates whether the frame retrieval was successful."),
    mimeType : z.string().describe("The MIME type of the retrieved frame image."),
    frameData : z.string().describe("The base64 encoded string of the retrieved frame image."),
})
type outputSchemaType = z.infer<typeof outputSchema>

const events = Events.FRAME
export const getFrame = tool(({timestamp, sessionId})=>{
    // Implementation to retrieve the frame of a video at the specified timestamp using the events
    
    const io = getIO()
    const response = new Promise<outputSchemaType>((resolve, reject) => {
        io.to(sessionId).timeout(3000).emit(events.REQUEST_CONTEXT,{timestamp},(response : outputSchemaType)=>{
            if(response.success){
                resolve(response)
            }else{
                reject(new Error("Failed to retrieve frame"))
            }
        })
    })

    return response.then((response)=>{
        return {mimeType : response.mimeType, frameData : response.frameData}
    }).catch((error)=>{
        throw error
    })

},{ 
    name : "getFrame",
    description : "This tool is used to get the frame of a video at a specific timestamp. The input should be a timestamp in seconds, and the output will be the corresponding frame image.",
    schema : inputSchema,
})

