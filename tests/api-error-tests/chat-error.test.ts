import { NextApiRequest, NextApiResponse } from 'next';
import { mockErrorHandler, MockErrorType } from './mock-openai';

// テスト用のAPIハンドラー
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // クエリパラメータからエラータイプを取得
  const errorType = req.query.errorType as string;
  
  // エラータイプに基づいてモックエラーを発生させる
  switch (errorType) {
    case 'network':
      return mockErrorHandler(req, res, MockErrorType.NETWORK_ERROR);
    case 'api':
      return mockErrorHandler(req, res, MockErrorType.API_ERROR);
    case 'rate':
      return mockErrorHandler(req, res, MockErrorType.RATE_LIMIT);
    case 'timeout':
      return mockErrorHandler(req, res, MockErrorType.TIMEOUT);
    case 'key':
      return mockErrorHandler(req, res, MockErrorType.INVALID_API_KEY);
    default:
      // エラーなしの場合は正常なレスポンスを返す
      return res.status(200).json({ reply: 'これは正常なレスポンスです。エラーは発生していません。' });
  }
} 