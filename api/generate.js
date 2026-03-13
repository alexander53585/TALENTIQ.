export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.VITE_ANTHROPIC_API_KEY || "",
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20240620",
                max_tokens: 4096,
                messages: req.body.messages
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Anthropic API error: ${response.status} ${errorData}`);
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error("Error in serverless function:", error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
