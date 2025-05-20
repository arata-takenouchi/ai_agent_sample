import { useState, useRef } from 'react';
import Head from 'next/head';
import styles from '../../styles/Home.module.css';

type ErrorType = 'network' | 'api' | 'rate' | 'timeout' | 'key' | 'none';

export default function ErrorTestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedError, setSelectedError] = useState<ErrorType>('none');

  const testError = async () => {
    setLoading(true);
    setResult('');

    try {
      // テスト用APIエンドポイントを呼び出す
      const response = await fetch(`/api/tests/chat-error?errorType=${selectedError}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'テストメッセージ' }),
      });

      const data = await response.json();
      
      if (data.error) {
        setResult(`エラー発生: ${data.error}`);
      } else {
        setResult(`成功: ${data.reply}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult(`クライアント側エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>エラーハンドリングテスト</title>
        <meta name="description" content="APIエラーハンドリングのテスト" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>エラーハンドリングテスト</h1>
        
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px' }}>
          <h2>テストするエラータイプを選択</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            <label>
              <input 
                type="radio" 
                name="errorType" 
                value="none" 
                checked={selectedError === 'none'} 
                onChange={() => setSelectedError('none')} 
              />
              エラーなし（正常レスポンス）
            </label>
            <label>
              <input 
                type="radio" 
                name="errorType" 
                value="network" 
                checked={selectedError === 'network'} 
                onChange={() => setSelectedError('network')} 
              />
              ネットワークエラー
            </label>
            <label>
              <input 
                type="radio" 
                name="errorType" 
                value="api" 
                checked={selectedError === 'api'} 
                onChange={() => setSelectedError('api')} 
              />
              API エラー
            </label>
            <label>
              <input 
                type="radio" 
                name="errorType" 
                value="rate" 
                checked={selectedError === 'rate'} 
                onChange={() => setSelectedError('rate')} 
              />
              レート制限エラー
            </label>
            <label>
              <input 
                type="radio" 
                name="errorType" 
                value="timeout" 
                checked={selectedError === 'timeout'} 
                onChange={() => setSelectedError('timeout')} 
              />
              タイムアウトエラー
            </label>
            <label>
              <input 
                type="radio" 
                name="errorType" 
                value="key" 
                checked={selectedError === 'key'} 
                onChange={() => setSelectedError('key')} 
              />
              無効なAPIキーエラー
            </label>
          </div>
          
          <button 
            onClick={testError}
            disabled={loading}
            className={styles.sendButton}
            style={{ width: '100%' }}
          >
            {loading ? 'テスト実行中...' : 'エラーテスト実行'}
          </button>
        </div>
        
        {result && (
          <div 
            style={{ 
              padding: '15px', 
              backgroundColor: result.startsWith('エラー') ? '#ffebee' : '#e8f5e9',
              borderRadius: '10px',
              marginTop: '20px',
              whiteSpace: 'pre-wrap'
            }}
          >
            <h3>{result.startsWith('エラー') ? 'エラー結果' : 'テスト結果'}</h3>
            <p>{result}</p>
          </div>
        )}
      </main>
    </div>
  );
} 