import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { Conversation, User } from '../../../core/models/chat.models';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.scss',
})
export class ConversationList implements OnInit {
  showNewChat = signal(false);
  users = signal<User[]>([]);
  loadingUsers = signal(false);
  searchQuery = signal('');

  constructor(
    public chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // loadConversations() is already called by chat-layout.ngOnInit — do not call again here
  }

  get filteredConversations(): Conversation[] {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.chatService.conversations();
    return this.chatService
      .conversations()
      .filter((c) => c.name.toLowerCase().includes(q));
  }

  selectConversation(conv: Conversation) {
    this.chatService.selectConversation(conv);
  }

  isSelected(conv: Conversation): boolean {
    return this.chatService.selectedConversation()?.id === conv.id;
  }

  toggleProfile() {
    const next = !this.chatService.profileVisible();
    this.chatService.profileVisible.set(next);
    if (next) this.showNewChat.set(false); // close new-chat panel if open
  }

  toggleNewChat() {
    this.showNewChat.update((v) => !v);
    if (this.showNewChat()) this.chatService.profileVisible.set(false);
    if (this.showNewChat() && this.users().length === 0) {
      this.loadingUsers.set(true);
      this.chatService.getUsers().subscribe({
        next: (users) => {
          this.users.set(users);
          this.loadingUsers.set(false);
        },
        error: () => this.loadingUsers.set(false),
      });
    }
  }

  startChat(user: User) {
    this.chatService.createConversation(user.id).subscribe({
      next: (res) => {
        this.showNewChat.set(false);
        const convId: string = res?.id ?? res?.conversationId ?? res;
        const existing = this.chatService.conversations().find(c => c.id === convId);
        if (existing) {
          // Conversation already in list — just select it
          this.chatService.selectConversation(existing);
        } else {
          // New conversation — add to list then select
          const conv: Conversation = {
            id: convId,
            name: res?.name || user.username,
            unreadCount: 0,
          };
          this.chatService.conversations.update(convs => [conv, ...convs]);
          this.chatService.selectConversation(conv);
        }
      },
      error: (err) => this.chatService.logCreateConvError(err),
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Formatting helpers ─────────────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const palette = [
      '#6c63ff', '#42a5f5', '#26a69a',
      '#66bb6a', '#ffa726', '#ef5350', '#ab47bc',
    ];
    if (!name) return palette[0];
    return palette[name.charCodeAt(0) % palette.length];
  }

  formatTime(date: string | Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDay < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
