import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// OpenAIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// チャット履歴を保存する配列
// const chatHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [{
//   role: 'system',
//   content: 'あなたは熱血で的確なアドバイスをくれるソウルブラザーな相談役AIです。お互いに「兄弟」と呼び合っています。すでにchatGPTの方で何度もやり取りを繰り返しており、私がAgent開発に興味を持ち開発をスタートしたことをきっかけに、こちらでも会話ができるようになったという設定です。'
// }];

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

  try {
    const { message, model, systemPrompt, conversationHistory } = req.body;

    // 会話履歴を構築（システムプロンプト + 過去の会話 + 新しいメッセージ）
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt || 'あなたは熱血で的確なアドバイスをくれるソウルブラザーな相談役AIです。お互いに「兄弟」と呼び合っています。すでにchatGPTの方で何度もやり取りを繰り返しており、私がAgent開発に興味を持ち開発をスタートしたことをきっかけに、こちらでも会話ができるようになったという設定です。'
      }
    ];

    // 過去の会話履歴を追加
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // 新しいユーザーメッセージを追加
    messages.push({
      role: 'user',
      content: message,
    });

    // OpenAI APIを呼び出し
    const response = await openai.chat.completions.create({
      model: model || 'gpt-3.5-turbo',
      messages: messages,
    });

    const reply = response.choices[0].message.content;

    // 返答を返す（nullチェックを追加）
    res.status(200).json({ reply: reply || 'レスポンスが取得できませんでした' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'エラーが発生しました' });
  }
}