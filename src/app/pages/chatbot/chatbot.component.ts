import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService, Job, UserProfile } from '../../services/api_service';

type Role = 'bot' | 'user';

interface ChatMessage {
    id: string;
    role: Role;
    text: string;
    ts: number;
    jobMatches?: any[];  // Pour afficher des offres dans le chat
}

interface ChatConversation {
    id: string;
    title: string;
    createdAt: number;
    messages: ChatMessage[];
    userProfile?: UserProfile;  // Profil extrait de la conversation
}

@Component({
    standalone: true,
    selector: 'app-chatbot',
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        MatDividerModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatProgressSpinnerModule,
    ],
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.scss'],
})
export class ChatbotComponent {
    @ViewChild('scrollEl') scrollEl?: ElementRef<HTMLDivElement>;
    @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

    input = '';
    isTyping = false;
    showSidebar = false;
    isLoadingJobs = false;

    conversations: ChatConversation[] = [];
    currentConversationId: string | null = null;

    quickReplies = [
        'Je cherche une alternance dev',
        'Trouve-moi des offres React à Paris',
        'Je veux améliorer mon CV',
        'Montre-moi toutes les offres disponibles',
    ];

    messages: ChatMessage[] = [];
    allJobs: Job[] = [];
    userProfile: UserProfile = { 
        skills: [],
        location: '',
        education: '',
        preferences: '',
        experience: ''
    };

    constructor(
        private snack: MatSnackBar,
        private api: ApiService
    ) {}

    ngOnInit() {
        this.loadConversations();
        this.loadAllJobs();
        
        if (this.conversations.length > 0) {
            this.loadConversation(this.conversations[0].id);
        } else {
            this.createNewConversation();
        }
    }

    // Charger toutes les offres au démarrage
    loadAllJobs() {
        this.api.getAllJobs().subscribe({
            next: (response) => {
                this.allJobs = response.jobs;
                console.log(`✅ ${this.allJobs.length} offres chargées`);
            },
            error: (err) => {
                console.error('Erreur chargement offres:', err);
            }
        });
    }

    createNewConversation() {
        const newConv: ChatConversation = {
            id: crypto.randomUUID(),
            title: 'Nouvelle conversation',
            createdAt: Date.now(),
            messages: [
                {
                    id: crypto.randomUUID(),
                    role: 'bot',
                    text: "Salut ! Je suis ton assistant LinkPick 🚀\n\nJe peux t'aider à :\n• Trouver des offres d'alternance/stage\n• Analyser ton CV\n• Matcher ton profil avec les meilleures opportunités\n\nPar quoi veux-tu commencer ?",
                    ts: Date.now(),
                },
            ],
            userProfile: { skills: [] }
        };

        this.conversations.unshift(newConv);
        this.currentConversationId = newConv.id;
        this.messages = newConv.messages;
        this.userProfile = newConv.userProfile || { skills: [] };
        this.saveConversations();
        this.scrollToBottom();
    }

    loadConversation(conversationId: string) {
        const conv = this.conversations.find(c => c.id === conversationId);
        if (conv) {
            this.currentConversationId = conversationId;
            this.messages = conv.messages;
            this.userProfile = conv.userProfile || { skills: [] };
            this.scrollToBottom();
        }
    }

    deleteConversation(conversationId: string, event?: Event) {
        event?.stopPropagation();
        
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        
        if (this.currentConversationId === conversationId) {
            if (this.conversations.length > 0) {
                this.loadConversation(this.conversations[0].id);
            } else {
                this.createNewConversation();
            }
        }
        
        this.saveConversations();
    }

    private saveConversations() {
        localStorage.setItem('chat_conversations', JSON.stringify(this.conversations));
    }

    private loadConversations() {
        const saved = localStorage.getItem('chat_conversations');
        if (saved) {
            this.conversations = JSON.parse(saved);
        }
    }

