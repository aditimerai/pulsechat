import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    component: Login,
  },
  { path: 'register', component: Register },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat-layout/chat-layout').then((m) => m.ChatLayout),
  },
];
