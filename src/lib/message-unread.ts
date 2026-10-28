export function isUnreadReply(message: { sender_id: string; read_at?: string | null }, recipientId: string) {
  return message.sender_id !== recipientId && !message.read_at;
}