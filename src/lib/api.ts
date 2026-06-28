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
const DEMO_MODE = true;

const mockRoles = [
  { key: 'general', name: '通用助手', description: '一个有帮助的AI助手', icon: '🤖' },
  { key: 'programmer', name: '程序员', description: '擅长编程和技术问题', icon: '💻' },
  { key: 'teacher', name: '老师', description: '耐心解答学习问题', icon: '📚' },
  { key: 'writer', name: '写作助手', description: '帮助写作和润色文章', icon: '✍️' },
  { key: 'translator', name: '翻译官', description: '多语言翻译专家', icon: '🌍' },
  { key: 'interviewer', name: '面试官', description: '模拟技术面试', icon: '🎯' },
  { key: 'doctor', name: '健康顾问', description: '提供健康建议', icon: '🏥' },
];

const mockSessions = [
  { id: 's1', title: '新对话', role: 'general', message_count: 3, created_at: '2024-02-20 10:30', updated_at: '2024-02-20 10:35' },
  { id: 's2', title: 'Python学习', role: 'programmer', message_count: 5, created_at: '2024-02-19 14:00', updated_at: '2024-02-19 14:20' },
  { id: 's3', title: '简历修改', role: 'writer', message_count: 2, created_at: '2024-02-18 09:00', updated_at: '2024-02-18 09:15' },
];

const mockDocs = [
  { doc_id: 'd1', filename: '公司制度手册.txt', chunk_count: 15, created_at: '2024-02-15' },
  { doc_id: 'd2', filename: '产品需求文档.pdf', chunk_count: 23, created_at: '2024-02-16' },
];

const mockResponses: Record<string, string> = {
  general: '你好！我是你的AI助手。我可以帮你回答问题、写作、编程、学习等各种任务。有什么我可以帮你的吗？',
  programmer: '你好！我是程序员助手，可以帮你解决编程问题、调试代码、解释算法等。请问有什么技术问题？',
  teacher: '你好！我是你的学习助手，可以帮你解答各种学习上的疑问。想学习什么内容呢？',
  writer: '你好！我是写作助手，可以帮你写文章、改简历、写邮件、润色文字等。需要写点什么？',
  translator: '你好！我是翻译官，支持中英日韩等多种语言互译。请输入要翻译的内容。',
  interviewer: '你好！我是你的模拟面试官。我们来一场技术面试吧，先做个自我介绍？',
  doctor: '你好！我是健康顾问，可以提供一些健康建议。注意：不能替代专业医生诊断。',
};

async function fetchWithFallback(url: string, options: RequestInit = {}): Promise<any> {
  try {
    const res = await fetch(url, options);
    return await res.json();
  } catch (e) {
    if (DEMO_MODE) return null;
    throw e;
  }
}

export const api = {
  health: async () => {
    const res = await fetchWithFallback(`${API_BASE}/health`);
    if (res) return res;
    return { success: true, message: 'ok (demo)' };
  },

  roles: {
    list: async (): Promise<{ success: boolean; roles: Role[] }> => {
      const res = await fetchWithFallback(`${API_BASE}/roles`);
      if (res) return res;
      return { success: true, roles: mockRoles };
    },
  },

  sessions: {
    list: async (): Promise<{ success: boolean; sessions: Session[] }> => {
      const res = await fetchWithFallback(`${API_BASE}/sessions`);
      if (res) return res;
      return { success: true, sessions: mockSessions };
    },
    get: async (id: string): Promise<{ success: boolean; session: any }> => {
      const res = await fetchWithFallback(`${API_BASE}/sessions/${id}`);
      if (res) return res;
      return {
        success: true,
        session: {
          id,
          title: '新对话',
          role: 'general',
          messages: [
            { role: 'user', content: '你好', timestamp: '2024-02-20 10:30' },
            { role: 'assistant', content: mockResponses['general'], timestamp: '2024-02-20 10:31' },
          ],
        },
      };
    },
    create: async (title: string = '新对话', role: string = 'general') => {
      const res = await fetchWithFallback(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, role }),
      });
      if (res) return res;
      return { success: true, session: { id: 's' + Date.now(), title, role, message_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } };
    },
    delete: async (id: string) => {
      const res = await fetchWithFallback(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
      if (res) return res;
      return { success: true };
    },
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
      try {
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
        // 如果响应不成功（404/500等），进入演示模式
        if (!response.ok || DEMO_MODE) {
          throw new Error('API not available');
        }
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
      } catch (e) {
        if (DEMO_MODE) {
          if (useRag) {
            onContext('📄 公司制度手册.txt (相关度: 0.85)\n📄 产品需求文档.pdf (相关度: 0.72)');
          }
          const reply = mockResponses[role] || mockResponses['general'];
          const fullReply = `[演示模式] ${reply}\n\n你问的是："${message}"`;
          for (let i = 0; i < fullReply.length; i++) {
            await new Promise(r => setTimeout(r, 30));
            onToken(fullReply[i]);
          }
          onDone(sessionId || 'demo');
        }
      }
    },
  },

  knowledge: {
    list: async (kbName: string = 'default'): Promise<{ success: boolean; documents: KnowledgeDoc[]; total_chunks: number }> => {
      const res = await fetchWithFallback(`${API_BASE}/knowledge?kb_name=${kbName}`);
      if (res) return res;
      return { success: true, documents: mockDocs, total_chunks: 38 };
    },
    upload: async (file: File, kbName: string = 'default') => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetchWithFallback(`${API_BASE}/knowledge/upload?kb_name=${kbName}`, {
        method: 'POST',
        body: formData,
      });
      if (res) return res;
      return { success: true, doc_id: 'd' + Date.now(), filename: file.name, chunk_count: 10 };
    },
    delete: async (docId: string, kbName: string = 'default') => {
      const res = await fetchWithFallback(`${API_BASE}/knowledge/${docId}?kb_name=${kbName}`, { method: 'DELETE' });
      if (res) return res;
      return { success: true };
    },
    clear: async (kbName: string = 'default') => {
      const res = await fetchWithFallback(`${API_BASE}/knowledge/clear?kb_name=${kbName}`, { method: 'POST' });
      if (res) return res;
      return { success: true };
    },
    search: async (query: string, kbName: string = 'default', topK: number = 5) => {
      const res = await fetchWithFallback(`${API_BASE}/knowledge/search?query=${encodeURIComponent(query)}&kb_name=${kbName}&top_k=${topK}`);
      if (res) return res;
      return {
        success: true,
        results: [
          { text: '这是一段示例文档内容，包含与查询相关的信息。', filename: '示例文档.txt', score: 0.85 },
          { text: '另一段相关的文档片段。', filename: '示例文档.txt', score: 0.72 },
        ],
      };
    },
  },

  config: {
    get: async () => {
      const res = await fetchWithFallback(`${API_BASE}/config`);
      if (res) return res;
      return {
        success: true,
        config: {
          llm_model: 'demo-mode',
          embedding_model: 'demo',
          has_api_key: false,
          mock_mode: true,
          embedding_mock_mode: true,
        },
      };
    },
  },
};
