export default async (req, context) => {
    // Only allow POST requests
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        // Read Telegram credentials securely using Netlify's global object
        const botToken = Netlify.env.get('API_TELEG_BOT');
        const chatId = Netlify.env.get('CHAT_ID_TELEG');

        if (!botToken || !chatId) {
            console.error("Missing Telegram Bot configuration (API_TELEG_BOT or CHAT_ID_TELEG)");
            return new Response(JSON.stringify({ error: "Server Configuration Error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Parse incoming JSON
        const data = await req.json();
        const { name, email, subject, message } = data;

        // Basic validation
        if (!name || !email || !subject || !message) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Format the message for Telegram (MarkdownV2 or HTML, using standard text here for safety)
        const text = `🚀 **New SaferSky Contact Request**\n\n` +
            `👤 **Name:** ${name}\n` +
            `📧 **Email:** ${email}\n` +
            `📋 **Subject:** ${subject}\n` +
            `💬 **Message:**\n${message}`;

        // Prepare the Telegram API request
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const telegramResponse = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            }),
        });

        if (!telegramResponse.ok) {
            const errorText = await telegramResponse.text();
            console.error("Telegram API Error:", errorText);
            throw new Error('Failed to send message to Telegram');
        }

        return new Response(JSON.stringify({ success: true, message: "Message sent successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Contact form error:", error);
        return new Response(JSON.stringify({ error: "Failed to process request" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config = {
    path: "/api/contact"
};
