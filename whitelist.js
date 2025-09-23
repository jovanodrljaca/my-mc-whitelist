// This is a Vercel Serverless Function
export default async function handler(request, response) {
    // We only accept POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get the Minecraft username from the request body
    const { username } = request.body;

    if (!username) {
        return response.status(400).json({ error: 'Minecraft username is required.' });
    }

    // Get the user's IP address from the request headers
    // 'x-forwarded-for' is the standard header Vercel uses
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    // This is the secret Discord Webhook URL you copied
    // We'll add this to Vercel's settings, not write it here directly!
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!discordWebhookUrl) {
        // This error will show up in the Vercel logs if you forget the URL
        console.error("Discord Webhook URL is not set.");
        return response.status(500).json({ error: 'Server configuration error.' });
    }

    // Create the message we want to send to Discord
    const discordMessage = {
        content: `**New Whitelist Request**\n👤 **Username:** \`${username}\`\n🌐 **IP Address:** \`${ip}\``
    };

    try {
        // Send the data to your Discord channel!
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