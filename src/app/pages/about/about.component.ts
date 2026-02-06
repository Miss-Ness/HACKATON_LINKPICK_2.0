import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface TeamMember {
    name: string;
    role: string;
    focus: string;
}

@Component({
    standalone: true,
    imports: [CommonModule],
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
})
export class AboutComponent {
    productScope = [
        { label: 'Frontend', detail: 'Angular standalone + Material, prêt pour intégration API.' },
        { label: 'Chatbot', detail: 'Flux conversationnel, upload CV et hooks send().' },
        { label: 'Insights', detail: 'Cartes d’alignement et roadmap d’intégration back.' },
    ];

    team: TeamMember[] = [
        {
            name: 'Nesrine MESSAOUDI',
            role: 'CSS & HTML',
            focus: 'Strcturation du site.',
        },
        {
            name: 'Mathis ROUSSEL',
            role: 'SCSS & HTML',
            focus: 'Apparence et ésthétique.',
        },
        {
            name: 'Jimmy LA',
            role: 'Backend / API',
            focus: 'Spécifications d’API. & Link avec le front end',
        },
        {
            name: 'Youcef DJABOU',
            role: 'Backend',
            focus: 'Link avec le Frontend',
        },
        {
            name: 'Grégoire MINGUEZ',
            role: 'Angular et Typescrypt',
            focus: 'programation page dynamique/architecture',
        },
    ];

    principles = [
        'Une UX claire pour chaque acteur (apprenant, école, employeur).',
        'Des composants autonomes pour brancher rapidement un backend.',
        'Une approche produit “beta industrielle” : démonstration immédiate, code maintenable.',
    ];
}