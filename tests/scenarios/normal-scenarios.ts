// 正常系テストシナリオ

export type TestStep = {
  type: 'user-input' | 'expected-response' | 'wait';
  content?: string;
  duration?: number; // ミリ秒単位の待機時間
  description: string;
};

export type TestScenario = {
  name: string;
  description: string;
  steps: TestStep[];
};

export const normalScenarios: TestScenario[] = [
  {
    name: '基本的な挨拶のやり取り',
    description: 'ユーザーが挨拶をして、AIが応答するシンプルなシナリオ',
    steps: [
      {
        type: 'user-input',
        content: 'こんにちは、元気？',
        description: 'ユーザーが挨拶を送信'
      },
      {
        type: 'wait',
        duration: 3000,
        description: 'AIの応答を待機'
      },
      {
        type: 'expected-response',
        description: 'AIからの挨拶応答を確認'
      }
    ]
  },
  {
    name: '質問と回答のやり取り',
    description: 'ユーザーが質問をして、AIが詳細な回答をするシナリオ',
    steps: [
      {
        type: 'user-input',
        content: 'プログラミングの勉強を始めたいんだけど、何から始めるべき？',
        description: 'ユーザーが質問を送信'
      },
      {
        type: 'wait',
        duration: 5000,
        description: 'AIの応答を待機'
      },
      {
        type: 'expected-response',
        description: 'AIからのアドバイス応答を確認'
      }
    ]
  },
  {
    name: '複数回のやり取り',
    description: '複数のメッセージを交換するシナリオ',
    steps: [
      {
        type: 'user-input',
        content: '最近疲れてるんだよね',
        description: '最初のメッセージを送信'
      },
      {
        type: 'wait',
        duration: 3000,
        description: 'AIの応答を待機'
      },
      {
        type: 'expected-response',
        description: 'AIからの最初の応答を確認'
      },
      {
        type: 'user-input',
        content: '仕事が忙しくて睡眠時間が少ないんだ',
        description: '追加情報を送信'
      },
      {
        type: 'wait',
        duration: 3000,
        description: 'AIの応答を待機'
      },
      {
        type: 'expected-response',
        description: 'AIからの2回目の応答を確認'
      }
    ]
  }
]; 