// 異常系テストシナリオ
import { TestScenario } from './normal-scenarios';

// モックエラーを発生させるための特殊なメッセージプレフィックス
// これらのプレフィックスを持つメッセージは、APIハンドラーでエラーを発生させるために使用
export const ERROR_PREFIXES = {
  NETWORK: '[NETWORK_ERROR]',
  TIMEOUT: '[TIMEOUT_ERROR]',
  API_KEY: '[API_KEY_ERROR]',
  RATE_LIMIT: '[RATE_LIMIT_ERROR]',
  SERVER: '[SERVER_ERROR]',
};

export const errorScenarios: TestScenario[] = [
  {
    name: 'ネットワークエラー',
    description: 'ネットワーク接続の問題をシミュレート',
    steps: [
      {
        type: 'user-input',
        content: `${ERROR_PREFIXES.NETWORK} このメッセージを送信するとネットワークエラーが発生します`,
        description: 'ネットワークエラーを引き起こすメッセージを送信'
      },
      {
        type: 'wait',
        duration: 2000,
        description: 'エラー応答を待機'
      },
      {
        type: 'expected-response',
        content: 'エラーが発生しました。もう一度お試しください。',
        description: 'エラーメッセージが表示されることを確認'
      }
    ]
  },
  {
    name: 'タイムアウトエラー',
    description: 'リクエストタイムアウトをシミュレート',
    steps: [
      {
        type: 'user-input',
        content: `${ERROR_PREFIXES.TIMEOUT} このメッセージを送信するとタイムアウトエラーが発生します`,
        description: 'タイムアウトを引き起こすメッセージを送信'
      },
      {
        type: 'wait',
        duration: 10000, // タイムアウトを待つために長めの時間を設定
        description: 'タイムアウトを待機'
      },
      {
        type: 'expected-response',
        content: 'エラーが発生しました。もう一度お試しください。',
        description: 'エラーメッセージが表示されることを確認'
      }
    ]
  },
  {
    name: 'APIキーエラー',
    description: '無効なAPIキーエラーをシミュレート',
    steps: [
      {
        type: 'user-input',
        content: `${ERROR_PREFIXES.API_KEY} このメッセージを送信するとAPIキーエラーが発生します`,
        description: 'APIキーエラーを引き起こすメッセージを送信'
      },
      {
        type: 'wait',
        duration: 2000,
        description: 'エラー応答を待機'
      },
      {
        type: 'expected-response',
        content: 'エラーが発生しました。もう一度お試しください。',
        description: 'エラーメッセージが表示されることを確認'
      }
    ]
  },
  {
    name: 'レート制限エラー',
    description: 'APIレート制限エラーをシミュレート',
    steps: [
      {
        type: 'user-input',
        content: `${ERROR_PREFIXES.RATE_LIMIT} このメッセージを送信するとレート制限エラーが発生します`,
        description: 'レート制限エラーを引き起こすメッセージを送信'
      },
      {
        type: 'wait',
        duration: 2000,
        description: 'エラー応答を待機'
      },
      {
        type: 'expected-response',
        content: 'エラーが発生しました。もう一度お試しください。',
        description: 'エラーメッセージが表示されることを確認'
      }
    ]
  }
]; 