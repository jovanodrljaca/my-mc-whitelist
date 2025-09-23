// This is a Vercel Serverless Function
export default async function handler(request, response) {
    // We only accept POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get the secrets from environment variables
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const ipqsKey = process.env.IPQS_KEY; // <-- NEW: Get the IPQS API key

    // Get the Minecraft username from the request body
    const { username } = request.body;

    if (!username) {
        return response.status(400).json({ error: 'Minecraft username is required.' });
    }

    // Get the user's IP address from the request headers
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    // --- NEW: VPN and Proxy Check using IPQualityScore ---
    try {
        // Note the new API URL structure
        const ipqsResponse = await fetch(`https://ipqualityscore.com/api/json/ip/${ipqsKey}/${ip}`);
        const ipData = await ipqsResponse.json();
        
        // IPQS uses simple boolean flags for "proxy" and "vpn"
        if (ipData.success === true && (ipData.proxy || ipData.vpn)) {
            // If either flag is true, reject the request.
            return response.status(403).json({ error: 'VPN-ovi i proxy nije dozvoljen. Ugasi VPN i pokušaj opet.' });
        }
        if (ipData.success === false) {
             // If the API call itself fails, log it and stop
             console.error("IPQS API Error:", ipData.message);
             return response.status(500).json({ error: 'Failed to verify IP address.' });
        }

    } catch (error) {
        console.error("IPQS Fetch Error:", error);
        // If the fetch call itself fails, we stop the process to be safe.
        return response.status(500).json({ error: 'Failed to verify IP address.' });
    }
    // --- End of new VPN check ---


    // If the IP is clean, we proceed to log it to Discord.
    const discordMessage = {
        content: `**New Whitelist Request**\n👤 **Username:** \`${username}\`\n🌐 **IP Address:** \`${ip}\``
    };

    try {
        await fetch(discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(discordMessage)
        });

        // Send a success message back to the user's browser
        response.status(200).json({ message: 'Success! IP logged.' });

    } catch (error) {
        console.error("Failed to send message to Discord:", error);
        response.status(500).json({ error: 'Failed to log IP address.' });
    }
}
