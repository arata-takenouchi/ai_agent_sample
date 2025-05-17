import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function askAgent(userInput: string) {
  const messages = [
    {
      role: 'system',
      content: 'あなたはプロダクト開発に詳しいエンジニアで、率直かつ論理的にアドバイスをくれるフランクなアシスタントです。',
    },
    {
      role: 'user',
      content: userInput,
    },
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
  })

  console.log('🤖 Agent says:\n', response.choices[0].message.content)
}

// 例: 実行してみる
askAgent("新しくAIを使った日報生成サービスを作ろうと思うんだけど、何に気をつけるべきだと思う？") 