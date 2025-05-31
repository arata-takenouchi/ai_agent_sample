import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Head from 'next/head';
import { 
  Conversation,
  createConversation,
  getAllConversations,
  getConversation,
  addMessageToConversation,
  deleteConversation,
  updateConversationTitle,
  updateConversationSubAgents,
  updateConversationModel,
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTitle, setEditingTitle] = useState<{ id: number; title: string } | null>(null);
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [editingSubAgentIndex, setEditingSubAgentIndex] = useState<number | null>(null);
  const [editingSubAgentName, setEditingSubAgentName] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期化時に会話履歴を読み込む
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const allConversations = await getAllConversations();
        setConversations(allConversations);
        
        if (allConversations.length === 0) {
          const newId = await createConversation();
          setCurrentConversationId(newId);
          setSubAgents([]); // 新規会話はサブエージェントなし
          setModel("gpt-3.5-turbo"); // デフォルトモデル
          const newConversations = await getAllConversations();
          setConversations(newConversations);
        } else {
          setCurrentConversationId(allConversations[0].id);
          setMessages(allConversations[0].messages.map(m => ({
            content: m.content,
            sender: m.sender
          })));
          // サブエージェント設定を復元
          setSubAgents(allConversations[0].subAgents || []);
          // モデル設定を復元
          setModel(allConversations[0].model || "gpt-3.5-turbo");
        }
      } catch (error) {
        console.error('会話履歴の読み込みに失敗しました:', error);
      }
    };
    
    loadConversations();
  }, []);

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 会話管理関数
  const handleNewConversation = async () => {
    try {
      const newId = await createConversation();
      setCurrentConversationId(newId);
      setMessages([
        { content: 'よう、兄弟！何か相談したいことがあるなら、遠慮なく言ってくれ！', sender: 'agent' }
      ]);
      
      // サブエージェント設定をリセット
      setSubAgents([]);
      // モデル設定をデフォルトに
      setModel("gpt-3.5-turbo");
      
      const updatedConversations = await getAllConversations();
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
        // モデル設定を復元
        setModel(conversation.model || "gpt-3.5-turbo");
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
        const updatedConversations = await getAllConversations();
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
        const updatedConversations = await getAllConversations();
        setConversations(updatedConversations);
        setEditingTitle(null);
      } catch (error) {
        console.error('タイトルの更新に失敗しました:', error);
      }
    }
  };

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!input.trim() || !currentConversationId) return;

    const messageToSend = input;
    const userMessage = { content: messageToSend, sender: 'user' as const };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      await addMessageToConversation(currentConversationId, userMessage);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend, model, subAgents }),
      });

      const data = await response.json();
      setIsTyping(false);
      
      const agentMessage: Message = data.reply 
        ? { content: data.reply, sender: 'agent' }
        : { content: 'エラーが発生しました。もう一度お試しください。', sender: 'agent' };
      
      setMessages(prev => [...prev, agentMessage]);
      await addMessageToConversation(currentConversationId, agentMessage);
      
      const updatedConversations = await getAllConversations();
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      
      const errorMessage = { 
        content: 'エラーが発生しました。もう一度お試しください。', 
        sender: 'agent' as const
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      if (currentConversationId) {
        await addMessageToConversation(currentConversationId, errorMessage);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // サブエージェント管理関数
  const handleAddSubAgent = () => {
    if (subAgents.length < 2) {
      setSubAgents([...subAgents, { name: `サブエージェント${subAgents.length + 1}`, mode: 'handoff' }]);
    }
  };

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

  // サブエージェント設定が変更されたときに自動保存
  useEffect(() => {
    const saveSubAgents = async () => {
      if (currentConversationId) {
        try {
          await updateConversationSubAgents(currentConversationId, subAgents);
        } catch (error) {
          console.error('サブエージェント設定の保存に失敗しました:', error);
        }
      }
    };
    
    saveSubAgents();
  }, [subAgents, currentConversationId]);

  // モデル変更時に会話に保存
  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    
    if (currentConversationId) {
      try {
        await updateConversationModel(currentConversationId, newModel);
        const updatedConversations = await getAllConversations();
        setConversations(updatedConversations);
      } catch (error) {
        console.error('モデル設定の保存に失敗しました:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Head>
        <title>AIエージェントチャット</title>
        <meta name="description" content="AIエージェントとチャットできるアプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen overflow-hidden">
        {/* サイドバートグルボタン（モバイル用） */}
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? '×' : '≡'}
        </Button>
        
        {/* サイドバー */}
        <div className={`w-64 bg-white dark:bg-slate-900 border-r h-screen flex flex-col transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-40`}>
          <div className="p-4 border-b">
            <Button 
              onClick={handleNewConversation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              新しい会話
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg cursor-pointer mb-2 group relative ${
                    conv.id === currentConversationId 
                      ? 'bg-blue-100 dark:bg-blue-900' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  {editingTitle?.id === conv.id ? (
                    <Input
                      value={editingTitle.title}
                      onChange={(e) => setEditingTitle({ ...editingTitle, title: e.target.value })}
                      onKeyDown={handleUpdateTitle}
                      onBlur={() => setEditingTitle(null)}
                      className="text-sm"
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="text-sm font-medium truncate pr-8">
                        {conv.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-slate-400 hover:text-blue-600"
                          onClick={(e) => handleStartEditTitle(conv.id, conv.title, e)}
                        >
                          ✎
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-slate-400 hover:text-red-600"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                        >
                          ×
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden pr-64">
          <CardHeader className="border-b bg-white dark:bg-slate-800 shadow-sm">
            <CardTitle className="text-center text-2xl font-extrabold tracking-tight flex items-center justify-center gap-2">
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
        </main>

        {/* 右サイドパネル */}
        <div className="w-64 bg-white dark:bg-slate-900 border-l h-screen flex flex-col p-6 fixed right-0 top-0 z-40">
          <h2 className="text-lg font-bold mb-4">設定</h2>
          <div>
            <label className="block text-sm font-medium mb-2">エージェントモデル</label>
            <div className="space-y-2 mb-6">
              {MODEL_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="model"
                    value={opt.value}
                    checked={model === opt.value}
                    onChange={() => handleModelChange(opt.value)}
                    className="accent-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            
            <div className="mb-2 flex items-center justify-between">
              <span className="block text-sm font-medium">サブエージェント</span>
              <Button
                size="sm"
                className="ml-2"
                onClick={handleAddSubAgent}
                disabled={subAgents.length >= 2}
              >
                ＋追加
              </Button>
            </div>
            <div className="space-y-2">
              {subAgents.length === 0 && (
                <div className="text-xs text-slate-400">サブエージェントはありません</div>
              )}
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
      </div>
    </div>
  );
} 