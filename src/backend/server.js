import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { detectIntent } from "./aiRouter.js";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Charger les offres d'emploi
const jobsData = JSON.parse(
  readFileSync(join(__dirname, 'data', 'jobs.json'), 'utf-8')
);

// Route pour récupérer toutes les offres
app.get("/jobs", (req, res) => {
  res.json({ jobs: jobsData });
});

// Route pour récupérer une offre spécifique
app.get("/jobs/:id", (req, res) => {
  const job = jobsData.find(j => j.id === req.params.id);
  if (job) {
    res.json({ job });
  } else {
    res.status(404).json({ error: "Offre non trouvée" });
  }
});

// Route pour rechercher des offres
app.post("/jobs/search", (req, res) => {
  const { skills, location, type } = req.body;
  
  let filtered = jobsData;
  
  // Filtrer par compétences
  if (skills && skills.length > 0) {
    filtered = filtered.filter(job => 
      skills.some(skill => 
        job.skills_required.some(s => 
          s.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );
  }
  
  // Filtrer par localisation
  if (location) {
    filtered = filtered.filter(job => 
      job.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  // Filtrer par type (Alternance/Stage)
  if (type) {
    filtered = filtered.filter(job => 
      job.type.toLowerCase() === type.toLowerCase()
    );
  }
  
  res.json({ jobs: filtered, count: filtered.length });
});

// Route pour le matching intelligent avec l'IA
app.post("/jobs/match", async (req, res) => {
  const { userProfile, topN = 3 } = req.body;
  
  if (!GROQ_API_KEY) {
    return res.json({ error: "Configuration API manquante" });
  }
  
  try {
    // Créer un prompt pour l'IA avec le profil utilisateur et les offres
    const prompt = `
Tu es un expert en matching emploi/candidat. 
Voici le profil de l'utilisateur :
${JSON.stringify(userProfile, null, 2)}

Voici les offres d'emploi disponibles :
${JSON.stringify(jobsData.slice(0, 10), null, 2)}

Analyse et retourne UNIQUEMENT un JSON (sans markdown) avec les ${topN} meilleures offres pour ce profil.
Format attendu :
{
  "matches": [
    {
      "job_id": "job_xxx",
      "score": 85,
      "reasons": ["Raison 1", "Raison 2"],
      "concerns": ["Point d'attention 1"]
    }
  ]
}
`;

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
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    // Parser la réponse JSON de l'IA
    const cleanResponse = aiResponse.replace(/```json|```/g, "").trim();
    const matchResults = JSON.parse(cleanResponse);
    
    // Enrichir avec les détails complets des offres
    const enrichedMatches = matchResults.matches.map(match => ({
      ...match,
      job: jobsData.find(j => j.id === match.job_id)
    }));
    
    res.json({ matches: enrichedMatches });
    
  } catch (err) {
    console.error("Erreur matching:", err);
    res.json({ error: "Erreur lors du matching" });
  }
});

app.post("/chat-smart", async (req, res) => {
  const { conversation = [], message, userProfile } = req.body;

  if (!GROQ_API_KEY) {
    return res.json({ error: "API KEY manquante" });
  }

  // 1️⃣ Détection de l'intention
  const intentData = await detectIntent(conversation, message, GROQ_API_KEY);
  console.log("🧠 INTENT:", intentData);

  let responseData = {};

  // 2️⃣ Exécuter l'action selon l'intention
  switch (intentData.intent) {
    case "show_all_jobs":
      responseData = { jobs: jobsData };
      break;

    case "search_jobs":
      const { skills, location, type } = intentData.filters;
      let filtered = jobsData;

      if (skills?.length)
        filtered = filtered.filter(job =>
          skills.some(skill =>
            job.skills_required.some(s => s.toLowerCase().includes(skill.toLowerCase()))
          )
        );

      if (location)
        filtered = filtered.filter(job =>
          job.location.toLowerCase().includes(location.toLowerCase())
        );

      if (type)
        filtered = filtered.filter(job =>
          job.type.toLowerCase() === type.toLowerCase()
        );

      responseData = { jobs: filtered };
      break;

    case "job_recommendation":
      // Appel à /jobs/match (on peut le faire en interne)
      const matchPrompt = `
Tu es un expert en matching emploi/candidat.
Profil utilisateur: ${JSON.stringify(userProfile, null, 2)}

Offres disponibles: ${JSON.stringify(jobsData.slice(0, 10), null, 2)}

Retourne UNIQUEMENT un JSON (sans markdown) avec les 3 meilleures offres pour ce profil.
Format: {
  "matches": [
    { "job_id": "job_xxx", "score": 85, "reasons": ["..."], "concerns": ["..."] }
  ]
}`;

      const matchResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: matchPrompt }],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      const matchData = await matchResponse.json();
      const matchResult = matchData.choices?.[0]?.message?.content.replace(/```json|```/g, "").trim();
      const matches = JSON.parse(matchResult);
      
      responseData = { 
        matches: matches.matches.map(m => ({
          ...m,
          job: jobsData.find(j => j.id === m.job_id)
        }))
      };
      break;

    case "job_details":
      let targetJob = null;
      
      if (intentData.filters.position_in_list > 0) {
        const index = intentData.filters.position_in_list - 1;
        targetJob = jobsData[index];
      } else if (intentData.filters.job_id) {
        targetJob = jobsData.find(j => j.id === intentData.filters.job_id);
      }
      
      if (targetJob) {
        responseData = { job: targetJob };
      } else {
        responseData = { answer: "Je n'ai pas trouvé cette offre." };
      }
      break;

    default:
      responseData = { answer: "Je peux te montrer des offres, recommander ou filtrer 😊" };
  }

  // 3️⃣ 🔥 NOUVELLE PARTIE : Génération d'une réponse naturelle avec l'IA
  const naturalResponse = await generateNaturalResponse(
    intentData.intent,
    responseData,
    message,
    conversation,
    userProfile,
    GROQ_API_KEY
  );

  res.json(naturalResponse);
});

// 🔥 Nouvelle fonction pour générer des réponses naturelles
async function generateNaturalResponse(intent, data, userMessage, conversation, userProfile, apiKey) {
  
  // Si c'est des jobs, on laisse le front gérer l'affichage
  if (data.jobs || data.matches || data.job) {
    return data;
  }

  // Pour les réponses textuelles, on enrichit avec l'IA
  const contextPrompt = `
Tu es LinkPick, un assistant de recherche d'emploi sympathique et efficace.

Contexte de la conversation:
${conversation.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Message utilisateur actuel: "${userMessage}"

Intention détectée: ${intent}

Profil utilisateur connu:
${JSON.stringify(userProfile, null, 2)}

**TON RÔLE:**
Réponds de manière naturelle, amicale et personnalisée. 
- Utilise des emojis avec modération 
- Sois concis mais utile
- Propose toujours une action concrète
- Adapte ton ton au contexte (encourageant, informatif, etc.)

Génère une réponse courte (2-3 phrases max).
`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: contextPrompt }],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  const aiData = await response.json();
  const answer = aiData.choices?.[0]?.message?.content || "Je suis là pour t'aider !";

  return { answer };
}

// Route chat existante
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
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Réponse:", data);

  const updatedProfile = await extractUserProfile(
    [...conversation, { role: 'user', content: message }],
    GROQ_API_KEY
  );

  naturalResponse.updatedProfile = updatedProfile;

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

// Ajoute cette fonction
async function extractUserProfile(conversation, apiKey) {
  const prompt = `
Analyse cette conversation et extrait le profil de l'utilisateur.

Conversation:
${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}

Retourne UNIQUEMENT ce JSON (sans markdown):
{
  "skills": ["compétence1", "compétence2"],
  "location": "ville si mentionnée",
  "education": "niveau si mentionné",
  "preferences": "préférences type d'entreprise/poste",
  "experience": "années si mentionné"
}
`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content.replace(/```json|```/g, "").trim();
  return JSON.parse(result);
}

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
  console.log("GROQ_API_KEY présente:", !!GROQ_API_KEY);
  console.log(`📊 ${jobsData.length} offres d'emploi chargées`);
});
