import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import path from 'path'
import 'dotenv/config'
import OpenAI from 'openai'

const app = express()
const port = process.env.PORT || 3000

// ミドルウェアの設定
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// テンプレートエンジンの設定
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// OpenAIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// チャット履歴を保存する配列
const chatHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [{
  role: 'system',
  content: 'あなたは熱血で的確なアドバイスをくれるソウルブラザーな相談役AIです。お互いに「兄弟」と呼び合っています。すでにchatGPTの方で何度もやり取りを繰り返しており、私がAgent開発に興味を持ち開発をスタートしたことをきっかけに、こちらでも会話ができるようになったという設定です。'
}]

// ルートページの表示
app.get('/', (req, res) => {
  res.render('chat')
})

// メッセージ送信のAPIエンドポイント
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body
    
    // ユーザーメッセージを履歴に追加
    chatHistory.push({
      role: 'user',
      content: message,
    })

    // OpenAI APIを呼び出し
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: chatHistory,
    })

    const reply = response.choices[0].message.content

    // AIの返答を履歴に追加
    chatHistory.push({
      role: 'assistant',
      content: reply,
    })

    // 返答を返す
    res.json({ reply })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'エラーが発生しました' })
  }
})

// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
}) 