import { Route } from '@angular/router';
import { EventsIndexPageComponent } from './events-index-page/events-index-page.component';
import { EventsListViewPageComponent } from './events-list-view-page/events-list-view-page.component';
import { EventsItemViewPageComponent } from './events-item-view-page/events-item-view-page.component';

export const eventsRoutes: Route[] = [
    { path: 'events', component: EventsIndexPageComponent },
    { path: 'events/list', component: EventsListViewPageComponent },
    { path: 'events/view/:id', component: EventsItemViewPageComponent },
];
