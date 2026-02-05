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
            name: 'Léa Dupont',
            role: 'Product & Design',
            focus: 'Coordination atelier, maquettes haute fidélité, ton éditorial.',
        },
        {
            name: 'Nassim Benali',
            role: 'Frontend',
            focus: 'Architecture Angular, composants standalone, theming Material.',
        },
        {
            name: 'Camille Robert',
            role: 'Backend / API',
            focus: 'Spécifications d’API, sécurisation des échanges école ↔ entreprise.',
        },
        {
            name: 'Idriss Aït',
            role: 'Data / IA',
            focus: 'Extraction CV/offres, scoring et explications métier.',
        },
        {
            name: 'Sofia El Mansour',
            role: 'Ops & Delivery',
            focus: 'Pilotage du planning, intégration avec les équipes école/entreprise.',
        },
    ];

    principles = [
        'Une UX claire pour chaque acteur (apprenant, école, employeur).',
        'Des composants autonomes pour brancher rapidement un backend.',
        'Une approche produit “beta industrielle” : démonstration immédiate, code maintenable.',
    ];
}
