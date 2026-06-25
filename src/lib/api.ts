export interface Role {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface Session {
  id: string;
  title: string;
  role: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

export interface KnowledgeDoc {
  doc_id: string;
  filename: string;
  chunk_count: number;
  created_at: string;
}

const API_BASE = '/api';

export const api = {
  health: () => fetch(`${API_BASE}/health`).then(r => r.json()),

  roles: {
    list: (): Promise<{ success: boolean; roles: Role[] }> =>
      fetch(`${API_BASE}/roles`).then(r => r.json()),
  },

  sessions: {
    list: (): Promise<{ success: boolean; sessions: Session[] }> =>
      fetch(`${API_BASE}/sessions`).then(r => r.json()),
    get: (id: string): Promise<{ success: boolean; session: any }> =>
      fetch(`${API_BASE}/sessions/${id}`).then(r => r.json()),
    create: (title: string = '新对话', role: string = 'general') =>
      fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, role }),
      }).then(r => r.json()),
    delete: (id: string) =>
      fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' }).then(r => r.json()),
  },

  chat: {
    send: async (
      message: string,
      sessionId: string | null,
      role: string,
      useRag: boolean,
      kbName: string = 'default',
      onToken: (token: string) => void,
      onContext: (context: string) => void,
      onDone: (sessionId: string) => void,
    ) => {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          role,
          use_rag: useRag,
          kb_name: kbName,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          try {
            const data = JSON.parse(dataStr);
            if (data.type === 'token') {
              onToken(data.content);
            } else if (data.type === 'context') {
              onContext(data.content);
            } else if (data.type === 'done') {
              onDone(data.session_id);
            }
          } catch (e) {
          }
        }
      }
    },
  },

  knowledge: {
    list: (kbName: string = 'default'): Promise<{ success: boolean; documents: KnowledgeDoc[]; total_chunks: number }> =>
      fetch(`${API_BASE}/knowledge?kb_name=${kbName}`).then(r => r.json()),
    upload: (file: File, kbName: string = 'default') => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`${API_BASE}/knowledge/upload?kb_name=${kbName}`, {
        method: 'POST',
        body: formData,
      }).then(r => r.json());
    },
    delete: (docId: string, kbName: string = 'default') =>
      fetch(`${API_BASE}/knowledge/${docId}?kb_name=${kbName}`, { method: 'DELETE' }).then(r => r.json()),
    clear: (kbName: string = 'default') =>
      fetch(`${API_BASE}/knowledge/clear?kb_name=${kbName}`, { method: 'POST' }).then(r => r.json()),
    search: (query: string, kbName: string = 'default', topK: number = 5) =>
      fetch(`${API_BASE}/knowledge/search?query=${encodeURIComponent(query)}&kb_name=${kbName}&top_k=${topK}`).then(r => r.json()),
  },

  config: {
    get: () => fetch(`${API_BASE}/config`).then(r => r.json()),
  },
};
