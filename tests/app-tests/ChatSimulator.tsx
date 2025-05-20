import { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Home.module.css';
import { TestStep } from '../scenarios/normal-scenarios';

type Message = {
  content: string;
  sender: 'user' | 'agent';
};

type ChatSimulatorProps = {
  steps: TestStep[];
  onComplete: (success: boolean, messages: Message[]) => void;
  autoRun: boolean;
};

export default function ChatSimulator({ steps, onComplete, autoRun }: ChatSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([
    { content: 'よう、兄弟！何か相談したいことがあるなら、遠慮なく言ってくれ！', sender: 'agent' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const executingRef = useRef(false); // 実行中かどうかを追跡する参照

  // メッセージが追加されたときに自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 自動実行モードの場合、マウント時にテストを開始
  useEffect(() => {
    if (autoRun) {
      setIsRunning(true);
    }
  }, [autoRun]);

  // テスト実行ロジック
  useEffect(() => {
    if (!isRunning || currentStepIndex >= steps.length || executingRef.current) return;

    const currentStep = steps[currentStepIndex];
    
    const executeStep = async () => {
      executingRef.current = true; // ステップ実行開始
      setTestStatus('running');
      
      try {
        switch (currentStep.type) {
          case 'user-input':
            if (currentStep.content) {
              setInput(currentStep.content);
              await handleSendMessage(currentStep.content);
            }
            setCurrentStepIndex(prev => prev + 1);
            break;
            
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, currentStep.duration || 2000));
            setCurrentStepIndex(prev => prev + 1);
            break;
            
          case 'expected-response':
            // 最後のメッセージが期待する内容かチェック
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.sender === 'agent') {
              if (currentStep.content) {
                // 特定の内容を期待する場合
                if (lastMessage.content.includes(currentStep.content)) {
                  setCurrentStepIndex(prev => prev + 1);
                } else {
                  // 期待する内容が含まれていない場合は失敗
                  setTestStatus('failed');
                  onComplete(false, messages);
                  setIsRunning(false);
                  return;
                }
              } else {
                // 内容を特に指定しない場合は、何らかの応答があれば次へ
                setCurrentStepIndex(prev => prev + 1);
              }
            } else {
              // エージェントからの応答がない場合は失敗
              setTestStatus('failed');
              onComplete(false, messages);
              setIsRunning(false);
              return;
            }
            break;
        }
        
        // すべてのステップが完了した場合
        if (currentStepIndex + 1 >= steps.length) {
          setTestStatus('success');
          onComplete(true, messages);
          setIsRunning(false);
        }
      } finally {
        executingRef.current = false; // ステップ実行終了
      }
    };

    executeStep();
  }, [isRunning, currentStepIndex, messages, steps, onComplete]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // ユーザーメッセージを追加
    setMessages(prev => [...prev, { content: messageText, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    try {
      // APIにメッセージを送信
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();
      
      // 入力中表示を非表示
      setIsTyping(false);
      
      // エージェントの返答を追加
      if (data.reply) {
        setMessages(prev => [...prev, { content: data.reply, sender: 'agent' }]);
      } else if (data.error) {
        setMessages(prev => [...prev, { 
          content: 'エラーが発生しました。もう一度お試しください。', 
          sender: 'agent' 
        }]);
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

  return (
    <div className={styles.chatContainer} style={{ height: '500px', width: '100%' }}>
      <div className={styles.chatMessages} style={{ height: '400px', overflowY: 'auto' }}>
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
          placeholder="メッセージを入力..."
          className={styles.messageInput}
          disabled={isRunning}
        />
        <button 
          onClick={() => handleSendMessage(input)}
          className={styles.sendButton}
          disabled={isRunning || !input.trim()}
        >
          送信
        </button>
      </div>
      
      {!autoRun && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <button 
            onClick={() => {
              setCurrentStepIndex(0); // インデックスをリセット
              setTestStatus('idle');
              setIsRunning(true);
            }}
            disabled={isRunning}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'default' : 'pointer'
            }}
          >
            テスト実行
          </button>
          <div style={{ marginTop: '5px', color: 
            testStatus === 'idle' ? '#666' : 
            testStatus === 'running' ? '#2196f3' : 
            testStatus === 'success' ? '#4caf50' : '#f44336' 
          }}>
            {testStatus === 'idle' ? '準備完了' : 
             testStatus === 'running' ? '実行中...' : 
             testStatus === 'success' ? 'テスト成功！' : 'テスト失敗'}
          </div>
        </div>
      )}
    </div>
  );
} 