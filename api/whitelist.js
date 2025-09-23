// This is a Vercel Serverless Function
export default async function handler(request, response) {
    // We only accept POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get the secrets from environment variables
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const ipinfoToken = process.env.IPINFO_TOKEN;

    // Get the Minecraft username from the request body
    const { username } = request.body;

    if (!username) {
        return response.status(400).json({ error: 'Minecraft username is required.' });
    }

    // Get the user's IP address from the request headers
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    // --- VPN and Proxy Check using IPinfo ---
    try {
        const ipInfoResponse = await fetch(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
        const ipData = await ipInfoResponse.json();

        // -- ADD THIS LINE FOR DEBUGGING ---
        console.log('IPinfo Response:', ipData);
        // ------------------------------------

        // The 'privacy' object contains details about VPNs, proxies, etc.
        if (ipData.privacy && (ipData.privacy.vpn || ipData.privacy.proxy || ipData.privacy.hosting)) {
            // If any of these are true, it's not a residential IP. Reject it.
            return response.status(403).json({ error: 'VPNs and proxies are not allowed. Please disable yours and try again.' });
        }
    } catch (error) {
        console.error("IPinfo API Error:", error);
        // If the IPinfo check fails, we stop the process to be safe.
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
