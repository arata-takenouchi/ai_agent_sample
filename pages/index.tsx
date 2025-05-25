import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Head from 'next/head';
import { 
  Conversation, 
  Message as DBMessage, 
  createConversation, 
  getAllConversations, 
  getConversation, 
  addMessageToConversation,
  deleteConversation,
  updateConversationTitle
} from '../utils/indexedDB';

// shadcn/uiコンポーネントのインポート
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";

type Message = {
  content: string;
  sender: 'user' | 'agent';
};

// 追加: モデル選択用の型
const MODEL_OPTIONS = [
  { label: "GPT-3.5", value: "gpt-3.5-turbo" },
  { label: "GPT-4", value: "gpt-4" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { content: 'よう、兄弟！何か相談したいことがあるなら、遠慮なく言ってくれ！', sender: 'agent' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTitle, setEditingTitle] = useState<{ id: number; title: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState("gpt-3.5-turbo"); // 追加
  const [subAgents, setSubAgents] = useState<string[]>([]);

  // 初期化時に会話履歴を読み込む
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const allConversations = await getAllConversations();
        setConversations(allConversations);
        
        // 会話がない場合は新しい会話を作成
        if (allConversations.length === 0) {
          const newId = await createConversation();
          setCurrentConversationId(newId);
          
          // 新しい会話を読み込む
          const newConversations = await getAllConversations();
          setConversations(newConversations);
        } else {
          // 最新の会話を選択
          setCurrentConversationId(allConversations[0].id);
          setMessages(allConversations[0].messages.map(m => ({
            content: m.content,
            sender: m.sender
          })));
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

  // 新しい会話を作成
  const handleNewConversation = async () => {
    try {
      const newId = await createConversation();
      setCurrentConversationId(newId);
      setMessages([
        { content: 'よう、兄弟！何か相談したいことがあるなら、遠慮なく言ってくれ！', sender: 'agent' }
      ]);
      
      // 会話リストを更新
      const updatedConversations = await getAllConversations();
      setConversations(updatedConversations);
    } catch (error) {
      console.error('新しい会話の作成に失敗しました:', error);
    }
  };

  // 会話を選択
  const handleSelectConversation = async (id: number) => {
    try {
      const conversation = await getConversation(id);
      if (conversation) {
        setCurrentConversationId(id);
        setMessages(conversation.messages.map(m => ({
          content: m.content,
          sender: m.sender
        })));
      }
    } catch (error) {
      console.error('会話の読み込みに失敗しました:', error);
    }
  };

  // 会話を削除
  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを停止
    
    if (window.confirm('この会話を削除してもよろしいですか？')) {
      try {
        await deleteConversation(id);
        
        // 会話リストを更新
        const updatedConversations = await getAllConversations();
        setConversations(updatedConversations);
        
        // 削除した会話が現在選択されている場合は、別の会話を選択
        if (id === currentConversationId) {
          if (updatedConversations.length > 0) {
            handleSelectConversation(updatedConversations[0].id);
          } else {
            // 会話がない場合は新しい会話を作成
            handleNewConversation();
          }
        }
      } catch (error) {
        console.error('会話の削除に失敗しました:', error);
      }
    }
  };

  // タイトル編集モードを開始
  const handleStartEditTitle = (id: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを停止
    setEditingTitle({ id, title });
  };

  // タイトルを更新
  const handleUpdateTitle = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingTitle) {
      e.preventDefault();
      try {
        await updateConversationTitle(editingTitle.id, editingTitle.title);
        
        // 会話リストを更新
        const updatedConversations = await getAllConversations();
        setConversations(updatedConversations);
        
        // 編集モードを終了
        setEditingTitle(null);
      } catch (error) {
        console.error('タイトルの更新に失敗しました:', error);
      }
    } else if (e.key === 'Escape') {
      // 編集をキャンセル
      setEditingTitle(null);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentConversationId) return;

    const messageToSend = input; // ここで退避

    // ユーザーメッセージを追加
    const userMessage = { content: messageToSend, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // メッセージをIndexedDBに保存
      await addMessageToConversation(currentConversationId, userMessage);
      
      // APIにメッセージとモデルを送信
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend, model }), // 退避した値を使う
      });

      const data = await response.json();
      
      // 入力中表示を非表示
      setIsTyping(false);
      
      // エージェントの返答を追加
      let agentMessage: Message;
      if (data.reply) {
        agentMessage = { content: data.reply, sender: 'agent' };
      } else {
        agentMessage = { 
          content: 'エラーが発生しました。もう一度お試しください。', 
          sender: 'agent' 
        };
      }
      
      setMessages(prev => [...prev, agentMessage]);
      
      // エージェントの返答をIndexedDBに保存
      await addMessageToConversation(currentConversationId, agentMessage);
      
      // 会話リストを更新（タイトルが更新された可能性があるため）
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
      
      // エラーメッセージをIndexedDBに保存
      if (currentConversationId) {
        await addMessageToConversation(currentConversationId, errorMessage);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Command(Mac)またはCtrl(Windows)キーが押されている状態でEnterが押された場合に送信
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // サブエージェント追加
  const handleAddSubAgent = () => {
    if (subAgents.length < 2) {
      setSubAgents([...subAgents, `サブエージェント${subAgents.length + 1}`]);
    }
  };

  // サブエージェント削除
  const handleRemoveSubAgent = (index: number) => {
    setSubAgents(subAgents.filter((_, i) => i !== index));
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
        <div className={`w-72 bg-slate-800 text-slate-100 h-screen transition-transform duration-300 ease-in-out ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-40`}>
          <div className="p-4 flex flex-col h-full">
            <Button 
              className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleNewConversation}
            >
              + 新しい会話
            </Button>
            
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-2 rounded-md cursor-pointer flex items-center justify-between group ${
                      currentConversationId === conv.id ? 'bg-slate-700' : 'hover:bg-slate-700/50'
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    {editingTitle && editingTitle.id === conv.id ? (
                      <Input
                        value={editingTitle.title}
                        onChange={(e) => setEditingTitle({ ...editingTitle, title: e.target.value })}
                        onKeyDown={handleUpdateTitle}
                        autoFocus
                        className="w-full bg-slate-600 text-slate-100 border-slate-500"
                      />
                    ) : (
                      <>
                        <span className="truncate flex-1">{conv.title}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-300 hover:text-slate-100 hover:bg-slate-600"
                            onClick={(e) => handleStartEditTitle(conv.id, conv.title, e)}
                          >
                            ✎
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-300 hover:text-red-400 hover:bg-slate-600"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                          >
                            🗑
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
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
                    <div className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl px-4 py-3 rounded-bl-none flex items-center">
                      相談役が考え中...
                      <span className="ml-2 flex space-x-1">
                        <span className="animate-bounce delay-0 h-1.5 w-1.5 bg-slate-500 dark:bg-slate-400 rounded-full"></span>
                        <span className="animate-bounce delay-150 h-1.5 w-1.5 bg-slate-500 dark:bg-slate-400 rounded-full"></span>
                        <span className="animate-bounce delay-300 h-1.5 w-1.5 bg-slate-500 dark:bg-slate-400 rounded-full"></span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <CardFooter className="border-t p-4 bg-white dark:bg-slate-800">
              <div className="flex w-full items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力..."
                  className="flex-1 min-h-[60px] max-h-[200px] resize-none"
                />
                <Button 
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="icon"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
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
                    onChange={() => setModel(opt.value)}
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
              {subAgents.map((name, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                  <span>{name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                    onClick={() => handleRemoveSubAgent(idx)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 