import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ChatbotComponent } from './pages/chatbot/chatbot.component';
import { AboutComponent } from './pages/about/about.component';

export const routes: Routes = [
    { path: '', component: HomeComponent, pathMatch: 'full' },
    { path: 'chatbot', component: ChatbotComponent },
    { path: 'about', component: AboutComponent },
    { path: '**', redirectTo: '' },
];
