import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
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

type Message = {
  content: string;
  sender: 'user' | 'agent';
};

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

    // ユーザーメッセージを追加
    const userMessage = { content: input, sender: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // メッセージをIndexedDBに保存
      await addMessageToConversation(currentConversationId, userMessage);
      
      // APIにメッセージを送信
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
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

  return (
    <div className={styles.container}>
      <Head>
        <title>AIエージェントチャット</title>
        <meta name="description" content="AIエージェントとチャットできるアプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.layout}>
        {/* サイドバートグルボタン（モバイル用） */}
        <button 
          className={styles.sidebarToggle}
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? '×' : '≡'}
        </button>
        
        {/* サイドバー */}
        <div className={`${styles.sidebar} ${showSidebar ? styles.sidebarVisible : ''}`}>
          <button 
            className={styles.newChatButton}
            onClick={handleNewConversation}
          >
            + 新しい会話
          </button>
          
          <div className={styles.conversationList}>
            {conversations.map(conv => (
              <div 
                key={conv.id}
                className={`${styles.conversationItem} ${currentConversationId === conv.id ? styles.activeConversation : ''}`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                {editingTitle && editingTitle.id === conv.id ? (
                  <input
                    type="text"
                    value={editingTitle.title}
                    onChange={(e) => setEditingTitle({ ...editingTitle, title: e.target.value })}
                    onKeyDown={handleUpdateTitle}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className={styles.titleInput}
                  />
                ) : (
                  <>
                    <span className={styles.conversationTitle}>{conv.title}</span>
                    <div className={styles.conversationActions}>
                      <button 
                        className={styles.editButton}
                        onClick={(e) => handleStartEditTitle(conv.id, conv.title, e)}
                      >
                        ✎
                      </button>
                      <button 
                        className={styles.deleteButton}
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <main className={styles.main}>
          <h1 className={styles.title}>AIエージェントチャット</h1>
          
          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`${styles.message} ${
                    msg.sender === 'user' ? styles.userMessage : styles.agentMessage
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isTyping && (
                <div className={styles.typingIndicator}>
                  相談役が考え中...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className={styles.chatInput}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                className={styles.messageInput}
              />
              <button 
                onClick={handleSendMessage}
                className={styles.sendButton}
              >
                送信
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 