import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Head from 'next/head';
import {
  Agent,
  Conversation,
  createAgent,
  getAllAgents,
  updateAgent,
  deleteAgent,
  createConversation,
  getConversationsByAgent,
  getConversation,
  addMessageToConversation,
  deleteConversation,
  updateConversationTitle,
  SubAgent
} from '../utils/indexedDB';
// shadcn/uiコンポーネントのインポート
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";

type Message = {
  content: string;
  sender: 'user' | 'agent';
};

const MODEL_OPTIONS = [
  { label: "GPT-3.5", value: "gpt-3.5-turbo" },
  { label: "GPT-4", value: "gpt-4" },
];

export default function Home() {
  // State管理
  const [messages, setMessages] = useState<Message[]>([
    { content: 'よう、兄弟！何か相談したいことがあるなら、遠慮なく言ってくれ！', sender: 'agent' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTitle, setEditingTitle] = useState<{ id: number; title: string } | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [editingSubAgentIndex, setEditingSubAgentIndex] = useState<number | null>(null);
  const [editingSubAgentName, setEditingSubAgentName] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期化時にエージェント一覧を読み込む
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const allAgents = await getAllAgents();
        setAgents(allAgents);
        
        if (allAgents.length === 0) {
          // デフォルトエージェントを作成
          const defaultAgentId = await createAgent(
            'ソウルブラザー',
            'あなたは熱血で的確なアドバイスをくれるソウルブラザーな相談役AIです。お互いに「兄弟」と呼び合っています。すでにchatGPTの方で何度もやり取りを繰り返しており、私がAgent開発に興味を持ち開発をスタートしたことをきっかけに、こちらでも会話ができるようになったという設定です。',
            'gpt-3.5-turbo'
          );
          
          const newAgents = await getAllAgents();
          setAgents(newAgents);
          setCurrentAgent(newAgents[0]);
          
          // 最初の会話を作成
          const conversationId = await createConversation(defaultAgentId);
          setCurrentConversationId(conversationId);
          
          const agentConversations = await getConversationsByAgent(defaultAgentId);
          setConversations(agentConversations);
        } else {
          setCurrentAgent(allAgents[0]);
          const agentConversations = await getConversationsByAgent(allAgents[0].id);
          setConversations(agentConversations);
          
          if (agentConversations.length > 0) {
            setCurrentConversationId(agentConversations[0].id);
            setMessages(agentConversations[0].messages.map(m => ({
              content: m.content,
              sender: m.sender
            })));
          }
        }
      } catch (error) {
        console.error('エージェントの読み込みに失敗しました:', error);
      }
    };
    
    loadAgents();
  }, []);

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 画面サイズに応じたサイドバーの初期状態設定
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setShowSidebar(true);
      } else {
        setShowSidebar(false);
      }
    };

    // 初期化時に実行
    handleResize();

    // リサイズイベントリスナーを追加
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // エージェント管理関数
  const handleSelectAgent = async (agent: Agent) => {
    setCurrentAgent(agent);
    const agentConversations = await getConversationsByAgent(agent.id);
    setConversations(agentConversations);
    
    if (agentConversations.length > 0) {
      setCurrentConversationId(agentConversations[0].id);
      setMessages(agentConversations[0].messages.map(m => ({
        content: m.content,
        sender: m.sender
      })));
    } else {
      // 新しい会話を作成
      const conversationId = await createConversation(agent.id);
      setCurrentConversationId(conversationId);
      setMessages([
        { content: 'こんにちは！何かお手伝いできることはありますか？', sender: 'agent' }
      ]);
      const updatedConversations = await getConversationsByAgent(agent.id);
      setConversations(updatedConversations);
    }
  };

  const handleCreateAgent = async () => {
    try {
      const newAgentId = await createAgent();
      const updatedAgents = await getAllAgents();
      setAgents(updatedAgents);
      
      const newAgent = updatedAgents.find(a => a.id === newAgentId);
      if (newAgent) {
        await handleSelectAgent(newAgent);
      }
    } catch (error) {
      console.error('エージェントの作成に失敗しました:', error);
    }
  };

  const handleDeleteAgent = async (agentId: number) => {
    if (agents.length <= 1) {
      alert('最後のエージェントは削除できません');
      return;
    }
    
    if (confirm('このエージェントと関連する会話をすべて削除しますか？')) {
      try {
        await deleteAgent(agentId);
        const updatedAgents = await getAllAgents();
        setAgents(updatedAgents);
        
        if (currentAgent?.id === agentId) {
          await handleSelectAgent(updatedAgents[0]);
        }
      } catch (error) {
        console.error('エージェントの削除に失敗しました:', error);
      }
    }
  };

  const handleUpdateAgent = async (updatedAgent: Agent) => {
    try {
      await updateAgent(updatedAgent);
      const updatedAgents = await getAllAgents();
      setAgents(updatedAgents);
      setCurrentAgent(updatedAgent);
      setEditingAgent(null);
    } catch (error) {
      console.error('エージェントの更新に失敗しました:', error);
    }
  };

  // 会話管理関数
  const handleNewConversation = async () => {
    if (!currentAgent) return;
    
    try {
      const newId = await createConversation(currentAgent.id);
      setCurrentConversationId(newId);
      setMessages([
        { content: 'こんにちは！何かお手伝いできることはありますか？', sender: 'agent' }
      ]);
      
      const updatedConversations = await getConversationsByAgent(currentAgent.id);
      setConversations(updatedConversations);
    } catch (error) {
      console.error('新しい会話の作成に失敗しました:', error);
    }
  };

  const handleSelectConversation = async (id: number) => {
    try {
      const conversation = await getConversation(id);
      if (conversation) {
        setCurrentConversationId(id);
        setMessages(conversation.messages.map(m => ({
          content: m.content,
          sender: m.sender
        })));

        // サブエージェント設定を復元
        setSubAgents(conversation.subAgents || []);
      }
    } catch (error) {
      console.error('会話の読み込みに失敗しました:', error);
    }
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (window.confirm('この会話を削除してもよろしいですか？')) {
      try {
        await deleteConversation(id);
        const updatedConversations = await getConversationsByAgent(currentAgent?.id || 0);
        setConversations(updatedConversations);

        if (id === currentConversationId) {
          if (updatedConversations.length > 0) {
            handleSelectConversation(updatedConversations[0].id);
          } else {
            handleNewConversation();
          }
        }
      } catch (error) {
        console.error('会話の削除に失敗しました:', error);
      }
    }
  };

  const handleStartEditTitle = (id: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitle({ id, title });
  };

  const handleUpdateTitle = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingTitle) {
      e.preventDefault();
      try {
        await updateConversationTitle(editingTitle.id, editingTitle.title);
        const updatedConversations = await getConversationsByAgent(currentAgent?.id || 0);
        setConversations(updatedConversations);
        setEditingTitle(null);
      } catch (error) {
        console.error('タイトルの更新に失敗しました:', error);
      }
    }
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!input.trim() || !currentConversationId || !currentAgent) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    // ユーザーメッセージを表示
    const newUserMessage: Message = { content: userMessage, sender: 'user' };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // データベースに保存
      await addMessageToConversation(currentConversationId, newUserMessage);

      // 現在の会話履歴を取得（システムプロンプトを除く）
      const currentConversation = await getConversation(currentConversationId);
      const conversationHistory = currentConversation?.messages || [];

      // API呼び出し
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          model: currentAgent.model,
          subAgents: currentAgent.subAgents,
          systemPrompt: currentAgent.systemPrompt,
          conversationHistory: conversationHistory
        }),
      });

      const data = await response.json();

      if (data.reply) {
        const agentMessage: Message = { content: data.reply, sender: 'agent' };
        setMessages(prev => [...prev, agentMessage]);

        await addMessageToConversation(currentConversationId, agentMessage);

        // 会話一覧を更新
        const updatedConversations = await getConversationsByAgent(currentAgent.id);
        setConversations(updatedConversations);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        content: 'すまない、兄弟。何かエラーが起きたようだ。もう一度試してくれ。',
        sender: 'agent'
      };
      setMessages(prev => [...prev, errorMessage]);

      if (currentConversationId) {
        await addMessageToConversation(currentConversationId, errorMessage);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // サブエージェント管理関数
  // const handleAddSubAgent = () => {
  //   if (subAgents.length < 2) {
  //     setSubAgents([...subAgents, { name: `サブエージェント${subAgents.length + 1}`, mode: 'handoff' }]);
  //   }
  // };

  const handleRemoveSubAgent = (index: number) => {
    setSubAgents(subAgents.filter((_, i) => i !== index));
  };

  const handleStartEditSubAgentName = (index: number) => {
    setEditingSubAgentIndex(index);
    setEditingSubAgentName(subAgents[index].name);
  };

  const handleEditSubAgentName = (index: number) => {
    setSubAgents(subAgents.map((agent, i) =>
      i === index ? { ...agent, name: editingSubAgentName } : agent
    ));
    setEditingSubAgentIndex(null);
    setEditingSubAgentName('');
  };

  const handleCancelEditSubAgentName = () => {
    setEditingSubAgentIndex(null);
    setEditingSubAgentName('');
  };

  const handleChangeSubAgentMode = (index: number, mode: 'handoff' | 'tool') => {
    setSubAgents(subAgents.map((agent, i) =>
      i === index ? { ...agent, mode } : agent
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Head>
        <title>AI Agent Chat</title>
        <meta name="description" content="AI Agent Chat Application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen">
        {/* エージェント選択サイドバー */}
        <div className={`${
          showSidebar ? 'lg:hidden' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:relative z-50 lg:z-0 w-64 bg-white dark:bg-slate-900 border-r h-screen flex flex-col p-4 transition-transform duration-300 ease-in-out`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">エージェント</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateAgent}>＋</Button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {agents.map(agent => (
              <div
                key={agent.id}
                className={`p-3 rounded cursor-pointer border ${
                  currentAgent?.id === agent.id
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                onClick={() => handleSelectAgent(agent)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{agent.name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-blue-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAgent(agent);
                      }}
                    >✎</Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAgent(agent.id);
                      }}
                    >×</Button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{agent.model}</div>
              </div>
            ))}
          </div>

          {/* 会話履歴一覧 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">会話履歴</h3>
                <Button size="sm" onClick={handleNewConversation}>
                  新しい会話
                </Button>
              </div>

              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      conv.id === currentConversationId
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <div className="flex items-center justify-between">
                      {editingTitle?.id === conv.id ? (
                        <input
                          className="flex-1 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                          value={editingTitle.title}
                          onChange={(e) => setEditingTitle({...editingTitle, title: e.target.value})}
                          onKeyDown={handleUpdateTitle}
                          onBlur={() => setEditingTitle(null)}
                          autoFocus
                        />
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {conv.title && conv.title !== '新しい会話' 
                                ? conv.title 
                                : new Date(conv.createdAt).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                              }
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {conv.messages.length}件のメッセージ
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-gray-400 hover:text-blue-500"
                              onClick={(e) => handleStartEditTitle(conv.id, conv.title, e)}
                              title="タイトルを編集"
                            >
                              ✎
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-gray-400 hover:text-red-500"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              title="削除"
                            >
                              ×
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* メインチャットエリア */}
        <div className="flex-1 flex flex-col lg:ml-0">
          <CardHeader className="border-b bg-white dark:bg-slate-800 shadow-sm">
            <CardTitle className="text-center text-2xl font-extrabold tracking-tight flex items-center justify-center gap-2 relative">
              {/* ハンバーガーメニューボタン */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>

              <span className="inline-block bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow">
                <span className="align-middle">🤖</span> AIエージェントチャット
              </span>
            </CardTitle>
          </CardHeader>

          <Card className="flex-1 flex flex-col border-0 rounded-none">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 pb-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <CardFooter className="border-t bg-white dark:bg-slate-800 p-4">
              <div className="flex w-full gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力してください... (Cmd/Ctrl + Enter で送信)"
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  送信
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* エージェント編集モーダル */}
        {editingAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">エージェント編集</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">名前</label>
                  <Input
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">システムプロンプト</label>
                  <Textarea
                    value={editingAgent.systemPrompt}
                    onChange={(e) => setEditingAgent({...editingAgent, systemPrompt: e.target.value})}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">モデル</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingAgent.model}
                    onChange={(e) => setEditingAgent({...editingAgent, model: e.target.value})}
                  >
                    {MODEL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* サブエージェント設定 */}
                <div>
                  <label className="block text-sm font-medium mb-1">サブエージェント</label>
                  <div className="space-y-2">
                    {subAgents.map((agent, idx) => (
                      <div key={idx} className="flex flex-col gap-1 bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                        <div className="flex items-center justify-between">
                          {editingSubAgentIndex === idx ? (
                            <>
                              <input
                                className="border rounded px-1 py-0.5 text-sm w-24"
                                value={editingSubAgentName}
                                onChange={e => setEditingSubAgentName(e.target.value)}
                                onBlur={() => handleEditSubAgentName(idx)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleEditSubAgentName(idx);
                                  if (e.key === 'Escape') handleCancelEditSubAgentName();
                                }}
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-gray-400"
                                onClick={handleCancelEditSubAgentName}
                              >×</Button>
                            </>
                          ) : (
                            <>
                              <span className="font-medium">{agent.name}</span>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-blue-500"
                                  onClick={() => handleStartEditSubAgentName(idx)}
                                  title="名前を編集"
                                >✎</Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => handleRemoveSubAgent(idx)}
                                  title="削除"
                                >×</Button>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs">モード:</span>
                          <select
                            className="border rounded px-1 py-0.5 text-xs"
                            value={agent.mode}
                            onChange={e => handleChangeSubAgentMode(idx, e.target.value as 'handoff' | 'tool')}
                          >
                            <option value="handoff">handoff</option>
                            <option value="tool">tool (OpenAI SDK)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={() => handleUpdateAgent(editingAgent)}>保存</Button>
                <Button variant="outline" onClick={() => setEditingAgent(null)}>キャンセル</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}