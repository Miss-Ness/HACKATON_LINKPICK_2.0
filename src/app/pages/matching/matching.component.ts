import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface InsightCard {
    title: string;
    icon: string;
    subtitle: string;
    bullets: string[];
}

@Component({
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './matching.component.html',
    styleUrls: ['./matching.component.scss'],
})
export class MatchingComponent {
    alignmentScore = 92;

    insights: InsightCard[] = [
        {
            title: 'Apprenant',
            icon: 'person',
            subtitle: 'Pitch cohérent avec l’offre data/IA visée.',
            bullets: [
                'Expérience projet alignée avec le stack Python / Angular attendu.',
                'Motivations et contraintes (rythme 3j/2j) clairement exprimées.',
                'Compétences transférées vers les missions clés identifiées dans l’offre.',
            ],
        },
        {
            title: 'École',
            icon: 'school',
            subtitle: 'Respect des attendus RNCP confirmé.',
            bullets: [
                'Les missions couvrent les blocs “Conception d’applications” et “Pilotage de projet”.',
                'Accompagnement prévu par un tuteur technique identifié.',
                'Progression régulière documentée dans le cockpit école.',
            ],
        },
        {
            title: 'Employeur',
            icon: 'apartment',
            subtitle: 'Brief clarifié et prêt à être partagé.',
            bullets: [
                'Objectifs métiers reformulés pour l’équipe produit.',
                'Livrables du premier mois détaillés pour sécuriser l’onboarding.',
                'Feedback loop mise en place avec l’école pour ajuster rapidement.',
            ],
        },
    ];

    nextSteps = [
        {
            title: 'Validation conjointe',
            text: 'Signature apprenant/école/employeur depuis l’interface afin de sécuriser le parcours.',
        },
        {
            title: 'Intégration cockpit',
            text: 'Les insights sont injectés dans le back-office pour suivre les actions à mener.',
        },
        {
            title: 'Suivi continu',
            text: 'Le chatbot reste disponible pour ajuster les objectifs et préparer les points d’étape.',
        },
    ];
}
