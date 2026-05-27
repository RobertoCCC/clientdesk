export type TicketStatus = "new" | "triage" | "waiting" | "resolved";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type Ticket = {
  id: string;
  subject: string;
  client: string;
  contact: string;
  status: TicketStatus;
  priority: TicketPriority;
  owner: string;
  channel: "Portal" | "Email" | "Telefone" | "WhatsApp";
  service: string;
  createdAt: string;
  updatedAt: string;
  firstResponseMinutes: number;
  description: string;
  attachments: string[];
  messages: Array<{
    author: string;
    role: "client" | "team";
    time: string;
    body: string;
  }>;
  internalNotes: string[];
};
