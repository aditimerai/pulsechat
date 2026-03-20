export interface User {
  id: string;
  username: string;
  email?: string;
  isOnline?: boolean;
}

export interface Conversation {
  id: string;           // UUID
  name: string;
  lastMessage?: string;
  lastMessageTime?: string | Date;
  unreadCount: number;
  isOnline?: boolean;
  participantId?: string;
}

export interface Message {
  id: string;             // UUID
  conversationId: string; // UUID
  senderId: string;       // UUID
  senderName: string;
  content: string;
  sentAt: string | Date;
}
