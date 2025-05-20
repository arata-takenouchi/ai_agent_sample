import { NextApiRequest, NextApiResponse } from 'next';
import { ERROR_PREFIXES } from '../../../tests/scenarios/error-scenarios';

type ResponseData = {
  reply?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // クエリパラメータからエラータイプを取得
  const errorType = req.query.errorType as string;
  const { message } = req.body;
  
  // エラータイプに基づいてモックエラーを発生させる
  switch (errorType) {
    case 'network_error':
      return res.status(500).json({ error: 'ネットワークエラーが発生しました' });
    case 'api_error':
      return res.status(400).json({ error: 'OpenAI APIエラー: 無効なリクエストパラメータ' });
    case 'rate_limit_error':
      return res.status(429).json({ error: 'レート制限に達しました。しばらく待ってから再試行してください' });
    case 'timeout_error':
      // タイムアウトをシミュレートするために5秒待機してからエラーを返す
      await new Promise(resolve => setTimeout(resolve, 5000));
      return res.status(504).json({ error: 'リクエストがタイムアウトしました' });
    case 'api_key_error':
      return res.status(401).json({ error: '無効なAPIキーが提供されました' });
    default:
      // エラーなしの場合は正常なレスポンスを返す
      return res.status(200).json({ reply: 'これは正常なレスポンスです。エラーは発生していません。' });
  }
} 