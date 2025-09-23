// api/whitelist.js on Vercel
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get the verification token from the request body
    const { token } = request.body;
    if (!token) {
        return response.status(400).json({ error: 'Verification token is missing.' });
    }

    // Get the user's IP address
    const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

    // The URL where your Discord bot is listening for verification data
    const botWebhookUrl = process.env.BOT_WEBHOOK_URL; 
    // This is the secret string to verify the request comes from your app
    const botWebhookSecret = process.env.BOT_WEB_SECRET; 

    if (!botWebhookUrl || !botWebhookSecret) {
        console.error("Bot webhook URL or secret is not configured in Vercel.");
        return response.status(500).json({ error: 'Server configuration error.' });
    }

    try {
        // Send the data to your Discord bot's web server
        const botResponse = await fetch(botWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${botWebhookSecret}` // Secure the endpoint
            },
            body: JSON.stringify({ token: token, ip: ip })
        });

        const result = await botResponse.json();

        if (!botResponse.ok) {
            // Forward the error message from the bot
            throw new Error(result.error || 'Failed to communicate with the verification bot.');
        }
        
        // Forward the success message from the bot
        response.status(200).json({ message: result.message });

    } catch (error) {
        console.error("Error sending data to bot:", error);
        response.status(500).json({ error: error.message });
    }
}
