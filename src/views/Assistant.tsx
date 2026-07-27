import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Plus, Trash2, Sparkles, Brain, Lightbulb, Calendar,
  CheckSquare, Target, BookOpen, MessageSquare, User,
} from 'lucide-react';
import {
  addMessage, createConversation, deleteConversation, getConversations,
  getMessages, renameConversation, touchConversation,
} from '@/lib/api';
import { generateReply, generateTitle } from '@/lib/ai';
import { useToast } from '@/lib/toast';
import type { AiConversation, AiMessage } from '@/lib/types';

const SUGGESTIONS = [
  { icon: Sparkles, text: 'What should I work on today?' },
  { icon: CheckSquare, text: 'What did I accomplish this week?' },
  { icon: Calendar, text: 'Generate tomorrow\'s schedule' },
  { icon: Brain, text: 'What am I forgetting?' },
  { icon: BookOpen, text: 'Show everything related to PoaBiz' },
  { icon: Target, text: 'How are my goals progressing?' },
];

export function Assistant({ presetQuery }: { presetQuery?: string | null }) {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId]);

  useEffect(() => {
    if (presetQuery) {
      if (!activeId) {
        startNewConversation(presetQuery);
      } else {
        send(presetQuery);
      }
    }
  }, [presetQuery]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function loadConversations() {
    const { data } = await getConversations();
    if (data) {
      setConversations(data);
      if (data.length && !activeId) setActiveId(data[0].id);
    }
  }

  async function loadMessages(id: string) {
    const { data } = await getMessages(id);
    if (data) setMessages(data);
  }

  async function startNewConversation(firstMessage?: string) {
    const { data, error } = await createConversation('New Conversation');
    if (error || !data) { toast.error('Could not start conversation'); return; }
    await loadConversations();
    setActiveId(data.id);
    setMessages([]);
    if (firstMessage) send(firstMessage, data.id);
  }

  async function send(text: string, convId?: string) {
    const content = text.trim();
    if (!content || thinking) return;
    const cid = convId ?? activeId;
    if (!cid) return;

    const optimistic: AiMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: cid,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput('');
    setThinking(true);

    const { data: saved } = await addMessage(cid, 'user', content);
    if (saved && messages.length === 0) {
      const title = await generateTitle(content);
      await renameConversation(cid, title);
      loadConversations();
    }

    const reply = await generateReply(content, messages);

    setThinking(false);
    await addMessage(cid, 'assistant', reply);
    await touchConversation(cid);
    setMessages((m) => [
      ...m.filter((m2) => m2.id !== optimistic.id),
      { ...optimistic, id: saved?.id ?? optimistic.id, role: 'user' as const },
      {
        id: 'a-' + Date.now(),
        conversation_id: cid,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  async function removeConversation(id: string) {
    await deleteConversation(id);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConversations();
    toast.success('Conversation deleted');
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation list */}
      <div className="w-64 shrink-0 border-r border-slate-200/60 dark:border-slate-800/60 hidden sm:flex flex-col">
        <div className="p-3">
          <button onClick={() => startNewConversation()} className="btn-primary w-full">
            <Plus size={16} /> New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition
                ${activeId === c.id ? 'bg-accent-500/10 text-accent-600 dark:text-accent-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'}`}
              onClick={() => setActiveId(c.id)}
            >
              <MessageSquare size={15} className="shrink-0 opacity-60" />
              <span className="text-sm truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeConversation(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-6 text-center">No conversations yet.</p>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="size-16 rounded-2xl bg-accent-500/10 text-accent-500 grid place-items-center mx-auto mb-5">
                  <Bot size={32} />
                </div>
                <h2 className="font-display font-bold text-2xl mb-2">Your Life OS Assistant</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                  I can see your tasks, habits, calendar, goals, projects, notes, and journal.
                  Ask me to plan your day, summarize your week, or search your history.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SUGGESTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.text}
                        onClick={() => send(s.text)}
                        className="card p-3.5 text-left hover:border-accent-500/40 hover:shadow-glow transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className="text-accent-500 shrink-0" />
                          <span className="text-sm font-medium">{s.text}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((m) => (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
                ))}
                {thinking && (
                  <div className="flex gap-3">
                    <div className="size-8 rounded-xl bg-accent-500/10 text-accent-500 grid place-items-center shrink-0">
                      <Bot size={16} />
                    </div>
                    <div className="flex items-center gap-1.5 pt-2.5">
                      <span className="size-2 rounded-full bg-accent-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="size-2 rounded-full bg-accent-500/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="size-2 rounded-full bg-accent-500/60 animate-bounce" style={{ animationDelay: '240ms' }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="card flex items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-accent-500/40 transition">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                rows={1}
                placeholder="Ask anything about your life…"
                className="flex-1 bg-transparent outline-none resize-none text-sm px-2 py-2 max-h-32"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || thinking}
                className="btn-primary !p-2.5 !rounded-xl shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              The assistant reads your data locally — your information never leaves your Life OS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`size-8 rounded-xl grid place-items-center shrink-0
        ${isUser ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-accent-500/10 text-accent-500'}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line
        ${isUser ? 'bg-accent-600 text-white' : 'card'}`}>
        {content}
      </div>
    </motion.div>
  );
}
