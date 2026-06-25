import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import ChatPage from '@/pages/ChatPage.vue';
import KnowledgePage from '@/pages/KnowledgePage.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/chat',
  },
  {
    path: '/chat/:sessionId?',
    name: 'chat',
    component: ChatPage,
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: KnowledgePage,
  },
];

const router = createRouter({
  history: createWebHistory('/llm-chat-assistant/'),
  routes,
});

export default router;
