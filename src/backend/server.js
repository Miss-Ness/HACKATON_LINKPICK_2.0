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

app.post("/jobs/match", async (req, res) => {
  const { userProfile, topN = 3 } = req.body;
  
  if (!GROQ_API_KEY) {
    return res.json({ error: "Configuration API manquante" });
  }
  
  // Si le profil est vide, demander plus d'infos
  if (!userProfile.skills || userProfile.skills.length === 0) {
    return res.json({ 
      error: "profile_incomplete",
      message: "Dis-moi d'abord quelles sont tes compétences ! Par exemple : 'Je connais React, Node.js et PostgreSQL'"
    });
  }
  
  try {
    const prompt = `
Tu es un expert en matching emploi/candidat avec 10 ans d'expérience.

**PROFIL DU CANDIDAT:**
Compétences: ${userProfile.skills.join(', ')}
Localisation préférée: ${userProfile.location || 'non spécifié'}
Niveau d'études: ${userProfile.education || 'non spécifié'}
Préférences entreprise: ${userProfile.preferences || 'non spécifié'}
Expérience: ${userProfile.experience || 'débutant'}

**OFFRES DISPONIBLES:**
${JSON.stringify(jobsData, null, 2)}

**TA MISSION:**
Analyse chaque offre et calcule un score de matching de 0 à 100 basé sur :
1. Correspondance des compétences techniques (50% du score)
2. Localisation (15% du score)
3. Type d'entreprise selon préférences (15% du score)
4. Niveau requis vs profil (10% du score)
5. Soft skills et culture fit (10% du score)

Pour chaque offre matchée, identifie :
- Les raisons du bon match (compétences communes, localisation, etc.)
- Les points d'attention (compétences manquantes, niveau requis supérieur, etc.)

Retourne UNIQUEMENT un JSON (sans markdown, sans backticks) avec les ${topN} meilleures offres triées par score décroissant.

Format attendu:
{
  "matches": [
    {
      "job_id": "job_001",
      "score": 85,
      "reasons": [
        "5 compétences techniques correspondent (React, Node.js, PostgreSQL, Git, REST API)",
        "Localisation correspond à tes préférences",
        "Startup dynamique comme tu le souhaites"
      ],
      "concerns": [
        "Compétence Docker recommandée mais non critique",
        "Niveau Bac+3/4 requis"
      ]
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
          max_tokens: 2000,
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
    res.json({ error: "Erreur lors du matching", details: err.message });
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
        // Matching intelligent
        const { userProfile: profile, topN = 5 } = req.body;
        
        if (!profile || !profile.skills || profile.skills.length === 0) {
          return res.json({ 
            answer: "Je n'ai pas encore assez d'infos sur ton profil 🤔\n\nDis-moi quelles sont tes compétences !" 
          });
        }
        
        // Appeler la logique de matching (réutiliser le code de /jobs/match)
        try {
          const matchPrompt = `
      Tu es un expert en matching emploi/candidat avec 10 ans d'expérience.
      
      **PROFIL DU CANDIDAT:**
      Compétences: ${profile.skills.join(', ')}
      Localisation: ${profile.location || 'non spécifié'}
      Préférences: ${profile.preferences || 'non spécifié'}
      Expérience: ${profile.experience || 'débutant'}
      
      **OFFRES DISPONIBLES:**
      ${JSON.stringify(jobsData, null, 2)}
      
      Analyse et retourne les ${topN} meilleures offres avec scores de 0 à 100.
      
      Format JSON attendu (sans markdown):
      {
        "matches": [
          {
            "job_id": "job_xxx",
            "score": 85,
            "reasons": ["compétences X matchent", "localisation correspond"],
            "concerns": ["compétence Y manquante"]
          }
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
              max_tokens: 2000,
              temperature: 0.3,
            }),
          });
      
          const matchData = await matchResponse.json();
          const matchResult = matchData.choices?.[0]?.message?.content.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(matchResult);
          
          const enrichedMatches = parsed.matches.map(m => ({
            ...m,
            job: jobsData.find(j => j.id === m.job_id)
          }));
          
          return res.json({ matches: enrichedMatches });
          
        } catch (err) {
          console.error("Erreur matching:", err);
          return res.json({ answer: "Erreur lors du matching." });
        }
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
