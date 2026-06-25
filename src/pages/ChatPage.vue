<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, type Role, type Session } from '@/lib/api';
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  BookOpen,
  Settings,
  Sparkles,
  Bot,
  User,
  Menu,
  X,
  ChevronRight,
  Brain,
  Loader2,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const sessions = ref<Session[]>([]);
const roles = ref<Role[]>([]);
const currentSessionId = ref<string | null>(null);
const currentRole = ref<string>('general');
const useRag = ref<boolean>(false);
const inputMessage = ref('');
const isStreaming = ref(false);
const messages = ref<{ role: string; content: string; context?: string }[]>([]);
const currentAssistantMessage = ref('');
const currentContext = ref('');
const sidebarOpen = ref(true);
const settingsOpen = ref(false);

const currentRoleInfo = computed(() => roles.value.find((r) => r.key === currentRole.value));

const loadSessions = async () => {
  const res = await api.sessions.list();
  if (res.success) {
    sessions.value = res.sessions;
  }
};

const loadRoles = async () => {
  const res = await api.roles.list();
  if (res.success) {
    roles.value = res.roles;
  }
};

const createNewSession = async () => {
  const res = await api.sessions.create('新对话', currentRole.value);
  if (res.success) {
    messages.value = [];
    currentAssistantMessage.value = '';
    currentContext.value = '';
    currentSessionId.value = res.session.id;
    router.push(`/chat/${res.session.id}`);
    loadSessions();
  }
};

const selectSession = async (session: Session) => {
  currentSessionId.value = session.id;
  currentRole.value = session.role;
  router.push(`/chat/${session.id}`);
  messages.value = [];
  currentAssistantMessage.value = '';
  currentContext.value = '';

  const res = await api.sessions.get(session.id);
  if (res.success && res.session?.messages) {
    messages.value = res.session.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));
  }
  scrollToBottom();
};

const deleteSession = async (sessionId: string, e?: Event) => {
  e?.stopPropagation();
  if (!confirm('确定要删除这个会话吗？')) return;
  await api.sessions.delete(sessionId);
  if (currentSessionId.value === sessionId) {
    currentSessionId.value = null;
    messages.value = [];
    router.push('/chat');
  }
  loadSessions();
};

const sendMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text || isStreaming.value) return;

  inputMessage.value = '';
  isStreaming.value = true;
  currentAssistantMessage.value = '';
  currentContext.value = '';

  messages.value.push({ role: 'user', content: text });
  scrollToBottom();

  messages.value.push({ role: 'assistant', content: '', context: '' });

  try {
    await api.chat.send(
      text,
      currentSessionId.value,
      currentRole.value,
      useRag.value,
      'default',
      (token) => {
        currentAssistantMessage.value += token;
        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = currentAssistantMessage.value;
        }
        scrollToBottom();
      },
      (context) => {
        currentContext.value = context;
        const lastMsg = messages.value[messages.value.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.context = context;
        }
      },
      (sessionId) => {
        currentSessionId.value = sessionId;
        router.push(`/chat/${sessionId}`);
        loadSessions();
      },
    );
  } catch (error) {
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = '❌ 抱歉，发生了错误，请稍后重试。';
    }
  } finally {
    isStreaming.value = false;
    currentAssistantMessage.value = '';
    currentContext.value = '';
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    const el = document.getElementById('messages-container');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

const selectRole = (roleKey: string) => {
  currentRole.value = roleKey;
  settingsOpen.value = false;
};

onMounted(async () => {
  await loadRoles();
  await loadSessions();

  const sessionId = route.params.sessionId as string;
  if (sessionId) {
    selectSession({ id: sessionId, title: '', role: 'general', message_count: 0, created_at: '', updated_at: '' });
  }
});

watch(() => route.params.sessionId, (newId) => {
  if (newId && newId !== currentSessionId.value) {
    const session = sessions.value.find((s) => s.id === newId);
    if (session) {
      selectSession(session);
    }
  }
});
</script>

<template>
  <div class="h-screen flex bg-gradient-to-br from-slate-50 to-indigo-50">
    <aside
      :class="[
        'flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-20',
        sidebarOpen ? 'w-72' : 'w-0 -ml-0',
      ]"
    >
      <div class="p-4 border-b border-slate-100">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles :size="20" class="text-white" />
          </div>
          <div>
            <h1 class="font-bold text-slate-800">AI 对话助手</h1>
            <p class="text-xs text-slate-500">RAG Knowledge Base</p>
          </div>
        </div>
        <button
          @click="createNewSession"
          class="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <Plus :size="18" />
          新建对话
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3 space-y-1">
        <div
          v-for="session in sessions"
          :key="session.id"
          @click="selectSession(session)"
          :class="[
            'group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all',
            currentSessionId === session.id
              ? 'bg-violet-50 text-violet-700'
              : 'hover:bg-slate-50 text-slate-700',
          ]"
        >
          <MessageSquare :size="16" class="flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ session.title }}</p>
            <p class="text-xs text-slate-400">{{ session.message_count }} 条消息</p>
          </div>
          <button
            @click="deleteSession(session.id, $event)"
            class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 :size="14" />
          </button>
        </div>
        <div v-if="sessions.length === 0" class="text-center py-12 text-slate-400 text-sm">
          暂无历史会话
        </div>
      </div>

      <div class="p-3 border-t border-slate-100 space-y-1">
        <router-link
          to="/knowledge"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 transition-all"
        >
          <BookOpen :size="18" />
          <span class="text-sm font-medium">知识库管理</span>
          <ChevronRight :size="14" class="ml-auto text-slate-400" />
        </router-link>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu :size="20" class="text-slate-600" />
          </button>
          <div>
            <h2 class="font-semibold text-slate-800 flex items-center gap-2">
              <span class="text-2xl">{{ currentRoleInfo?.icon || '🤖' }}</span>
              {{ currentRoleInfo?.name || 'AI 助手' }}
            </h2>
            <p class="text-xs text-slate-500">{{ currentRoleInfo?.description }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <button
              @click="useRag = !useRag"
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                useRag
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ]"
            >
              <Brain :size="16" />
              <span class="hidden sm:inline">{{ useRag ? '知识库模式' : '普通模式' }}</span>
            </button>
          </div>
          <div class="relative">
            <button
              @click="settingsOpen = !settingsOpen"
              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings :size="20" class="text-slate-600" />
            </button>
            <div
              v-if="settingsOpen"
              class="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50"
            >
              <p class="text-sm font-semibold text-slate-700 px-3 py-2">选择角色</p>
              <div class="space-y-1">
                <button
                  v-for="role in roles"
                  :key="role.key"
                  @click="selectRole(role.key)"
                  :class="[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                    currentRole === role.key
                      ? 'bg-violet-50 text-violet-700'
                      : 'hover:bg-slate-50 text-slate-600',
                  ]"
                >
                  <span class="text-xl">{{ role.icon }}</span>
                  <div>
                    <p class="text-sm font-medium">{{ role.name }}</p>
                    <p class="text-xs text-slate-400">{{ role.description }}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div id="messages-container" class="flex-1 overflow-y-auto px-4 py-6">
        <div class="max-w-3xl mx-auto space-y-6">
          <div
            v-if="messages.length === 0"
            class="text-center py-16"
          >
            <div class="w-20 h-20 bg-gradient-to-br from-violet-400 to-fuchsia-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
              <Sparkles :size="36" class="text-white" />
            </div>
            <h3 class="text-2xl font-bold text-slate-800 mb-2">你好！</h3>
            <p class="text-slate-500 mb-8">
              我是您的 AI 助手，有什么可以帮您的？
            </p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
              <button
                v-for="(suggestion, idx) in ['帮我写一段 Python 代码', '解释一下什么是RAG', '写一封求职信', '推荐几本好书']"
                :key="idx"
                @click="inputMessage = suggestion; sendMessage()"
                class="p-4 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-md text-left transition-all group"
              >
                <p class="text-sm font-medium text-slate-700 group-hover:text-violet-700">
                  {{ suggestion }}
                </p>
              </button>
            </div>
          </div>

          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="[
              'flex gap-4',
              msg.role === 'user' ? 'flex-row-reverse' : '',
            ]"
          >
            <div
              :class="[
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                  : 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
              ]"
            >
              <User v-if="msg.role === 'user'" :size="18" class="text-white" />
              <Bot v-else :size="18" class="text-white" />
            </div>
            <div :class="['max-w-[80%]', msg.role === 'user' ? 'text-right' : '']">
              <div
                v-if="msg.context"
                class="mb-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 text-left"
              >
                <p class="font-medium mb-1 flex items-center gap-1">
                  <BookOpen :size="12" />
                  参考资料:
                </p>
                <pre class="whitespace-pre-wrap font-sans">{{ msg.context }}</pre>
              </div>
              <div
                :class="[
                  'inline-block px-5 py-3 rounded-2xl text-left',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-sm',
                ]"
              >
                <p class="whitespace-pre-wrap leading-relaxed">
                  {{ msg.content || (isStreaming && idx === messages.length - 1 ? '' : '') }}
                  <span
                    v-if="isStreaming && idx === messages.length - 1 && msg.role === 'assistant'"
                    class="inline-block w-2 h-5 bg-violet-500 rounded-full animate-pulse ml-1 align-middle"
                  ></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200">
        <div class="max-w-3xl mx-auto">
          <div class="relative flex items-end gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100 transition-all">
            <textarea
              v-model="inputMessage"
              @keydown="handleKeydown"
              :disabled="isStreaming"
              rows="1"
              placeholder="输入消息，按 Enter 发送..."
              class="flex-1 bg-transparent border-none outline-none resize-none py-2 px-3 text-slate-700 placeholder-slate-400 max-h-40"
            ></textarea>
            <button
              @click="sendMessage"
              :disabled="isStreaming || !inputMessage.trim()"
              :class="[
                'p-3 rounded-xl transition-all',
                isStreaming || !inputMessage.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:scale-105',
              ]"
            >
              <Loader2 v-if="isStreaming" :size="18" class="animate-spin" />
              <Send v-else :size="18" />
            </button>
          </div>
          <p class="text-xs text-center text-slate-400 mt-2">
            {{ useRag ? '🔍 知识库模式 - 基于本地文档回答' : '💬 普通对话模式' }} · AI 生成内容仅供参考
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
