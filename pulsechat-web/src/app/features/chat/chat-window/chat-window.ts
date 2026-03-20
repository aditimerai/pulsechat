import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  effect,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService } from '../../../core/services/chat.service';
import { MessageInput } from '../message-input/message-input';
import { Message } from '../../../core/models/chat.models';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageInput,
  ],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow implements AfterViewChecked {
  @ViewChild('messageList') private messageList!: ElementRef<HTMLElement>;
  private shouldScroll = false;

  constructor(public chatService: ChatService) {
    effect(() => {
      this.chatService.currentMessages();
      this.shouldScroll = true;
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom() {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  openProfile() {
    this.chatService.profileVisible.set(true);
  }

  clearChat() {
    const conv = this.chatService.selectedConversation();
    if (conv) this.chatService.clearConversationMessages(conv.id);
  }

  isOwnMessage(msg: Message): boolean {
    return msg.senderId === this.chatService.getCurrentUserId();
  }

  isNewGroup(messages: Message[], index: number): boolean {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.senderId !== curr.senderId) return true;
    const diff = new Date(curr.sentAt).getTime() - new Date(prev.sentAt).getTime();
    return diff > 5 * 60 * 1000;
  }

  showDateDivider(messages: Message[], index: number): boolean {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].sentAt).toDateString();
    const curr = new Date(messages[index].sentAt).toDateString();
    return prev !== curr;
  }

  formatDividerDate(date: string | Date): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const palette = ['#6c63ff', '#42a5f5', '#26a69a', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc'];
    if (!name) return palette[0];
    return palette[name.charCodeAt(0) % palette.length];
  }

  formatTypingText(users: string[]): string {
    if (users.length === 1) return `${users[0]} is typing…`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing…`;
    return 'Several people are typing…';
  }
}
