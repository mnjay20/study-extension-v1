import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { getUserCollection, getSessionCollection } from "./database/collections.js";

async function verify() {
    console.log("Connecting to verify DB...");
    try {
        const userCol = await getUserCollection();
        const sessionCol = await getSessionCollection();

        console.log("Querying Users collection...");
        const users = await userCol.find({}).sort({ createdAt: -1 }).limit(3).toArray();
        console.log("Latest Users documents:");
        console.log(JSON.stringify(users, null, 2));

        console.log("Querying Sessions collection...");
        const sessions = await sessionCol.find({}).sort({ createdAt: -1 }).limit(1).toArray();
        console.log("Latest Session document:");
        console.log(JSON.stringify(sessions, null, 2));

    } catch (err) {
        console.error("Verification error:", err);
    } finally {
        process.exit(0);
    }
}

verify();
