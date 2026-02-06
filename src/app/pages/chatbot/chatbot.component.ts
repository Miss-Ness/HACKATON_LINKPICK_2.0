import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';

type Role = 'bot' | 'user';

interface ChatMessage {
    id: string;
    role: Role;
    text: string;
    ts: number;
}

interface ChatConversation {
    id: string;
    title: string;
    createdAt: number;
    messages: ChatMessage[];
}

@Component({
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatInputModule,
        MatDividerModule,
        MatSnackBarModule,
        MatFormFieldModule,
    ],
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.scss'],
})
export class ChatbotComponent {
    @ViewChild('scrollEl') scrollEl?: ElementRef<HTMLDivElement>;
    @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

    input = '';
    isTyping = false;

    // Gestion de l'historique
    conversations: ChatConversation[] = [];
    currentConversationId: string | null = null;
    showSidebar = false;

    quickReplies = [
        'Je cherche une alternance dev',
        'Je cherche une alternance data/IA',
        'Je veux améliorer mon CV',
        'Explique-moi mon score',
    ];

    messages: ChatMessage[] = [];

    constructor(private snack: MatSnackBar) {}

    ngOnInit() {
        this.loadConversations();

        // Charger la dernière conversation ou en créer une nouvelle
        if (this.conversations.length > 0) {
            this.loadConversation(this.conversations[0].id);
        } else {
            this.createNewConversation();
        }
    }

    // Créer une nouvelle conversation
    createNewConversation() {
        const newConv: ChatConversation = {
            id: crypto.randomUUID(),
            title: 'Nouvelle conversation',
            createdAt: Date.now(),
            messages: [
                {
                    id: crypto.randomUUID(),
                    role: 'bot',
                    text: "Salut, je suis le bot du Hackathon. Je peux collecter ton objectif, analyser ton CV/offre, et expliquer le matching.\n\nTu veux commencer par :\n1) ton objectif\n2) ton CV\n3) une offre",
                    ts: Date.now(),
                },
            ],
        };
        this.conversations.unshift(newConv); // Ajouter au début
        this.currentConversationId = newConv.id;
        this.messages = newConv.messages;
        this.saveConversations();
        this.scrollToBottom();
    }

    loadConversation(conversationId: string) {
        const conv = this.conversations.find(c => c.id === conversationId);
        if (conv) {
            this.currentConversationId = conversationId;
            this.messages = conv.messages;
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

    renameConversation(conversationId: string, newTitle: string) {
        const conv = this.conversations.find(c => c.id === conversationId);
        if (conv) {
            conv.title = newTitle;
            this.saveConversations();
        }
    }

    // Sauvegarder toutes les conversations
    private saveConversations() {
        localStorage.setItem('chat_conversations', JSON.stringify(this.conversations));
    }

    // Charger toutes les conversations
    private loadConversations() {
        const saved = localStorage.getItem('chat_conversations');
        if (saved) {
            this.conversations = JSON.parse(saved);
        }
    }

    // Sauvegarder les messages de la conversation actuelle
    private saveCurrentConversation() {
        const conv = this.conversations.find(c => c.id === this.currentConversationId);
        if (conv) {
            conv.messages = this.messages;
            
            // Auto-générer un titre basé sur le premier message utilisateur
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
        this.saveCurrentConversation(); // Sauvegarder après chaque message
        this.scrollToBottom();

        fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: content }),
        })
            .then(res => res.json())
            .then(data => {
                this.messages.push({ id: crypto.randomUUID(), role: 'bot', text: data.answer, ts: Date.now() });
                this.isTyping = false;
                this.saveCurrentConversation(); // Sauvegarder après la réponse
                this.scrollToBottom();
            })
            .catch(err => {
                console.error(err);
                this.messages.push({ id: crypto.randomUUID(), role: 'bot', text: 'Le bot est indisponible.', ts: Date.now() });
                this.isTyping = false;
                this.saveCurrentConversation();
                this.scrollToBottom();
            });
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

    toggleSidebar() {
        this.showSidebar = !this.showSidebar;
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
                text:
                    "Parfait. J'ai reçu ton CV.\nJe vais en extraire : compétences, stack, projets, soft skills, et contraintes.\n\nQuestion : tu vises quel type d’entreprise ? (startup / ESN / grand groupe)",
                ts: Date.now(),
            });
            this.isTyping = false;
            this.scrollToBottom();
        }, 700);

        input.value = '';
    }

    private scrollToBottom() {
        setTimeout(() => {
            const el = this.scrollEl?.nativeElement;
            if (el) el.scrollTop = el.scrollHeight;
        }, 0);
    }

}
