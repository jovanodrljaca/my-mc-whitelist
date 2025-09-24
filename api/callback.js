// In /api/callback.js

export default async function handler(request, response) {
    // 1. Get the temporary code and original token from the URL
    const { code, state } = request.query;
    const verificationToken = state;

    if (!code) {
        return response.status(400).send('Discord code is missing.');
    }

    try {
        // 2. Exchange the code for an access token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${process.env.VERCEL_URL}/api/callback`,
            }),
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`Error fetching token: ${tokenData.error_description || 'Unknown error'}`);
        }

        // 3. Use the access token to get the user's Discord ID
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
        });

        const userData = await userResponse.json();
        if (!userResponse.ok) {
            throw new Error('Error fetching user data from Discord.');
        }
        const discordId = userData.id;

        // 4. Send all data to your Python bot for final validation
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
                discord_id: discordId, // Send the verified Discord ID
            }),
        });
        
        if (!botResponse.ok) {
             const result = await botResponse.json();
             throw new Error(result.error || 'Bot returned an error.');
        }

        // 5. If everything is successful, redirect to the success page
        response.redirect(302, '/success.html');

    } catch (error) {
        console.error('OAuth2 Callback Error:', error);
        // Redirect to an error page or show a generic error
        response.status(500).send(`An error occurred: ${error.message}`);
    }
}
