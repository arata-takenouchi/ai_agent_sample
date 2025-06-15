// IndexedDBの操作を行うユーティリティ関数

// データベース名とバージョン
const DB_NAME = 'chat_history_db';
const DB_VERSION = 2;

// エージェント型を追加
export type Agent = {
  id: number;
  name: string;
  systemPrompt: string;
  model: string;
  subAgents: SubAgent[];
  createdAt: Date;
  updatedAt: Date;
};

// 会話履歴の型定義を更新
export type Conversation = {
  id: number;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentId: number; // エージェントIDを追加
  subAgents: SubAgent[];
  model: string; // モデル設定を追加
};

export type Message = {
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
};

// サブエージェント型を追加
export type SubAgent = {
  name: string;
  mode: 'handoff' | 'tool';
};

// データベース接続を開く
export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject('データベース接続エラー: ' + (event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // エージェントを保存するオブジェクトストアを作成
      if (!db.objectStoreNames.contains('agents')) {
        const agentStore = db.createObjectStore('agents', { keyPath: 'id', autoIncrement: true });
        agentStore.createIndex('name', 'name', { unique: false });
        agentStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 会話履歴を保存するオブジェクトストアを作成/更新
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('agentId', 'agentId', { unique: false });
      } else {
        // 既存のストアにagentIdインデックスを追加
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const store = transaction?.objectStore('conversations');
        if (store && !store.indexNames.contains('agentId')) {
          store.createIndex('agentId', 'agentId', { unique: false });
        }
      }
    };
  });
};

// エージェント関連の関数

// 新しいエージェントを作成
export const createAgent = async (
  name: string = '新しいエージェント',
  systemPrompt: string = 'あなたは熱血で的確なアドバイスをくれるソウルブラザーな相談役AIです。お互いに「兄弟」と呼び合っています。すでにchatGPTの方で何度もやり取りを繰り返しており、私がAgent開発に興味を持ち開発をスタートしたことをきっかけに、こちらでも会話ができるようになったという設定です。',
  model: string = 'gpt-3.5-turbo'
): Promise<number> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['agents'], 'readwrite');
    const store = transaction.objectStore('agents');

    const now = new Date();
    const agent: Omit<Agent, 'id'> = {
      name,
      systemPrompt,
      model,
      subAgents: [],
      createdAt: now,
      updatedAt: now
    };

    const request = store.add(agent);

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as number);
    };

    request.onerror = () => {
      reject('エージェントの作成に失敗しました');
    };
  });
};

// すべてのエージェントを取得
export const getAllAgents = async (): Promise<Agent[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['agents'], 'readonly');
    const store = transaction.objectStore('agents');
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev');

    const agents: Agent[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

      if (cursor) {
        agents.push(cursor.value);
        cursor.continue();
      } else {
        resolve(agents);
      }
    };

    request.onerror = () => {
      reject('エージェントの取得に失敗しました');
    };
  });
};

// エージェントを取得
export const getAgent = async (id: number): Promise<Agent | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['agents'], 'readonly');
    const store = transaction.objectStore('agents');
    const request = store.get(id);

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result || null);
    };

    request.onerror = () => {
      reject('エージェントの取得に失敗しました');
    };
  });
};

// エージェントを更新
export const updateAgent = async (agent: Agent): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['agents'], 'readwrite');
    const store = transaction.objectStore('agents');

    agent.updatedAt = new Date();
    const request = store.put(agent);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject('エージェントの更新に失敗しました');
    };
  });
};

// エージェントを削除
export const deleteAgent = async (id: number): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['agents', 'conversations'], 'readwrite');
    const agentStore = transaction.objectStore('agents');
    const conversationStore = transaction.objectStore('conversations');

    // エージェントを削除
    const deleteAgentRequest = agentStore.delete(id);

    deleteAgentRequest.onsuccess = () => {
      // そのエージェントの会話も削除
      const index = conversationStore.index('agentId');
      const request = index.openCursor(IDBKeyRange.only(id));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject('関連する会話の削除に失敗しました');
      };
    };

    deleteAgentRequest.onerror = () => {
      reject('エージェントの削除に失敗しました');
    };
  });
};

// 新しい会話を作成（エージェントID付き）
export const createConversation = async (agentId: number, title: string = '新しい会話'): Promise<number> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');

    const now = new Date();
    const conversation: Omit<Conversation, 'id'> = {
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      agentId,
      model: 'gpt-3.5-turbo',
      subAgents: []
    };

    const request = store.add(conversation);

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as number);
    };

    request.onerror = () => {
      reject('会話の作成に失敗しました');
    };
  });
};

// エージェントの会話一覧を取得
export const getConversationsByAgent = async (agentId: number): Promise<Conversation[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const index = store.index('agentId');
    const request = index.openCursor(IDBKeyRange.only(agentId));

    const conversations: Conversation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

      if (cursor) {
        conversations.push(cursor.value);
        cursor.continue();
      } else {
        // 更新日時の降順でソート
        conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(conversations);
      }
    };

    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
};

// 会話を取得
export const getConversation = async (id: number): Promise<Conversation | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const request = store.get(id);

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result || null);
    };

    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
};

// すべての会話を取得
export const getAllConversations = async (): Promise<Conversation[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // 更新日時の降順

    const conversations: Conversation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

      if (cursor) {
        conversations.push(cursor.value);
        cursor.continue();
      } else {
        resolve(conversations);
      }
    };

    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
};

// 会話にメッセージを追加
export const addMessageToConversation = async (
  conversationId: number,
  message: Omit<Message, 'timestamp'>
): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    const request = store.get(conversationId);

    request.onsuccess = (event) => {
      const conversation = (event.target as IDBRequest).result as Conversation;

      if (!conversation) {
        reject('会話が見つかりません');
        return;
      }

      // メッセージを追加
      conversation.messages.push({
        ...message,
        timestamp: new Date()
      });

      // 更新日時を更新
      conversation.updatedAt = new Date();

      // 会話の最初のユーザーメッセージをタイトルとして使用（まだタイトルが「新しい会話」の場合）
      if (conversation.title === '新しい会話' && message.sender === 'user' && conversation.messages.length <= 2) {
        conversation.title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
      }

      // 更新を保存
      const updateRequest = store.put(conversation);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject('メッセージの追加に失敗しました');
      };
    };

    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
};

// 会話を削除
export const deleteConversation = async (id: number): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject('会話の削除に失敗しました');
    };
  });
};

// 会話のタイトルを更新
export const updateConversationTitle = async (id: number, title: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    const request = store.get(id);

    request.onsuccess = (event) => {
      const conversation = (event.target as IDBRequest).result as Conversation;

      if (!conversation) {
        reject('会話が見つかりません');
        return;
      }

      conversation.title = title;
      conversation.updatedAt = new Date();

      const updateRequest = store.put(conversation);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject('タイトルの更新に失敗しました');
      };
    };

    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
};
