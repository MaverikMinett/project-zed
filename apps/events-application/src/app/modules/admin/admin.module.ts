import { NgModule } from "@angular/core";
import { AdminIndexPageComponent } from "./components/admin-index-page/admin-index-page.component";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { AdminSidenavComponent } from "./components/admin-sidenav/admin-sidenav.component";
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { EventsModule } from "./modules/events/events.module";
import { adminRoutes } from "./admin.routes";

import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { UsersModule } from "./modules/users/users.module";

@NgModule({
    declarations: [ 
        AdminIndexPageComponent,
        AdminDashboardComponent,
        AdminSidenavComponent
     ],
    imports: [
        CommonModule,
        BrowserAnimationsModule,
        EventsModule,
        OrganizationsModule,
        UsersModule,
        RouterModule.forChild(adminRoutes),
    ]
})
export class AdminModule { }