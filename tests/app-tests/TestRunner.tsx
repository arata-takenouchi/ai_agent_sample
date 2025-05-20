import { useState } from 'react';
import Head from 'next/head';
import styles from '../../styles/Home.module.css';
import ChatSimulator from './ChatSimulator';
import { TestScenario } from '../scenarios/normal-scenarios';
import { normalScenarios } from '../scenarios/normal-scenarios';
import { errorScenarios } from '../scenarios/error-scenarios';

type Message = {
  content: string;
  sender: 'user' | 'agent';
};

type TestResult = {
  scenarioName: string;
  success: boolean;
  messages: Message[];
};

export default function TestRunner() {
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'normal' | 'error'>('normal');
  const [autoRunAll, setAutoRunAll] = useState(false);

  const scenarios = activeTab === 'normal' ? normalScenarios : errorScenarios;

  const handleScenarioSelect = (scenario: TestScenario) => {
    setSelectedScenario(scenario);
  };

  const handleTestComplete = (success: boolean, messages: Message[]) => {
    if (selectedScenario) {
      const result: TestResult = {
        scenarioName: selectedScenario.name,
        success,
        messages
      };
      
      setTestResults(prev => [...prev, result]);
      
      if (autoRunAll) {
        // 次のシナリオを自動的に選択
        const currentIndex = scenarios.findIndex(s => s.name === selectedScenario.name);
        if (currentIndex < scenarios.length - 1) {
          setSelectedScenario(scenarios[currentIndex + 1]);
        } else {
          setAutoRunAll(false);
        }
      }
    }
  };

  const runAllTests = () => {
    setTestResults([]);
    setAutoRunAll(true);
    setSelectedScenario(scenarios[0]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>アプリケーションテスト</title>
        <meta name="description" content="チャットアプリケーションのテスト" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>アプリケーションテスト</h1>
        
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => setActiveTab('normal')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'normal' ? '#0084ff' : '#e0e0e0',
              color: activeTab === 'normal' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px 0 0 4px',
              cursor: 'pointer'
            }}
          >
            正常系テスト
          </button>
          <button 
            onClick={() => setActiveTab('error')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'error' ? '#0084ff' : '#e0e0e0',
              color: activeTab === 'error' ? 'white' : 'black',
              border: 'none',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer'
            }}
          >
            異常系テスト
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
          {/* シナリオリスト */}
          <div style={{ width: '30%', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '10px' }}>
            <h2 style={{ marginTop: 0 }}>テストシナリオ</h2>
            <div style={{ marginBottom: '15px' }}>
              <button 
                onClick={runAllTests}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                すべて実行
              </button>
              <button 
                onClick={clearResults}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                結果クリア
              </button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {scenarios.map((scenario, index) => (
                <div 
                  key={index}
                  onClick={() => handleScenarioSelect(scenario)}
                  style={{
                    padding: '10px',
                    marginBottom: '10px',
                    backgroundColor: selectedScenario?.name === scenario.name ? '#e3f2fd' : 'white',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    border: '1px solid #ddd'
                  }}
                >
                  <h3 style={{ margin: '0 0 5px 0' }}>{scenario.name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{scenario.description}</p>
                  {testResults.find(r => r.scenarioName === scenario.name) && (
                    <div style={{ 
                      marginTop: '5px', 
                      color: testResults.find(r => r.scenarioName === scenario.name)?.success ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}>
                      {testResults.find(r => r.scenarioName === scenario.name)?.success ? '✓ 成功' : '✗ 失敗'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* シミュレーター */}
          <div style={{ width: '70%' }}>
            {selectedScenario ? (
              <>
                <h2>{selectedScenario.name}</h2>
                <p>{selectedScenario.description}</p>
                <div style={{ marginBottom: '15px' }}>
                  <h3>テストステップ:</h3>
                  <ol>
                    {selectedScenario.steps.map((step, index) => (
                      <li key={index}>{step.description}</li>
                    ))}
                  </ol>
                </div>
                <ChatSimulator 
                  steps={selectedScenario.steps} 
                  onComplete={handleTestComplete}
                  autoRun={autoRunAll}
                />
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px',
                backgroundColor: '#f9f9f9',
                borderRadius: '10px'
              }}>
                <p>左側のリストからテストシナリオを選択してください</p>
              </div>
            )}
          </div>
        </div>
        
        {/* テスト結果 */}
        {testResults.length > 0 && (
          <div style={{ marginTop: '30px', width: '100%' }}>
            <h2>テスト結果</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>シナリオ</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>結果</th>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>詳細</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{result.scenarioName}</td>
                    <td style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd',
                      color: result.success ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}>
                      {result.success ? '成功' : '失敗'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => {
                          // 詳細表示ロジックを実装
                          alert(`メッセージ数: ${result.messages.length}\n最後のメッセージ: ${result.messages[result.messages.length - 1]?.content}`);
                        }}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#2196f3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        詳細を表示
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
} 