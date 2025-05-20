import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // ユーザーメッセージを追加
    setMessages(prev => [...prev, { content: input, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    try {
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
      if (data.reply) {
        setMessages(prev => [...prev, { content: data.reply, sender: 'agent' }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        content: 'エラーが発生しました。もう一度お試しください。', 
        sender: 'agent' 
      }]);
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
  );
} 