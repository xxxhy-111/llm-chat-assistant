<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type KnowledgeDoc } from '@/lib/api';
import {
  ArrowLeft,
  Upload,
  Trash2,
  FileText,
  Search,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const documents = ref<KnowledgeDoc[]>([]);
const totalChunks = ref(0);
const loading = ref(true);
const uploading = ref(false);
const uploadProgress = ref('');
const searchQuery = ref('');
const searchResults = ref<any[]>([]);
const searching = ref(false);
const message = ref({ type: '', text: '' });

const loadDocuments = async () => {
  loading.value = true;
  const res = await api.knowledge.list();
  if (res.success) {
    documents.value = res.documents || [];
    totalChunks.value = res.total_chunks || 0;
  }
  loading.value = false;
};

const handleFileUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return;

  uploading.value = true;
  uploadProgress.value = '正在上传并处理文档...';
  message.value = { type: '', text: '' };

  try {
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadProgress.value = `正在处理 ${i + 1}/${files.length}: ${file.name}`;
      const res = await api.knowledge.upload(file);
      if (res.success) {
        successCount++;
      }
    }
    message.value = { type: 'success', text: `成功上传 ${successCount} 个文档` };
    loadDocuments();
  } catch (error) {
    message.value = { type: 'error', text: '上传失败，请检查 API Key 配置' };
  } finally {
    uploading.value = false;
    uploadProgress.value = '';
    input.value = '';
    setTimeout(() => {
      message.value = { type: '', text: '' };
    }, 3000);
  }
};

const deleteDoc = async (docId: string) => {
  if (!confirm('确定要删除这个文档吗？')) return;
  await api.knowledge.delete(docId);
  loadDocuments();
};

const clearAll = async () => {
  if (!confirm('确定要清空整个知识库吗？此操作不可撤销！')) return;
  await api.knowledge.clear();
  loadDocuments();
};

const searchKnowledge = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  searching.value = true;
  try {
    const res = await api.knowledge.search(searchQuery.value);
    if (res.success) {
      searchResults.value = res.results || [];
    }
  } catch (e) {
    searchResults.value = [];
  }
  searching.value = false;
};

onMounted(loadDocuments);
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
    <header class="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/chat')"
            class="flex items-center gap-2 text-slate-600 hover:text-violet-600 transition-colors"
          >
            <ArrowLeft :size="20" />
            <span class="hidden sm:inline">返回对话</span>
          </button>
          <div class="h-6 w-px bg-slate-200"></div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <BookOpen :size="20" class="text-white" />
            </div>
            <div>
              <h1 class="font-bold text-slate-800">知识库管理</h1>
              <p class="text-xs text-slate-500">{{ documents.length }} 个文档 · {{ totalChunks }} 个片段</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 py-8">
      <div v-if="message.text" :class="[
        'mb-6 p-4 rounded-xl flex items-center gap-3',
        message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
      ]">
        <CheckCircle v-if="message.type === 'success'" :size="20" />
        <AlertCircle v-else :size="20" />
        {{ message.text }}
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">上传文档</h2>
        <div class="relative">
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.py,.js,.ts,.json,.csv,.html,.css"
            @change="handleFileUpload"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            :disabled="uploading"
          />
          <div :class="[
            'border-2 border-dashed rounded-2xl p-12 text-center transition-all',
            uploading ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-violet-400 hover:bg-violet-50'
          ]">
            <div v-if="uploading" class="flex flex-col items-center">
              <Loader2 :size="48" class="text-violet-500 animate-spin mb-4" />
              <p class="text-slate-700 font-medium">{{ uploadProgress }}</p>
            </div>
            <div v-else>
              <div class="w-16 h-16 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload :size="28" class="text-violet-600" />
              </div>
              <p class="text-slate-700 font-medium mb-1">点击或拖拽文件到此处上传</p>
              <p class="text-sm text-slate-500">支持 PDF、TXT、Markdown、代码文件等多种格式</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">检索测试</h2>
        <div class="flex gap-3 mb-4">
          <div class="relative flex-1">
            <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              @keyup.enter="searchKnowledge"
              type="text"
              placeholder="输入问题测试语义检索..."
              class="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <button
            @click="searchKnowledge"
            :disabled="searching"
            class="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-xl shadow-lg shadow-violet-500/30 hover:shadow-xl transition-all disabled:opacity-50"
          >
            <Loader2 v-if="searching" :size="18" class="animate-spin" />
            <span v-else>检索</span>
          </button>
        </div>
        <div v-if="searchResults.length > 0" class="space-y-3">
          <div
            v-for="(result, idx) in searchResults"
            :key="idx"
            class="p-4 bg-slate-50 rounded-xl border border-slate-100"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-violet-700">
                📄 {{ result.filename }}
              </span>
              <span class="text-xs text-slate-500">
                相关度: {{ (result.score * 100).toFixed(1) }}%
              </span>
            </div>
            <p class="text-sm text-slate-600 line-clamp-3">{{ result.text }}</p>
          </div>
        </div>
        <div v-else-if="searchQuery && !searching" class="text-center py-8 text-slate-400">
          未找到匹配的文档片段
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-slate-800">文档列表</h2>
          <button
            v-if="documents.length > 0"
            @click="clearAll"
            class="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 :size="14" />
            清空全部
          </button>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 :size="32" class="text-violet-500 animate-spin" />
        </div>

        <div v-else-if="documents.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText :size="28" class="text-slate-400" />
          </div>
          <p class="text-slate-500">暂无文档，上传文档开始构建知识库</p>
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="doc in documents"
            :key="doc.doc_id"
            class="flex items-center justify-between py-4 group"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <FileText :size="18" class="text-blue-600" />
              </div>
              <div>
                <h3 class="font-medium text-slate-800">{{ doc.filename }}</h3>
                <p class="text-xs text-slate-500">{{ doc.chunk_count }} 个片段 · {{ doc.created_at?.split('T')[0] || '' }}</p>
              </div>
            </div>
            <button
              @click="deleteDoc(doc.doc_id)"
              class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
