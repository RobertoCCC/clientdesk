import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  LifeBuoy,
  Mail,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { tickets as initialTickets } from "./data";
import type { Ticket, TicketPriority, TicketStatus } from "./types";

const statusLabels: Record<TicketStatus, string> = {
  new: "Novo",
  triage: "Em análise",
  waiting: "À espera",
  resolved: "Resolvido",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const statusOrder: TicketStatus[] = ["new", "triage", "waiting", "resolved"];

const storageKey = "clientdesk:tickets:v1";

const slaMinutes: Record<TicketPriority, number> = {
  low: 240,
  normal: 120,
  high: 60,
  urgent: 30,
};

function readStoredTickets() {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as Ticket[]) : initialTickets;
  } catch {
    return initialTickets;
  }
}

function writeStoredTickets(tickets: Ticket[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(tickets));
  } catch {
    // A demo continua funcional mesmo sem storage disponível.
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function nextStatus(status: TicketStatus): TicketStatus {
  const index = statusOrder.indexOf(status);
  return statusOrder[Math.min(index + 1, statusOrder.length - 1)];
}

function getSlaState(ticket: Ticket) {
  if (ticket.status === "resolved") return "ok";
  if (ticket.firstResponseMinutes === 0) return "risk";
  if (ticket.firstResponseMinutes > slaMinutes[ticket.priority]) return "late";
  if (ticket.firstResponseMinutes > slaMinutes[ticket.priority] * 0.75) return "risk";
  return "ok";
}

function getSlaLabel(ticket: Ticket) {
  const state = getSlaState(ticket);
  if (state === "late") return "SLA expirado";
  if (state === "risk") return "SLA em risco";
  return "Dentro do SLA";
}

export function App() {
  const [tickets, setTickets] = useState<Ticket[]>(readStoredTickets);
  const [selectedTicketId, setSelectedTicketId] = useState(initialTickets[0].id);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<TicketStatus | "all">("all");
  const [view, setView] = useState<"team" | "client">("team");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0];

  useEffect(() => {
    writeStoredTickets(tickets);
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesView =
        view === "team" || ticket.client === "Contas & Gestão";
      const matchesStatus =
        activeStatus === "all" || ticket.status === activeStatus;
      const matchesQuery =
        normalized.length === 0 ||
        [
          ticket.id,
          ticket.subject,
          ticket.client,
          ticket.contact,
          ticket.service,
          ticket.owner,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesView && matchesStatus && matchesQuery;
    });
  }, [activeStatus, query, tickets, view]);

  const metrics = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status !== "resolved");
    const urgent = tickets.filter((ticket) => ticket.priority === "urgent");
    const resolved = tickets.filter((ticket) => ticket.status === "resolved");
    const responded = tickets.filter((ticket) => ticket.firstResponseMinutes > 0);
    const averageResponse =
      responded.length > 0
        ? Math.round(
            responded.reduce(
              (sum, ticket) => sum + ticket.firstResponseMinutes,
              0,
            ) / responded.length,
          )
        : 0;

    return {
      open: open.length,
      urgent: urgent.length,
      resolved: resolved.length,
      averageResponse,
    };
  }, [tickets]);

  function advanceStatus(ticketId: string) {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: nextStatus(ticket.status),
              updatedAt: "2026-05-27 16:20",
            }
          : ticket,
      ),
    );
  }

  function addReply(ticketId: string, formData: FormData) {
    const body = String(formData.get("reply") ?? "").trim();
    if (!body) return;

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              updatedAt: "2026-05-27 16:35",
              firstResponseMinutes:
                ticket.firstResponseMinutes === 0 ? 18 : ticket.firstResponseMinutes,
              messages: [
                ...ticket.messages,
                {
                  author: view === "team" ? "Roberto" : ticket.contact,
                  role: view === "team" ? "team" : "client",
                  time: "Agora",
                  body,
                },
              ],
            }
          : ticket,
      ),
    );
  }

  function addInternalNote(ticketId: string, formData: FormData) {
    const note = String(formData.get("note") ?? "").trim();
    if (!note) return;

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              updatedAt: "2026-05-27 16:35",
              internalNotes: [...ticket.internalNotes, note],
            }
          : ticket,
      ),
    );
  }

  function createTicket(formData: FormData) {
    const subject = String(formData.get("subject") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const priority = String(formData.get("priority") ?? "normal") as TicketPriority;

    if (!subject || !description) return;

    const ticket: Ticket = {
      id: `CD-${Math.floor(1100 + Math.random() * 700)}`,
      subject,
      client: "Contas & Gestão",
      contact: "Rui Abreu",
      status: "new",
      priority,
      owner: "Sem dono",
      channel: "Portal",
      service: "Portal cliente",
      createdAt: "2026-05-27 16:25",
      updatedAt: "2026-05-27 16:25",
      firstResponseMinutes: 0,
      description,
      attachments: ["documento-anexo.pdf"],
      messages: [
        {
          author: "Rui Abreu",
          role: "client",
          time: "Agora",
          body: description,
        },
      ],
      internalNotes: ["Novo pedido criado a partir do portal do cliente."],
    };

    setTickets((current) => [ticket, ...current]);
    setSelectedTicketId(ticket.id);
    setActiveStatus("all");
    setCreateOpen(false);
  }

  const selectedSlaState = getSlaState(selectedTicket);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <LifeBuoy size={21} />
          </div>
          <div>
            <strong>ClientDesk</strong>
            <span>Portal & Suporte</span>
          </div>
          <button
            className="icon-button sidebar-close"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Navegação principal">
          <a className="nav-item active" href="#dashboard">
            <Inbox size={18} />
            Tickets
          </a>
          <a className="nav-item" href="#detalhe">
            <MessageSquare size={18} />
            Conversas
          </a>
          <a className="nav-item" href="#notas">
            <ShieldCheck size={18} />
            Notas internas
          </a>
          <a className="nav-item" href="#cliente">
            <UserRound size={18} />
            Portal cliente
          </a>
        </nav>

        <div className="sidebar-card">
          <span>SLA em risco</span>
          <strong>{metrics.urgent}</strong>
          <p>Tickets urgentes exigem primeira resposta em menos de 30 minutos.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <p className="eyebrow">Customer operations</p>
            <h1>Gestão de pedidos e suporte</h1>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar ticket, cliente ou serviço"
                aria-label="Pesquisar tickets"
              />
            </div>
            <div className="view-switch">
              <button
                className={view === "team" ? "selected" : ""}
                type="button"
                onClick={() => setView("team")}
              >
                Equipa
              </button>
              <button
                className={view === "client" ? "selected" : ""}
                type="button"
                onClick={() => setView("client")}
              >
                Cliente
              </button>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={18} />
              Novo pedido
            </button>
          </div>
        </header>

        <section className="metric-grid" id="dashboard" aria-label="Métricas de suporte">
          <MetricCard
            label="Tickets abertos"
            value={String(metrics.open)}
            hint="Pedidos ainda não resolvidos"
            icon={<Inbox size={20} />}
          />
          <MetricCard
            label="Urgentes"
            value={String(metrics.urgent)}
            hint="Prioridade crítica"
            icon={<AlertCircle size={20} />}
          />
          <MetricCard
            label="Resposta média"
            value={`${metrics.averageResponse} min`}
            hint="Primeira resposta"
            icon={<Clock3 size={20} />}
          />
          <MetricCard
            label="Resolvidos"
            value={String(metrics.resolved)}
            hint="Fechados no período"
            icon={<CheckCircle2 size={20} />}
          />
        </section>

        <section className="status-board">
          {statusOrder.map((status) => {
            const count = tickets.filter((ticket) => ticket.status === status).length;
            return (
              <button
                className={`status-card ${activeStatus === status ? "selected" : ""}`}
                type="button"
                key={status}
                onClick={() => setActiveStatus(activeStatus === status ? "all" : status)}
              >
                <span className={`status-dot ${status}`} />
                <strong>{statusLabels[status]}</strong>
                <span>{count}</span>
              </button>
            );
          })}
        </section>

        <section className="workspace-grid">
          <div className="tickets-panel">
            <div className="panel-heading">
              <div>
                <h2>{view === "team" ? "Fila de suporte" : "Os meus pedidos"}</h2>
                <p>{filteredTickets.length} tickets encontrados</p>
              </div>
              <button className="ghost-button" type="button">
                <SlidersHorizontal size={16} />
                Filtros
              </button>
            </div>

            <div className="ticket-list">
              {filteredTickets.map((ticket) => (
                <button
                  className={`ticket-card ${
                    selectedTicket.id === ticket.id ? "selected" : ""
                  }`}
                  type="button"
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="ticket-main">
                    <span className="ticket-id">{ticket.id}</span>
                    <strong>{ticket.subject}</strong>
                    <p>{ticket.client} · {ticket.service}</p>
                  </div>
                  <div className="ticket-meta">
                    <span className={`priority ${ticket.priority}`}>
                      {priorityLabels[ticket.priority]}
                    </span>
                    <span className={`status-pill ${ticket.status}`}>
                      {statusLabels[ticket.status]}
                    </span>
                    <span className={`sla-pill ${getSlaState(ticket)}`}>
                      {getSlaLabel(ticket)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="detail-panel" id="detalhe">
            <div className="detail-head">
              <div className="avatar">{initials(selectedTicket.client)}</div>
              <div>
                <p className="eyebrow">Ticket ativo</p>
                <h2>{selectedTicket.subject}</h2>
                <span>{selectedTicket.id} · {selectedTicket.client}</span>
              </div>
            </div>

            <div className="detail-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => advanceStatus(selectedTicket.id)}
              >
                Avançar estado
              </button>
              <a className="secondary-link" href={`mailto:${selectedTicket.contact}`}>
                <Mail size={16} />
                Contactar
              </a>
            </div>

            <dl className="ticket-facts">
              <div>
                <dt>Estado</dt>
                <dd>{statusLabels[selectedTicket.status]}</dd>
              </div>
              <div>
                <dt>Prioridade</dt>
                <dd>{priorityLabels[selectedTicket.priority]}</dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>{selectedTicket.owner}</dd>
              </div>
              <div>
                <dt>Canal</dt>
                <dd>{selectedTicket.channel}</dd>
              </div>
              <div>
                <dt>SLA</dt>
                <dd>
                  <span className={`sla-pill ${selectedSlaState}`}>
                    {getSlaLabel(selectedTicket)}
                  </span>
                </dd>
              </div>
            </dl>

            <section className="detail-section">
              <h3>Descrição</h3>
              <p>{selectedTicket.description}</p>
            </section>

            <section className="detail-section">
              <h3>Anexos</h3>
              <div className="attachment-list">
                {selectedTicket.attachments.length > 0 ? (
                  selectedTicket.attachments.map((attachment) => (
                    <span key={attachment}>
                      <Paperclip size={14} />
                      {attachment}
                    </span>
                  ))
                ) : (
                  <p className="muted">Sem anexos.</p>
                )}
              </div>
            </section>

            <section className="detail-section">
              <h3>Conversa</h3>
              <div className="message-list">
                {selectedTicket.messages.map((message) => (
                  <article className={`message ${message.role}`} key={`${message.author}-${message.time}`}>
                    <strong>{message.author}</strong>
                    <span>{message.time}</span>
                    <p>{message.body}</p>
                  </article>
                ))}
              </div>
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  addReply(selectedTicket.id, new FormData(event.currentTarget));
                  event.currentTarget.reset();
                }}
              >
                <textarea
                  name="reply"
                  rows={3}
                  placeholder={
                    view === "team"
                      ? "Escrever resposta ao cliente"
                      : "Responder à equipa"
                  }
                  required
                />
                <button className="primary-button" type="submit">
                  <Send size={16} />
                  Enviar resposta
                </button>
              </form>
            </section>

            <section className="detail-section" id="notas">
              <h3>Notas internas</h3>
              <ul className="note-list">
                {selectedTicket.internalNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <form
                className="inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  addInternalNote(selectedTicket.id, new FormData(event.currentTarget));
                  event.currentTarget.reset();
                }}
              >
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Adicionar nota interna"
                  required
                />
                <button className="ghost-button" type="submit">
                  <ShieldCheck size={16} />
                  Guardar nota
                </button>
              </form>
            </section>
          </aside>
        </section>

        <section className="client-portal" id="cliente">
          <div>
            <p className="eyebrow">Portal cliente</p>
            <h2>Experiência do cliente</h2>
            <p>
              O cliente acompanha pedidos, respostas, anexos e estados sem
              depender de emails soltos.
            </p>
          </div>
          <div className="portal-cards">
            <article>
              <Users size={20} />
              <strong>Pedidos centralizados</strong>
              <span>Histórico completo por cliente.</span>
            </article>
            <article>
              <FileText size={20} />
              <strong>Anexos e contexto</strong>
              <span>Ficheiros, logs e notas no mesmo pedido.</span>
            </article>
            <article>
              <Send size={20} />
              <strong>Atualizações claras</strong>
              <span>Estados visíveis e próximo passo definido.</span>
            </article>
          </div>
        </section>
      </main>

      {createOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form
            className="ticket-modal"
            onSubmit={(event) => {
              event.preventDefault();
              createTicket(new FormData(event.currentTarget));
            }}
          >
            <div className="modal-head">
              <div>
                <p className="eyebrow">Portal cliente</p>
                <h2>Novo pedido</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            <label>
              Assunto
              <input name="subject" placeholder="Ex: Erro no relatório mensal" required />
            </label>
            <label>
              Prioridade
              <select name="priority" defaultValue="normal">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </label>
            <label>
              Descrição
              <textarea
                name="description"
                placeholder="Descreva o pedido com o máximo de contexto possível"
                rows={5}
                required
              />
            </label>
            <button className="primary-button full" type="submit">
              <Send size={18} />
              Enviar pedido
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}
