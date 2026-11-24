import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Bot, Send, Sparkles, MessageSquare, Plus, Trash2, 
  FileText, Shield, ArrowRight, User
} from 'lucide-react';

const SUGGESTIONS = [
  'Which products have warranties expiring this month?',
  'What is the total amount I have spent on all my purchases?',
  'Summarize my repair history and costs',
  'Do I have any active coverage for electronics?'
];

export default function AiChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await api.get('/ai/conversations');
      if (res.data.success) {
        const list = res.data.data.conversations || [];
        setConversations(list);
        if (list.length > 0 && !activeConvId) {
          setActiveConvId(list[0]._id);
        }
      }
    } catch (err) {
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoadingConv(false);
    }
  };

  const fetchMessages = async (convId) => {
    if (!convId) return;
    try {
      const res = await api.get(`/ai/conversations/${convId}/messages`);
      if (res.data.success) {
        setMessages(res.data.data.messages || []);
      }
    } catch (err) {
      showToast('Failed to load messages', 'error');
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleStartNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || sending) return;

    const userText = inputQuery.trim();
    setInputQuery('');

    // Optimistically append user message
    const tempUserMsg = {
      _id: Date.now().toString(),
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await api.post('/integrations/n8n/ai-chat', {
        query: userText,
        conversationId: activeConvId
      });

      if (res.data.success) {
        const { answer, sources, conversationId } = res.data.data;
        if (!activeConvId) {
          setActiveConvId(conversationId);
          fetchConversations();
        }

        const assistantMsg = {
          _id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: answer,
          sources: sources || [],
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'AI request failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/conversations/${convId}`);
      showToast('Conversation deleted', 'success');
      const updated = conversations.filter(c => c._id !== convId);
      setConversations(updated);
      if (activeConvId === convId) {
        setActiveConvId(updated.length > 0 ? updated[0]._id : null);
      }
    } catch (err) {
      showToast('Failed to delete conversation', 'error');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar: Conversation history */}
      <div className="w-80 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between hidden md:flex shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              ProofNest AI
            </h2>
            <button
              onClick={handleStartNewChat}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-400 p-2 text-center">No past chats yet</p>
            ) : (
              conversations.map(c => (
                <div
                  key={c._id}
                  onClick={() => setActiveConvId(c._id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-semibold transition group ${
                    activeConvId === c._id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.title || 'Conversation'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(c._id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400">
          Powered by OpenRouter LLM + Atlas Vector/Hybrid Search
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl flex flex-col shadow-sm overflow-hidden">
        
        {/* Messages View */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Ask Anything About Your Purchases</h3>
              <p className="text-xs text-gray-500 mt-1 mb-6">
                ProofNest AI indexes your receipts, warranty terms, and repair history to answer grounded questions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputQuery(s);
                    }}
                    className="p-3 bg-gray-50 hover:bg-indigo-50/70 border border-gray-200 hover:border-indigo-200 rounded-xl text-xs font-semibold text-gray-700 transition"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg._id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl rounded-2xl p-4 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-gray-50 border border-gray-200 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Sources badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200/60">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                        Referenced Sources:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-gray-200 text-indigo-700"
                          >
                            <FileText className="w-3 h-3 text-indigo-500" />
                            {src.title || src.documentTitle || 'Document'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex gap-3 items-center text-xs text-gray-400">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <span className="font-medium animate-pulse">Analyzing vault documents & querying LLM...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white flex gap-2">
          <input
            type="text"
            placeholder="Ask about your warranties, repairs, receipts..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || sending}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
