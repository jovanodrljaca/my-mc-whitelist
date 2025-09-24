// In /api/callback.js

export default async function handler(request, response) {
    const { code, state } = request.query;
    const verificationToken = state;

    if (!code) {
        return response.status(400).send('Discord code is missing.');
    }

    // This is the known correct Redirect URI
    const redirectUri = 'https://my-mc-whitelist.vercel.app/api/callback';

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri, // Using the hardcoded URI
            }),
        });

        const tokenData = await tokenResponse.json();

        // If the response from Discord is not OK, log the detailed error and fail.
        if (!tokenResponse.ok) {
            console.error("Discord Token API Error:", tokenData); // <-- NEW, detailed logging
            throw new Error(tokenData.error_description || 'Unknown error fetching token from Discord.');
        }

        // Use the access token to get the user's Discord ID
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
        });

        const userData = await userResponse.json();
        if (!userResponse.ok) {
            console.error("Discord User API Error:", userData);
            throw new Error('Error fetching user data from Discord.');
        }
        const discordId = userData.id;

        // Send all data to your Python bot for final validation
        const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
        
        const botResponse = await fetch(process.env.BOT_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.BOT_WEB_SECRET}`,
            },
            body: JSON.stringify({
                token: verificationToken,
                ip: ip,
                discord_id: discordId,
            }),
        });
        
        if (!botResponse.ok) {
             const result = await botResponse.json();
             throw new Error(result.error || 'Bot returned an error.');
        }

        // If everything is successful, redirect to the success page
        response.redirect(302, '/success.html');

    } catch (error) {
        console.error('OAuth2 Callback Error:', error);
        // Display the specific error message on the page for debugging
        response.status(500).send(`An error occurred: ${error.message}`);
    }
}
