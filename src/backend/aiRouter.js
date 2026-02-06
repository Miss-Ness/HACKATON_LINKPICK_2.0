// aiRouter.js
export async function detectIntent(conversation, message, apiKey) {
    // Récupérer le dernier message bot avec des offres
    const lastBotMessage = conversation
      .slice()
      .reverse()
      .find(msg => msg.role === 'bot' && msg.content.includes('offres'));
    
    const prompt = `
  Analyse ce message utilisateur dans le contexte d'un chatbot de recherche d'emploi.
  
  Historique récent:
  ${conversation.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}
  
  Message actuel: "${message}"
  
  **RÈGLES DE DÉTECTION:**
  
  1. Si l'utilisateur demande "plus de détails", "détails sur", "parle-moi de", "la première", "le 2", "l'offre 3" :
     → intent = "job_details"
     → Extrais le numéro (1, 2, 3...) et mets-le dans position_in_list
     
  2. Si l'utilisateur dit "toutes les offres", "montre-moi tout" :
     → intent = "show_all_jobs"
  
  3. Si l'utilisateur cherche avec des filtres (compétences, ville, type) :
     → intent = "search_jobs"
     → Extrais : skills (tableau), location (string), type (Alternance/Stage)
  
  4. Si l'utilisateur demande des recommandations basées sur son profil :
     → intent = "job_recommendation"
  
  5. Sinon → intent = "general_chat"
  
  **EXEMPLES:**
  - "Plus de détails sur la première" → position_in_list: 1
  - "Parle-moi de l'offre 2" → position_in_list: 2
  - "La 3ème offre m'intéresse" → position_in_list: 3
  
  Retourne UNIQUEMENT ce JSON (sans markdown ni texte):
  {
    "intent": "search_jobs | show_all_jobs | job_recommendation | job_details | general_chat",
    "filters": {
      "skills": [],
      "location": "",
      "type": "",
      "job_id": "",
      "position_in_list": 0
    }
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
        temperature: 0.1, // 👈 Baisse la température pour plus de précision
      }),
    });
  
    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "{}";
    
    const cleaned = aiResponse.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }