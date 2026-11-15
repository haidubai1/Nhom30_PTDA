-- Tin Tức HaUI — MySQL 8 schema (utf8mb4)
CREATE DATABASE IF NOT EXISTS bantin30 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bantin30;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('manager','editor') NOT NULL DEFAULT 'editor',
  status ENUM('active','locked') NOT NULL DEFAULT 'active',
  auth_version INT UNSIGNED NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- Ma trận phân quyền theo vai trò (US0301). Chỉ lưu quyền của vai trò 'editor'.
CREATE TABLE IF NOT EXISTS role_permissions (
  role ENUM('manager','editor') NOT NULL,
  permission VARCHAR(20) NOT NULL,
  PRIMARY KEY (role, permission)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_name (name),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  status ENUM('draft','pending','rejected','approved','scheduled','published') NOT NULL DEFAULT 'draft',
  reject_reason VARCHAR(500) NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  publish_at DATETIME NULL,
  published_at DATETIME NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_articles_status_pub (status, published_at),
  KEY ix_articles_author (author_id),
  KEY ix_articles_category (category_id),
  CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT fk_articles_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  article_id BIGINT UNSIGNED NOT NULL,
  author_name VARCHAR(80) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  status ENUM('pending','approved') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_comments_article (article_id, status),
  CONSTRAINT fk_comments_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lượt xem gộp theo ngày để thống kê (US0801–0803)
CREATE TABLE IF NOT EXISTS article_daily_views (
  article_id BIGINT UNSIGNED NOT NULL,
  day DATE NOT NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, day),
  KEY ix_adv_day (day),
  CONSTRAINT fk_adv_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Bảng app_sessions do express-mysql-session tự tạo.
