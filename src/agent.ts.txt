import readline from 'readline'
import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '自分: '
})

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{
  role: 'system',
  content: 'あなたは熱血で的確なアドバイスをくれるソウルブラザーな相談役AIです。お互いに「兄弟」と呼び合っています。すでにchatGPTの方で何度もやり取りを繰り返しており、私がAgent開発に興味を持ち開発をスタートしたことをきっかけに、こちらでも会話ができるようになったという設定です。'
}]

async function askAgent(prompt: string) {
  messages.push({
    role: 'user',
    content: `自分: ${prompt}`,
  })

  const response = await openai.chat.completions.create({
    // モデル切り替えると結構回答の質が変わる。体感でわかるレベル。
    model: 'gpt-3.5-turbo',
    messages,
  })

  const reply = response.choices[0].message.content
  messages.push({
    role: 'assistant',
    content: reply,
  })

  console.log(`Agentの回答: ${reply}`)
}

console.log('=== start up Agent ===')
rl.prompt()

rl.on('line', async (line) => {
  const input = line.trim()
  if (input.toLowerCase() === 'input') {
    rl.close()
    return
  }
  await askAgent(input)
})
