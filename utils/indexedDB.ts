// IndexedDBの操作を行うユーティリティ関数

// データベース名とバージョン
const DB_NAME = 'chat_history_db';
const DB_VERSION = 1;

// 会話履歴の型定義
export type Conversation = {
  id: number;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  subAgents?: SubAgent[]; // サブエージェント設定を追加
  model?: string; // モデル設定を追加
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
      
      // 会話履歴を保存するオブジェクトストアを作成
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });
};

// 新しい会話を作成
export const createConversation = async (title: string = '新しい会話'): Promise<number> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    
    const now = new Date();
    const conversation: Omit<Conversation, 'id'> = {
      title,
      messages: [],
      createdAt: now,
      updatedAt: now
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

// サブエージェント設定を更新
export const updateConversationSubAgents = async (id: number, subAgents: SubAgent[]): Promise<void> => {
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
      
      conversation.subAgents = subAgents;
      conversation.updatedAt = new Date();
      
      const updateRequest = store.put(conversation);
      
      updateRequest.onsuccess = () => {
        resolve();
      };
      
      updateRequest.onerror = () => {
        reject('サブエージェント設定の更新に失敗しました');
      };
    };
    
    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
};

// モデル設定を更新する関数を追加
export const updateConversationModel = async (id: number, model: string): Promise<void> => {
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
      
      conversation.model = model;
      conversation.updatedAt = new Date();
      
      const updateRequest = store.put(conversation);
      
      updateRequest.onsuccess = () => {
        resolve();
      };
      
      updateRequest.onerror = () => {
        reject('モデル設定の更新に失敗しました');
      };
    };
    
    request.onerror = () => {
      reject('会話の取得に失敗しました');
    };
  });
}; 
