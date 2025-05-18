import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function askAgent(userInput: string) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
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
    model: 'gpt-3.5-turbo',
    messages,
  })

  console.log(`Agentの回答: ${response.choices[0].message.content}`)
}

askAgent('新しくAIを使った日報生成サービスを作ろうと思うんだけど、何に気をつけるべきだと思う？') 