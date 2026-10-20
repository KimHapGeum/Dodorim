-- 두드림 MariaDB 스키마
-- 사진/영상/글 본문은 파일(STORAGE_DIR)에 두고, DB에는 목록·검색·정렬에 필요한 정보만 저장합니다.
--   게시글: posts/<게시글ID>/<슬라이드번호>/{text.txt, 사진, 영상}
--   공지  : notices/<공지ID>/{content.txt, 첨부파일}
-- Docker 첫 실행 때 /docker-entrypoint-initdb.d 에서 자동 실행됩니다.

-- 대상 DB는 docker-compose의 MARIADB_DATABASE(기본 dodorim)입니다.

SET NAMES utf8mb4;

-- 관리자 계정 (비밀번호는 scrypt 해시). 첫 계정은 서버 시작 시 .env의 ADMIN_USERNAME/ADMIN_PASSWORD로 생성되며 마스터 계정이 됨.
-- 마스터는 하위 관리자 계정을 만들고 고치고 지울 수 있음. token_version은 비밀번호를 바꾸면 올라가서 예전 로그인을 끊음
CREATE TABLE admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_master     TINYINT(1)   NOT NULL DEFAULT 0,
  token_version INT          NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 대단원(1) > 중단원(2) > 소단원(3) 분류. 아이콘 파일은 categories/<ID>/ 에 저장
CREATE TABLE categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT          NULL,
  depth       TINYINT      NOT NULL CHECK (depth BETWEEN 1 AND 3),
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  icon_file   VARCHAR(255) NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE KEY uq_categories_parent_name (parent_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 게시글(강의). 소단원(depth 3)에 속함. 슬라이드는 posts/<ID>/<번호>/ 폴더로 관리
CREATE TABLE posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT          NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- 게시글이 남아 있는 분류는 삭제할 수 없음 (폴더가 고아가 되지 않도록)
  CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  KEY idx_posts_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 공지사항. 본문은 notices/<ID>/content.txt
CREATE TABLE notices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  notice_date DATE         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_notices_date (notice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 메인 화면 슬라이더 배너. 이미지는 banners/<ID>/ 에 저장, sort_order 순서대로 노출
CREATE TABLE banners (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  image_file  VARCHAR(255) NOT NULL,
  color       CHAR(7)      NOT NULL DEFAULT '#0056b3',
  sub_color   CHAR(7)      NOT NULL DEFAULT '#a5c0e4',
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 건의사항 (이름 없이 내용만)
CREATE TABLE suggestions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  content    TEXT         NOT NULL,
  status     ENUM('pending', 'done') NOT NULL DEFAULT 'pending',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_suggestions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 분류 (프론트엔드 categoryData와 동일)
INSERT INTO categories (id, parent_id, depth, name, sort_order) VALUES
  (1, NULL, 1, '키오스크', 1),
  (2, NULL, 1, '셀프 계산대', 2),
  (3, NULL, 1, '전자기기', 3),
  (10, 1, 2, '병원', 1), (11, 1, 2, '공공시설', 2), (12, 1, 2, '음식점/카페', 3),
  (13, 2, 2, '대형 매장', 1), (14, 2, 2, '무인 매장', 2),
  (15, 3, 2, '휴대폰', 1), (16, 3, 2, 'ATM', 2);

INSERT INTO categories (parent_id, depth, name, sort_order) VALUES
  (10, 3, '동네병원', 1), (10, 3, '종합병원', 2), (10, 3, '약국 수납', 3),
  (11, 3, '민원/발급', 1), (11, 3, '기차역', 2), (11, 3, '공항', 3), (11, 3, '영화관', 4),
  (12, 3, '버거킹', 1), (12, 3, '롯데리아', 2), (12, 3, '맥도날드', 3), (12, 3, '메가커피', 4), (12, 3, '컴포즈', 5), (12, 3, '스타벅스', 6),
  (13, 3, '다이소', 1), (13, 3, '홈플러스', 2),
  (14, 3, '아이스크림', 1), (14, 3, '무인편의점', 2),
  (15, 3, '전화/문자하기', 1),
  (16, 3, 'KB 국민은행', 1), (16, 3, 'NH 농협은행', 2);