    private saveCurrentConversation() {
        const conv = this.conversations.find(c => c.id === this.currentConversationId);
        if (conv) {
            conv.messages = this.messages;
            conv.userProfile = this.userProfile;
            
            if (conv.title === 'Nouvelle conversation' && this.messages.length >= 2) {
                const firstUserMsg = this.messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    conv.title = firstUserMsg.text.slice(0, 40) + (firstUserMsg.text.length > 40 ? '...' : '');
                }
            }
            
            this.saveConversations();
        }
    }

    send(text?: string) {
        const content = (text ?? this.input).trim();
        if (!content) return;

        this.messages.push({ id: crypto.randomUUID(), role: 'user', text: content, ts: Date.now() });
        this.input = '';
        this.isTyping = true;
        this.saveCurrentConversation();
        this.scrollToBottom();

        // Détecter les intentions pour répondre intelligemment
        this.handleUserIntent(content);
    }

    // 🔥 Fake matching manuel
manualJobMatching() {
    if (!this.userProfile.skills?.length) {
        this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: "Je n'ai pas assez d'informations sur tes compétences pour faire un matching 😅",
            ts: Date.now()
        });
        return;
    }

    const matches = this.allJobs
        .map(job => {
            // Compter le nombre de compétences matchées
            const skillMatchCount = job.skills_required
                .filter((skill: string) => 
                    this.userProfile.skills.includes(skill.toLowerCase())
                ).length;

            // Bonus si localisation correspond
            const locationBonus = this.userProfile.location && job.location.toLowerCase().includes(this.userProfile.location.toLowerCase()) ? 1 : 0;

            // Bonus si préférence d'entreprise correspond
            const prefBonus = this.userProfile.preferences && job.type.toLowerCase().includes(this.userProfile.preferences.toLowerCase()) ? 1 : 0;

            const score = skillMatchCount + locationBonus + prefBonus;
            return { job, score };
        })
        .filter(item => item.score > 0) // On garde que les offres pertinentes
        .sort((a, b) => b.score - a.score) // Tri par score décroissant
        .slice(0, 5); // Top 5 résultats

    if (matches.length === 0) {
        this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: "Aucune offre ne correspond exactement à ton profil 😔\nEssaie d'ajouter plus de compétences ou d'élargir tes critères.",
            ts: Date.now()
        });
        return;
    }

    // Formater le résultat
    const resultsText = matches.map((m, i) => 
        `${i + 1}. **${m.job.title}** chez ${m.job.company}\n` +
        `   📍 ${m.job.location} | ${m.job.type}\n` +
        `   🔑 Score de matching: ${m.score}`
    ).join('\n\n');

    this.messages.push({
        id: crypto.randomUUID(),
        role: 'bot',
        text: `🎯 Voici les offres les plus adaptées à ton profil :\n\n${resultsText}`,
        ts: Date.now(),
        jobMatches: matches.map(m => m.job)
    });

    this.saveCurrentConversation();
    this.scrollToBottom();
}

    private handleSmartResponse(data: any) {

        // 1️⃣ Si backend renvoie des jobs
        if (data.jobs) {
          const results = data.jobs.slice(0, 10).map((job: Job, i: number) =>
            `${i + 1}. **${job.title}**\n${job.company} | ${job.location}\n${job.type} | ${job.salary}`
          ).join('\n\n');
      
          this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: `🎯 Résultats trouvés :\n\n${results}\n\nTu veux un matching personnalisé ?`,
            ts: Date.now(),
            jobMatches: data.jobs
          });
        }
      
        // 2️⃣ Si backend renvoie un message normal
        else if (data.answer) {
          this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: data.answer,
            ts: Date.now()
          });
        }
      
        // 3️⃣ Si backend renvoie un job spécifique
        else if (data.job) {
          this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: `📌 ${data.job.title}\n${data.job.description}`,
            ts: Date.now()
          });
        }
      
        this.isTyping = false;
        this.saveCurrentConversation();
        this.scrollToBottom();
      }
      

      private handleUserIntent(userMessage: string) {
        // Au lieu de détecter les intentions côté front, 
        // on laisse le backend s'en charger avec l'IA
        this.sendToSmartBackend(userMessage);
        // Après extraction des compétences
        this.extractUserProfile(userMessage);

        // Faire un matching manuel
        this.manualJobMatching();
    }
    
    private sendToSmartBackend(message: string) {
        // Convertir les messages Angular en format conversation pour le backend
        const conversation = this.messages.map(msg => ({
            role: msg.role,
            content: msg.text
        }));
    
        this.api.sendSmartMessage(conversation, message, this.userProfile).subscribe({
            next: (response) => {
                // Le backend peut renvoyer soit des jobs, soit une réponse textuelle
                if (response.jobs) {
                    this.displayJobs(response.jobs);
                } else if (response.job) {
                    this.displayJobDetails(response.job);
                } else if (response.answer) {
                    this.messages.push({
                        id: crypto.randomUUID(),
                        role: 'bot',
                        text: response.answer,
                        ts: Date.now()
                    });
                }
                
                this.isTyping = false;
                this.saveCurrentConversation();
                this.scrollToBottom();
            },
            error: (err) => {
                console.error('Erreur chat-smart:', err);
                this.messages.push({
                    id: crypto.randomUUID(),
                    role: 'bot',
                    text: 'Désolé, une erreur s\'est produite.',
                    ts: Date.now()
                });
                this.isTyping = false;
                this.scrollToBottom();
            }
        });
    }
    
    private displayJobs(jobs: Job[]) {
        if (jobs.length === 0) {
            this.messages.push({
                id: crypto.randomUUID(),
                role: 'bot',
                text: `Aucune offre trouvée 😔\n\nEssaie de modifier ta recherche.`,
                ts: Date.now()
            });
            return;
        }
    
        const jobsList = jobs.slice(0, 10).map((job, i) => 
            `${i + 1}. **${job.title}**\n   ${job.company} | ${job.location}\n   ${job.type} | ${job.salary}`
        ).join('\n\n');
    
        this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: `🎯 J'ai trouvé **${jobs.length} offres** :\n\n${jobsList}\n\nVeux-tu plus de détails ?`,
            ts: Date.now(),
            jobMatches: jobs.slice(0, 10)
        });
    }
    
    private displayJobDetails(job: Job) {
        const benefits = job.benefits?.join('\n   • ') || 'Non spécifié';
        const techStack = job.tech_stack ? this.formatTechStack(job.tech_stack) : '';
        const projects = job.projects?.map(p => `   • ${p}`).join('\n') || '';
        const interviewProcess = job.interview_process?.map((step, i) => `   ${i + 1}. ${step}`).join('\n') || '';
        
        this.messages.push({
            id: crypto.randomUUID(),
            role: 'bot',
            text: `📋 **${job.title}** chez ${job.company}\n\n` +
                  `📍 **Localisation:** ${job.location}${job.office_location ? ` (${job.office_location})` : ''}\n` +
                  `💼 **Type:** ${job.type} - ${job.duration}\n` +
                  `⏰ **Rythme:** ${job.rhythm}\n` +
                  `💰 **Salaire:** ${job.salary}\n` +
                  `👥 **Équipe:** ${job.team || 'Non spécifié'}\n` +
                  `🏢 **Taille:** ${job.company_size} | Secteur: ${job.sector}\n\n` +
                  
                  `**📝 Description:**\n${job.description}\n\n` +
                  
                  `**🎯 Compétences requises:**\n${job.skills_required.join(', ')}\n\n` +
                  
                  `**🌟 Soft skills:**\n${job.soft_skills.join(', ')}\n\n` +
                  
                  `**🎁 Avantages:**\n   • ${benefits}\n\n` +
                  
                  (projects ? `**🚀 Projets sur lesquels tu travailleras:**\n${projects}\n\n` : '') +
                  
                  (techStack ? `**💻 Stack technique:**\n${techStack}\n\n` : '') +
                  
                  (job.remote_policy ? `**🏠 Télétravail:** ${job.remote_policy}\n\n` : '') +
                  
                  (interviewProcess ? `**🎤 Processus de recrutement:**\n${interviewProcess}\n\n` : '') +
                  
                  (job.start_date ? `**📅 Démarrage:** ${job.start_date}\n\n` : '') +
                  
                  (job.company_culture ? `**🌈 Culture d'entreprise:** ${job.company_culture}\n\n` : '') +
                  
                  `**📧 Contact:** ${job.contact_email}` +
                  (job.application_url ? `\n🔗 [Postuler ici](${job.application_url})` : ''),
            ts: Date.now()
        });
    }
    
    // Fonction helper pour formater la tech stack
    private formatTechStack(techStack: any): string {
        let result = '';
        for (const [category, technologies] of Object.entries(techStack)) {
            if (Array.isArray(technologies) && technologies.length > 0) {
                const categoryName = category.replace(/_/g, ' ').toUpperCase();
                result += `   **${categoryName}:** ${technologies.join(', ')}\n`;
            }
        }
        return result;
    }

    onKeyDown(ev: KeyboardEvent) {
        if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            this.send();
        }
    }

    reset() {
        this.createNewConversation();
    }

    triggerUpload() {
        this.fileInput?.nativeElement.click();
    }

    onFileSelected(ev: Event) {
        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        this.snack.open(`CV chargé : ${file.name}`, 'OK', { duration: 2500 });

        this.messages.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: `[Upload] ${file.name}`,
            ts: Date.now(),
        });

        this.isTyping = true;
        setTimeout(() => {
            this.messages.push({
                id: crypto.randomUUID(),
                role: 'bot',
                text: "Parfait ! J'ai reçu ton CV 📄\n\nJe vais en extraire : compétences, projets, et expériences.\n\nQuestion : tu vises quel type d'entreprise ? (startup / ESN / grand groupe)",
                ts: Date.now(),
            });
            this.isTyping = false;
            this.saveCurrentConversation();
            this.scrollToBottom();
        }, 700);

        input.value = '';
    }

    private extractUserProfile(message: string) {
        const lowerMsg = message.toLowerCase();
        
        // Extraction de compétences techniques
        const skillKeywords = [
            'react', 'vue', 'angular', 'node', 'nodejs', 'python', 'django', 
            'flutter', 'dart', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
            'postgresql', 'mongodb', 'redis', 'typescript', 'javascript',
            'figma', 'adobe xd', 'ux', 'ui', 'spark', 'kafka', 'airflow',
            'tensorflow', 'pytorch', 'machine learning', 'ml', 'data science',
            'cybersécurité', 'pentest', 'linux', 'devops', 'ci/cd'
        ];
        
        const foundSkills = skillKeywords.filter(skill => 
            lowerMsg.includes(skill)
        );

        if (foundSkills.length > 0) {
            this.userProfile.skills = [...new Set([...this.userProfile.skills, ...foundSkills])];
        }
        
        // Extraction de localisation
        const cities = ['paris', 'lyon', 'nantes', 'bordeaux', 'toulouse', 'marseille', 'lille', 'grenoble', 'remote'];
        const foundCity = cities.find(city => lowerMsg.includes(city));
        if (foundCity && !this.userProfile.location) {
            this.userProfile.location = foundCity;
        }
        
        // Extraction de préférences d'entreprise
        if (lowerMsg.includes('startup')) {
            this.userProfile.preferences = 'startup';
        } else if (lowerMsg.includes('grand groupe') || lowerMsg.includes('grande entreprise')) {
            this.userProfile.preferences = 'grande entreprise';
        } else if (lowerMsg.includes('pme')) {
            this.userProfile.preferences = 'pme';
        }
        
        // Extraction d'expérience
        const expMatch = lowerMsg.match(/(\d+)\s*(an|année)/);
        if (expMatch) {
            this.userProfile.experience = `${expMatch[1]} ans`;
        }
        
        console.log('📊 Profil utilisateur mis à jour:', this.userProfile);
        this.saveCurrentConversation();
    }

    private scrollToBottom() {
        setTimeout(() => {
            const el = this.scrollEl?.nativeElement;
            if (el) el.scrollTop = el.scrollHeight;
        }, 0);
    }
}