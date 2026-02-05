import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

interface Pillar {
    title: string;
    detail: string;
}

@Component({
    standalone: true,
    imports: [CommonModule, MatButtonModule, RouterLink],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
    pillars: Pillar[] = [
        {
            title: 'Apprenants',
            detail: 'Valoriser les expériences courtes et exprimer clairement les objectifs.',
        },
        {
            title: 'Écoles',
            detail: 'Vérifier l’alignement RNCP et assurer la progression pédagogique.',
        },
        {
            title: 'Employeurs',
            detail: 'Traduire les besoins métiers et sécuriser les missions confiées.',
        },
    ];

    problemCards = [
        {
            title: 'Vision apprenant',
            text: 'Un CV court, beaucoup d’intention. Il faut l’aider à raconter une histoire exploitable.',
        },
        {
            title: 'Vision école',
            text: 'Chaque offre doit cocher les blocs RNCP et garantir la montée en compétences.',
        },
        {
            title: 'Vision employeur',
            text: 'Les besoins métiers évoluent vite : on clarifie pour accélérer la sélection.',
        },
    ];

    objectivePoints = [
        'Collecter des informations via une conversation naturelle.',
        'Traduire CV, offres et référentiels RNCP en données exploitables.',
        'Restituer une compatibilité claire, prête à être branchée au back-office.',
    ];

    flow = [
        {
            id: '01',
            title: 'Conversation guidée',
            text: 'Collecte des objectifs, expériences, contraintes et attentes.',
        },
        {
            id: '02',
            title: 'Traduction IA',
            text: 'CV, offres et RNCP transformés en jeux de données comparables.',
        },
        {
            id: '03',
            title: 'Restitution métier',
            text: 'Insights actionnables prêts à intégrer le produit final.',
        },
    ];
}
