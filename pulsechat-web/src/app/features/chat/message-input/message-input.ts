import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss',
})
export class MessageInput implements OnInit, OnDestroy {
  messageText = '';

  private typingSubject = new Subject<void>();
  private typingSub!: Subscription;

  constructor(public chatService: ChatService) {}

  ngOnInit() {
    // Debounce typing events — fire at most once every 2s while user types
    this.typingSub = this.typingSubject
      .pipe(
        debounceTime(300),
        filter(() => !!this.chatService.selectedConversation())
      )
      .subscribe(() => {
        const conv = this.chatService.selectedConversation();
        if (conv) this.chatService.sendTyping(conv.id);
      });
  }

  ngOnDestroy() {
    this.typingSub?.unsubscribe();
  }

  onInput() {
    this.typingSubject.next();
  }

  sendMessage() {
    const text = this.messageText.trim();
    const conv = this.chatService.selectedConversation();
    if (!text || !conv) return;

    // Clear immediately for snappy UX; restore on error
    this.messageText = '';

    this.chatService.sendMessage(conv.id, text).subscribe({
      error: (err) => {
        console.error('Failed to send message:', err);
        this.messageText = text; // Restore on failure
      },
    });
  }

  onKeyDown(event: KeyboardEvent) {
    // Send on Enter (without Shift for newline)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
