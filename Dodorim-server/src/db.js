import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'dodorim',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'dodorim',
  charset: 'utf8mb4',
  dateStrings: true, // 날짜가 UTC 변환으로 하루 밀리지 않도록 DB 값(한국 시간) 그대로 문자열로 받음
  connectionLimit: 10,
});

export const query = async (sql, params) => (await pool.query(sql, params))[0];

// 예전에 만든 DB를 지금 코드에 맞춤. 서버 시작 때마다 실행되며 여러 번 실행해도 안전 (MariaDB 문법)
// db/schema.sql은 DB를 처음 만들 때만 실행되므로, 표 구조를 바꾸면 schema.sql과 여기 둘 다 고칠 것
export async function upgradeSchema() {
  // 관리자 계정: 마스터·토큰 버전 (2026-10)
  await query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_master TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0');
  // 강의 대표 사진 기능 제거 (2026-10)
  await query('ALTER TABLE posts DROP COLUMN IF EXISTS cover_file');
}

// fn(conn) 안의 쿼리를 한 번에 반영. 중간에 실패하면 모두 되돌림
export async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await fn(conn);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// DB 컨테이너가 앱보다 늦게 준비될 수 있으므로 연결될 때까지 재시도
export async function waitForDb(retries = 30) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      if (i >= retries) throw e;
      console.log(`DB 연결 대기 중... (${i}/${retries}) ${e.code || e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
