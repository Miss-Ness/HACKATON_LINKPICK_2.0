import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-feature-card',
    standalone: true,
    imports: [MatIconModule],
    templateUrl: './feature-card.component.html',
    styleUrls: ['./feature-card.component.scss'],
})
export class FeatureCardComponent {
    @Input() icon = 'auto_awesome';
    @Input() title = '';
    @Input() text = '';
}
