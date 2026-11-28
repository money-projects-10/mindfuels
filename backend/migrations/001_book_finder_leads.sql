-- Book Finder leads (parents, teachers and schools who asked for a recommended list).
-- Run once on the database. Safe to re-run: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS `book_finder_leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `email` VARCHAR(255) NOT NULL,
  `name` VARCHAR(120) NULL,
  `user_type` ENUM('parent', 'teacher', 'school') NOT NULL,
  `class_bands` VARCHAR(255) NOT NULL,          -- comma-separated band keys, e.g. "lkg,ukg"
  `focus_areas` VARCHAR(255) NULL,              -- comma-separated focus keys, empty = everything
  `recommended_product_ids` TEXT NULL,          -- comma-separated product_id values at time of request
  `consent` TINYINT(1) NOT NULL DEFAULT 0,      -- 1 = agreed to receive the list and occasional offers
  `unsubscribed_at` DATETIME NULL,              -- set when the person uses the unsubscribe link
  `school_name` VARCHAR(160) NULL,
  `school_city` VARCHAR(100) NULL,
  `school_phone` VARCHAR(20) NULL,
  `school_students` INT NULL,
  `utm_source` VARCHAR(100) NULL,
  `utm_medium` VARCHAR(100) NULL,
  `utm_campaign` VARCHAR(100) NULL,
  `converted` TINYINT(1) NOT NULL DEFAULT 0,    -- 1 once an order with this email is paid (filled in later)
  `ip_address` VARCHAR(64) NULL,
  INDEX `idx_bf_email` (`email`),
  INDEX `idx_bf_created` (`created_at`),
  INDEX `idx_bf_type` (`user_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
