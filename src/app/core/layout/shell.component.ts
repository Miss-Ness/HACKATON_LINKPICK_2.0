import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        RouterLink,
        RouterLinkActive,
        MatToolbarModule,
        MatButtonModule,
    ],
    templateUrl: './shell.component.html',
    styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
    readonly currentYear = new Date().getFullYear();
    showFooter = false;

    ngOnInit() {
        this.updateFooterVisibility();
    }

    @HostListener('window:scroll')
    onScroll() {
        this.updateFooterVisibility();
    }

    private updateFooterVisibility() {
        this.showFooter = window.scrollY > 150;
    }
}
