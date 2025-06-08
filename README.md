# ai_agent_sample

## ビルド&起動

```bash
# rootディレクトリ直下で下記コマンド実行
docker build -t ai_agent_sample .
docker run -d -p 3000:3000 --env-file .env ai_agent_sample
```

※将来的にaws ECSで起動することを想定しているため、dockerで起動している
