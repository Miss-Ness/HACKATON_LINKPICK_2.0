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

    quickReplies = [
        'Je cherche une alternance dev',
        'Je cherche une alternance data/IA',
        'Je veux améliorer mon CV',
        'Explique-moi mon score',
    ];

    messages: ChatMessage[] = [
        {
            id: crypto.randomUUID(),
            role: 'bot',
            text:
                "Salut, je suis le bot du Hackathon. Je peux collecter ton objectif, analyser ton CV/offre, et expliquer le matching.\n\nTu veux commencer par :\n1) ton objectif\n2) ton CV\n3) une offre",
            ts: Date.now(),
        },
    ];

    constructor(private snack: MatSnackBar) {}

    send(text?: string) {
        const content = (text ?? this.input).trim();
        if (!content) return;

        this.messages.push({
            id: crypto.randomUUID(),
            role: 'user',
            text: content,
            ts: Date.now(),
        });

        this.input = '';
        this.scrollToBottom();

        this.isTyping = true;
        const botText = this.mockBot(content);

        setTimeout(() => {
            this.messages.push({
                id: crypto.randomUUID(),
                role: 'bot',
                text: botText,
                ts: Date.now(),
            });
            this.isTyping = false;
            this.scrollToBottom();
        }, 650);
    }

    onKeyDown(ev: KeyboardEvent) {
        if (ev.key === 'Enter' && !ev.shiftKey) {
            ev.preventDefault();
            this.send();
        }
    }

    reset() {
        this.messages = [
            {
                id: crypto.randomUUID(),
                role: 'bot',
                text:
                    "Reset effectué.\nRepartons de zéro : quel est ton objectif (poste/secteur), ta ville, et ton rythme d'alternance ?",
                ts: Date.now(),
            },
        ];
        this.input = '';
        this.isTyping = false;
        this.scrollToBottom();
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

    private mockBot(userText: string): string {
        const t = userText.toLowerCase();

        if (t.includes('cv')) {
            return "Ok. Tu peux uploader ton CV en PDF/Doc.\nEnsuite je te pose 3 questions et je sors un score + explications.";
        }
        if (t.includes('data') || t.includes('ia')) {
            return "Nickel. Pour l’alternance data/IA, je vais regarder : Python/SQL, stats, ML, projets.\nTu as déjà fait : pandas, sklearn, notebooks, APIs ?";
        }
        if (t.includes('dev')) {
            return "Dev : compris. Plutôt front, back, fullstack ?\nEt tu préfères Angular/React ou peu importe ?";
        }
        if (t.includes('score')) {
            return "Je peux expliquer le score en 3 blocs :\n1) Hard skills\n2) Soft skills & posture\n3) Contraintes (rythme, localisation)\n\nEnvoie-moi une offre (texte ou lien) et je te fais l’analyse.";
        }
        if (t.includes('startup')) {
            return "Startup : parfait. Je valoriserai autonomie, ownership, projets perso.\nTu acceptes du remote partiel ? Et ton rythme d’alternance ?";
        }

            return "Reçu.\nPour que je fasse un matching utile :\n- Poste visé\n- Localisation\n- Rythme\n- 3 compétences fortes\nTu me donnes ça ?";
    }
}
