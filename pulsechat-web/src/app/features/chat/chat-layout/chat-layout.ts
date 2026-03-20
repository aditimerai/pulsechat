import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConversationList } from '../conversation-list/conversation-list';
import { ChatWindow } from '../chat-window/chat-window';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [
    ConversationList,
    ChatWindow,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './chat-layout.html',
  styleUrl: './chat-layout.scss',
})
export class ChatLayout implements OnInit {
  constructor(
    public chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.chatService.loadConversations();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
