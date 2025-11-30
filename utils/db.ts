import { openDB, DBSchema } from 'idb';

interface GameScore {
  name: string;
  score: number;
  level: number;
  date: Date;
}

interface AI_NexusDB extends DBSchema {
  scores: {
    key: number;
    value: GameScore;
    indexes: { 'by-score': number };
  };
}

const DB_NAME = 'ai-nexus-db';
const STORE_NAME = 'scores';

/**
 * 初始化数据库
 */
export async function initDB() {
  const db = await openDB<AI_NexusDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-score', 'score');
    },
  });
  return db;
}

/**
 * 保存分数
 */
export async function saveScore(name: string, score: number, level: number) {
  const db = await initDB();
  await db.add(STORE_NAME, {
    name,
    score,
    level,
    date: new Date(),
  });
}

/**
 * 获取排行榜 (前 10 名)
 */
export async function getTopScores(limit: number = 10) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const index = tx.store.index('by-score');
  
  // IDB 的游标是从小到大的，我们需要反转
  let cursor = await index.openCursor(null, 'prev');
  const results: GameScore[] = [];

  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }

  return results;
}
