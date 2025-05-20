// OpenAIのモックを作成するファイル
import { NextApiRequest, NextApiResponse } from 'next';

// モックエラーの種類
export enum MockErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  INVALID_API_KEY = 'INVALID_API_KEY',
}

// モックエラーを発生させる関数
export function mockOpenAIError(errorType: MockErrorType) {
  switch (errorType) {
    case MockErrorType.NETWORK_ERROR:
      throw new Error('ネットワークエラーが発生しました');
    case MockErrorType.API_ERROR:
      throw new Error('OpenAI APIエラー: 無効なリクエストパラメータ');
    case MockErrorType.RATE_LIMIT:
      throw new Error('レート制限に達しました。しばらく待ってから再試行してください');
    case MockErrorType.TIMEOUT:
      throw new Error('リクエストがタイムアウトしました');
    case MockErrorType.INVALID_API_KEY:
      throw new Error('無効なAPIキーが提供されました');
  }
}

// モックハンドラー
export async function mockErrorHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  errorType: MockErrorType
) {
  try {
    // エラーを発生させる
    mockOpenAIError(errorType);
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'エラーが発生しました' });
  }
} 