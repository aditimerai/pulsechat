import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { Observable, tap } from 'rxjs';
import { Conversation, Message, User } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private connection!: signalR.HubConnection;
  private readonly apiUrl = 'http://localhost:5095';
  private pollingTimer: any = null;

  // ── State signals ─────────────────────────────────────────────────────────
  readonly conversations = signal<Conversation[]>([]);
  readonly selectedConversation = signal<Conversation | null>(null);
  readonly isConnected = signal(false);
  readonly isLoading = signal(false);
  readonly createConvError = signal<string | null>(null);
  readonly profileVisible = signal(false);

  private readonly messagesMap = signal<Map<string, Message[]>>(new Map());
  private readonly typingMap = signal<Map<string, string[]>>(new Map());

  readonly currentMessages = computed(() => {
    const conv = this.selectedConversation();
    if (!conv) return [];
    return this.messagesMap().get(conv.id) ?? [];
  });

  readonly currentTypingUsers = computed(() => {
    const conv = this.selectedConversation();
    if (!conv) return [];
    return this.typingMap().get(conv.id) ?? [];
  });

  constructor(private http: HttpClient) {
    this.initSignalR();
  }

  // ── SignalR ───────────────────────────────────────────────────────────────
  private initSignalR() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrl}/chatHub`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnected(() => {
      this.isConnected.set(true);
      this.stopPolling();
    });

    this.connection.onclose(() => {
      this.isConnected.set(false);
      this.startPolling(); // fallback when SignalR is down
    });

    this.connection.on('ReceiveMessage', (raw: any) => {
      const msg = this.normalizeMessage(raw);
      this.addMessageToMap(msg);
      this.updateConversationMeta(msg);
    });

    this.connection.on('UserTyping', (conversationId: string, username: string) => {
      this.addTypingUser(conversationId, username);
      setTimeout(() => this.removeTypingUser(conversationId, username), 3000);
    });

    this.startConnection();
  }

  private async startConnection() {
    try {
      await this.connection.start();
      this.isConnected.set(true);
    } catch {
      this.startPolling();
      setTimeout(() => this.startConnection(), 5000);
    }
  }

  // ── Polling fallback (when SignalR is unavailable) ────────────────────────
  private startPolling() {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      const conv = this.selectedConversation();
      if (!conv) return;
      this.http.get<any>(`${this.apiUrl}/api/Messages/${conv.id}`).subscribe({
        next: (response) => {
          const raw: any[] = Array.isArray(response)
            ? response
            : (response?.items ?? response?.data ?? response?.messages ?? response?.['$values'] ?? []);
          const msgs = raw.map((m) => this.normalizeMessage(m));
          msgs.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
          if (msgs.length > 0) {
            this.messagesMap.update((map) => {
              const updated = new Map(map);
              updated.set(conv.id, msgs);
              return updated;
            });
          }
        },
        error: () => {},
      });
    }, 5000);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  // ── Normalizers ───────────────────────────────────────────────────────────
  private normalizeConversation(raw: any): Conversation {
    const currentUserId = this.getCurrentUserId();

    let name: string =
      (raw.name && raw.name !== 'string' ? raw.name : null) ||
      (raw.title && raw.title !== 'string' ? raw.title : null) ||
      raw.conversationName ||
      raw.chatName ||
      null!;

    if (!name) {
      const participants: any[] =
        raw.participants ?? raw.members ?? raw.users ??
        raw.conversationParticipants ?? [];
      const other = participants.find(
        (p: any) => (p.id ?? p.userId ?? p.participantId) !== currentUserId
      );
      name =
        other?.username ?? other?.userName ??
        other?.name ?? other?.displayName ??
        participants[0]?.username ?? participants[0]?.name ??
        `Chat`;
    }

    return {
      id: raw.id ?? raw.conversationId,
      name,
      lastMessage: raw.lastMessage ?? raw.lastMessageContent ?? undefined,
      lastMessageTime: raw.lastMessageTime ?? raw.updatedAt ?? raw.createdAt ?? undefined,
      unreadCount: raw.unreadCount ?? 0,
      isOnline: raw.isOnline ?? false,
    };
  }

  private normalizeMessage(raw: any): Message {
    // Handle backends that return sender as a nested object
    const senderObj = raw.sender && typeof raw.sender === 'object' ? raw.sender : null;
    return {
      id: raw.id ?? raw.messageId ?? crypto.randomUUID(),
      conversationId: raw.conversationId,
      senderId:
        raw.senderId ?? raw.userId ?? raw.authorId ??
        senderObj?.id ?? senderObj?.userId ?? '',
      senderName:
        raw.senderName ??
        (typeof raw.sender === 'string' ? raw.sender : null) ??
        senderObj?.username ?? senderObj?.userName ?? senderObj?.name ??
        raw.username ?? raw.authorName ?? 'Unknown',
      content: raw.content ?? raw.text ?? raw.body ?? raw.message ?? '',
      sentAt: raw.sentAt ?? raw.timestamp ?? raw.createdAt ?? new Date().toISOString(),
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private addMessageToMap(msg: Message) {
    this.messagesMap.update((map) => {
      const updated = new Map(map);
      const existing = updated.get(msg.conversationId) ?? [];
      const isDup =
        existing.some((m) => m.id === msg.id) ||
        existing.some(
          (m) =>
            m.senderId === msg.senderId &&
            m.content === msg.content &&
            Math.abs(new Date(m.sentAt).getTime() - new Date(msg.sentAt).getTime()) < 3000
        );
      if (!isDup) {
        const sorted = [...existing, msg].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        updated.set(msg.conversationId, sorted);
      }
      return updated;
    });
  }

  private updateConversationMeta(msg: Message) {
    const selectedId = this.selectedConversation()?.id;
    this.conversations.update((convs) =>
      convs.map((c) =>
        c.id === msg.conversationId
          ? {
              ...c,
              lastMessage: msg.content,
              lastMessageTime: msg.sentAt,
              unreadCount: c.id !== selectedId ? (c.unreadCount || 0) + 1 : 0,
            }
          : c
      )
    );
  }

  private addTypingUser(conversationId: string, username: string) {
    this.typingMap.update((map) => {
      const updated = new Map(map);
      const users = updated.get(conversationId) ?? [];
      if (!users.includes(username)) updated.set(conversationId, [...users, username]);
      return updated;
    });
  }

  private removeTypingUser(conversationId: string, username: string) {
    this.typingMap.update((map) => {
      const updated = new Map(map);
      updated.set(conversationId, (updated.get(conversationId) ?? []).filter((u) => u !== username));
      return updated;
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  loadConversations() {
    this.http.get<any>(`${this.apiUrl}/api/Conversations`).subscribe({
      next: (response) => {
        const raw: any[] = Array.isArray(response)
          ? response
          : (response?.items ?? response?.data ?? response?.conversations ?? response?.['$values'] ?? []);

        const normalized = raw.map((c) => this.normalizeConversation(c));

        // Sort by most recent activity first
        normalized.sort((a, b) => {
          const tA = a.lastMessageTime ? new Date(a.lastMessageTime as string).getTime() : 0;
          const tB = b.lastMessageTime ? new Date(b.lastMessageTime as string).getTime() : 0;
          return tB - tA;
        });

        // Dedup by ID (strict), then by name (workaround for backend creating
        // duplicate conversations per participant pair)
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const cleaned = normalized.filter((c) => {
          if (!c.id || seenIds.has(c.id)) return false;
          seenIds.add(c.id);
          const nameKey = c.name?.toLowerCase().trim() ?? '';
          if (nameKey && seenNames.has(nameKey)) return false;
          if (nameKey) seenNames.add(nameKey);
          return true;
        });

        this.conversations.set(cleaned);
      },
      error: (err) => console.error('Failed to load conversations:', err),
    });
  }

  selectConversation(conv: Conversation) {
    const prev = this.selectedConversation();
    if (prev?.id === conv.id) return;

    this.selectedConversation.set({ ...conv, unreadCount: 0 });
    this.conversations.update((convs) =>
      convs.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );

    if (!this.messagesMap().has(conv.id)) {
      this.isLoading.set(true);
      this.http.get<any>(`${this.apiUrl}/api/Messages/${conv.id}`).subscribe({
        next: (response) => {
          const raw: any[] = Array.isArray(response)
            ? response
            : (response?.items ?? response?.data ?? response?.messages ?? response?.['$values'] ?? []);
          const msgs = raw.map((m) => this.normalizeMessage(m));
          msgs.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
          this.messagesMap.update((map) => {
            const updated = new Map(map);
            updated.set(conv.id, msgs);
            return updated;
          });
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
    }
  }

  sendMessage(conversationId: string, content: string): Observable<any> {
    // Optimistic: show the message immediately
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversationId,
      senderId: this.getCurrentUserId(),
      senderName: this.getCurrentUsername(),
      content,
      sentAt: new Date().toISOString(),
    };
    this.addMessageToMap(optimistic);
    this.updateConversationMeta(optimistic);

    return this.http.post<any>(`${this.apiUrl}/api/Messages`, { conversationId, content }).pipe(
      tap((res) => {
        if (res?.id) {
          const real = this.normalizeMessage({ ...res, conversationId });
          this.addMessageToMap(real);
        }
      })
    );
  }

  sendTyping(conversationId: string) {
    if (this.connection.state !== 'Connected') return;
    this.connection.invoke('Typing', conversationId).catch(() => {});
  }

  getUsers() {
    return this.http.get<User[]>(`${this.apiUrl}/api/Users`);
  }

  createConversation(userId: string): Observable<any> {
    this.createConvError.set(null);
    return this.http.post(`${this.apiUrl}/api/Conversations`, [userId]);
  }

  logCreateConvError(err: any) {
    const errors = err?.error?.errors;
    if (errors) {
      const msg = Object.entries(errors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join(' | ');
      this.createConvError.set(msg);
    } else {
      this.createConvError.set(err?.error?.title ?? err?.message ?? 'Failed to create conversation');
    }
  }

  getCurrentUserId(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.nameid ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
    } catch { return ''; }
  }

  getCurrentUsername(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.unique_name || payload.name ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '';
    } catch { return ''; }
  }

  getCurrentEmail(): string {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
    } catch { return ''; }
  }

  clearConversationMessages(convId: string) {
    this.messagesMap.update((map) => {
      const updated = new Map(map);
      updated.set(convId, []);
      return updated;
    });
  }
}
