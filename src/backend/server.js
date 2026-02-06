import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post("/chat", async (req, res) => {
  const { prompt } = req.body;
  
  if (!GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY non définie");
    return res.json({ answer: "Configuration API manquante" });
  }
  
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        }),
      }
    );

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Réponse:", data);

    if (!response.ok) {
      console.error("❌ Erreur:", data);
      return res.json({ answer: "Erreur du modèle." });
    }

    const answer = data.choices?.[0]?.message?.content ?? "Pas de réponse";
    console.log("✅ Réponse générée:", answer);
    res.json({ answer });
    
  } catch (err) {
    console.error("❌ Erreur backend:", err.message);
    res.json({ answer: "Le bot est indisponible." });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
  console.log("GROQ_API_KEY présente:", !!GROQ_API_KEY);
});