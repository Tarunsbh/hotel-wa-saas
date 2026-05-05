-- ============================================================
-- Hotel WhatsApp SaaS — Complete MySQL Schema
-- Version: 1.0.0  |  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================
-- Tables:
--   1.  hotels
--   2.  users
--   3.  token_storage
--   4.  tags
--   5.  guests
--   6.  guest_tags
--   7.  templates
--   8.  template_components
--   9.  campaigns
--   10. campaign_recipients
--   11. conversations
--   12. messages
--   13. automation_rules
--   14. automation_logs
--   15. logs
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+00:00';

-- ─────────────────────────────────────────────────────────────
-- 1. HOTELS  (root multi-tenant entity)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hotels` (
  `id`                        VARCHAR(36)  NOT NULL,
  `name`                      VARCHAR(255) NOT NULL,
  `slug`                      VARCHAR(100) NOT NULL COMMENT 'URL-safe unique identifier',
  `phone_number_id`           VARCHAR(100) NOT NULL COMMENT 'Meta Phone Number ID',
  `waba_id`                   VARCHAR(100) NOT NULL COMMENT 'WhatsApp Business Account ID',
  `business_id`               VARCHAR(100)          COMMENT 'Meta Business Portfolio ID',
  `webhook_verify_token`      VARCHAR(255) NOT NULL,
  `timezone`                  VARCHAR(100) NOT NULL DEFAULT 'UTC',
  `country`                   VARCHAR(10)  NOT NULL DEFAULT 'IN',
  `plan`                      ENUM('starter','professional','enterprise') NOT NULL DEFAULT 'starter',
  `is_active`                 TINYINT(1)   NOT NULL DEFAULT 1,
  `settings`                  JSON                  COMMENT 'Arbitrary hotel-level settings',
  `deleted_at`                DATETIME              COMMENT 'Soft delete timestamp',
  `created_at`                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hotels_slug` (`slug`),
  INDEX `idx_hotels_waba_id` (`waba_id`),
  INDEX `idx_hotels_phone_number_id` (`phone_number_id`),
  INDEX `idx_hotels_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. USERS  (agents / managers / admins per hotel)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(36)  NOT NULL,
  `hotel_id`      VARCHAR(36)  NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name`          VARCHAR(255) NOT NULL,
  `role`          ENUM('admin','manager','agent') NOT NULL DEFAULT 'agent',
  `avatar_url`    VARCHAR(500),
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `last_login_at` DATETIME,
  `deleted_at`    DATETIME,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email_hotel` (`email`, `hotel_id`),
  INDEX `idx_users_hotel_id` (`hotel_id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_users_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. TOKEN_STORAGE  (encrypted WhatsApp tokens per hotel)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `token_storage` (
  `id`             VARCHAR(36)  NOT NULL,
  `hotel_id`       VARCHAR(36)  NOT NULL,
  `token_type`     ENUM('access','refresh','system_user') NOT NULL DEFAULT 'access',
  `token_value`    TEXT         NOT NULL COMMENT 'AES-256 encrypted token',
  `token_hash`     VARCHAR(64)  NOT NULL COMMENT 'SHA-256 hash for lookup/comparison',
  `app_id`         VARCHAR(100),
  `scopes`         JSON                  COMMENT 'Token permission scopes',
  `expires_at`     DATETIME              COMMENT 'NULL = never expires',
  `refresh_at`     DATETIME              COMMENT 'Schedule refresh before expiry',
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `refresh_count`  INT          NOT NULL DEFAULT 0,
  `last_refreshed` DATETIME,
  `last_used_at`   DATETIME,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_token_hotel_id` (`hotel_id`),
  INDEX `idx_token_type_active` (`token_type`, `is_active`),
  INDEX `idx_token_refresh_at` (`refresh_at`),
  INDEX `idx_token_expires_at` (`expires_at`),
  CONSTRAINT `fk_token_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. TAGS  (guest categorization per hotel)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tags` (
  `id`         VARCHAR(36)  NOT NULL,
  `hotel_id`   VARCHAR(36)  NOT NULL,
  `name`       VARCHAR(100) NOT NULL,
  `color`      VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
  `deleted_at` DATETIME,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tag_name_hotel` (`name`, `hotel_id`),
  INDEX `idx_tags_hotel_id` (`hotel_id`),
  CONSTRAINT `fk_tags_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. GUESTS  (contacts / hotel customers)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `guests` (
  `id`               VARCHAR(36)  NOT NULL,
  `hotel_id`         VARCHAR(36)  NOT NULL,
  `phone`            VARCHAR(30)  NOT NULL COMMENT 'E.164 format e.g. +919876543210',
  `name`             VARCHAR(255),
  `email`            VARCHAR(255),
  `country_code`     VARCHAR(10),
  `language`         VARCHAR(10)  NOT NULL DEFAULT 'en',
  `gender`           ENUM('male','female','other'),
  `stay_status`      ENUM('arriving','in_house','checked_out','no_stay') NOT NULL DEFAULT 'no_stay',
  `check_in_date`    DATE,
  `check_out_date`   DATE,
  `room_number`      VARCHAR(20),
  `booking_ref`      VARCHAR(100) COMMENT 'PMS booking reference',
  `pms_guest_id`     VARCHAR(100) COMMENT 'PMS external guest ID',
  `nationality`      VARCHAR(100),
  `notes`            TEXT,
  `opt_in`           TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'WhatsApp marketing opt-in',
  `opt_in_at`        DATETIME,
  `opt_out_at`       DATETIME,
  `source`           ENUM('manual','csv','pms','api') NOT NULL DEFAULT 'manual',
  `custom_fields`    JSON                  COMMENT 'Hotel-specific custom fields',
  `deleted_at`       DATETIME,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_guest_phone_hotel` (`phone`, `hotel_id`),
  INDEX `idx_guests_hotel_id` (`hotel_id`),
  INDEX `idx_guests_phone` (`phone`),
  INDEX `idx_guests_stay_status` (`stay_status`),
  INDEX `idx_guests_check_in_date` (`check_in_date`),
  INDEX `idx_guests_check_out_date` (`check_out_date`),
  INDEX `idx_guests_pms_id` (`pms_guest_id`),
  INDEX `idx_guests_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_guests_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 6. GUEST_TAGS  (many-to-many pivot)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `guest_tags` (
  `guest_id`   VARCHAR(36) NOT NULL,
  `tag_id`     VARCHAR(36) NOT NULL,
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`guest_id`, `tag_id`),
  INDEX `idx_guest_tags_tag_id` (`tag_id`),
  CONSTRAINT `fk_guest_tags_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_guest_tags_tag`   FOREIGN KEY (`tag_id`)   REFERENCES `tags`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 7. TEMPLATES  (WhatsApp message templates)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `templates` (
  `id`              VARCHAR(36)  NOT NULL,
  `hotel_id`        VARCHAR(36)  NOT NULL,
  `wa_template_id`  VARCHAR(100)          COMMENT 'Meta template ID after submission',
  `name`            VARCHAR(255) NOT NULL,
  `display_name`    VARCHAR(255),
  `category`        ENUM('MARKETING','UTILITY','AUTHENTICATION') NOT NULL DEFAULT 'UTILITY',
  `language`        VARCHAR(20)  NOT NULL DEFAULT 'en_US',
  `status`          ENUM('DRAFT','PENDING','APPROVED','REJECTED','PAUSED','DISABLED') NOT NULL DEFAULT 'DRAFT',
  `rejection_reason`VARCHAR(500),
  `header_type`     ENUM('NONE','TEXT','IMAGE','VIDEO','DOCUMENT') NOT NULL DEFAULT 'NONE',
  `header_text`     VARCHAR(255),
  `header_media_url`VARCHAR(500),
  `body_text`       TEXT         NOT NULL,
  `footer_text`     VARCHAR(255),
  `variables`       JSON                  COMMENT 'Variable definitions [{name,example}]',
  `buttons`         JSON                  COMMENT 'CTA/quick reply buttons',
  `components_raw`  JSON                  COMMENT 'Full Meta components payload',
  `preview_data`    JSON                  COMMENT 'Sample variable values for preview',
  `synced_at`       DATETIME              COMMENT 'Last synced from Meta API',
  `deleted_at`      DATETIME,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_template_name_hotel` (`name`, `hotel_id`),
  INDEX `idx_templates_hotel_id` (`hotel_id`),
  INDEX `idx_templates_status` (`status`),
  INDEX `idx_templates_wa_id` (`wa_template_id`),
  INDEX `idx_templates_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_templates_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 8. CAMPAIGNS  (bulk message campaigns)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id`                VARCHAR(36)  NOT NULL,
  `hotel_id`          VARCHAR(36)  NOT NULL,
  `template_id`       VARCHAR(36)  NOT NULL,
  `created_by`        VARCHAR(36)  NOT NULL,
  `name`              VARCHAR(255) NOT NULL,
  `description`       TEXT,
  `audience_type`     ENUM('arriving','in_house','checked_out','all','tag','csv') NOT NULL,
  `audience_filter`   JSON                  COMMENT 'Filter criteria (tag IDs, date ranges, etc.)',
  `variable_values`   JSON                  COMMENT 'Static variable overrides',
  `scheduled_at`      DATETIME              COMMENT 'NULL = send immediately',
  `started_at`        DATETIME,
  `completed_at`      DATETIME,
  `status`            ENUM('draft','scheduled','running','completed','cancelled','failed') NOT NULL DEFAULT 'draft',
  `total_recipients`  INT          NOT NULL DEFAULT 0,
  `sent_count`        INT          NOT NULL DEFAULT 0,
  `delivered_count`   INT          NOT NULL DEFAULT 0,
  `read_count`        INT          NOT NULL DEFAULT 0,
  `failed_count`      INT          NOT NULL DEFAULT 0,
  `skipped_count`     INT          NOT NULL DEFAULT 0,
  `bull_job_id`       VARCHAR(255)          COMMENT 'BullMQ job reference',
  `deleted_at`        DATETIME,
  `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_campaigns_hotel_id` (`hotel_id`),
  INDEX `idx_campaigns_template_id` (`template_id`),
  INDEX `idx_campaigns_status` (`status`),
  INDEX `idx_campaigns_scheduled_at` (`scheduled_at`),
  INDEX `idx_campaigns_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_campaigns_hotel`    FOREIGN KEY (`hotel_id`)    REFERENCES `hotels`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_campaigns_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `fk_campaigns_user`     FOREIGN KEY (`created_by`)  REFERENCES `users`     (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 9. CAMPAIGN_RECIPIENTS  (per-guest campaign delivery status)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `campaign_recipients` (
  `id`              VARCHAR(36)  NOT NULL,
  `campaign_id`     VARCHAR(36)  NOT NULL,
  `guest_id`        VARCHAR(36)  NOT NULL,
  `phone`           VARCHAR(30)  NOT NULL,
  `variable_values` JSON                  COMMENT 'Personalized variable values',
  `wa_message_id`   VARCHAR(100),
  `status`          ENUM('pending','sent','delivered','read','failed','skipped') NOT NULL DEFAULT 'pending',
  `error_code`      VARCHAR(50),
  `error_message`   VARCHAR(500),
  `retry_count`     INT          NOT NULL DEFAULT 0,
  `sent_at`         DATETIME,
  `delivered_at`    DATETIME,
  `read_at`         DATETIME,
  `failed_at`       DATETIME,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recipient_campaign_guest` (`campaign_id`, `guest_id`),
  INDEX `idx_cr_campaign_id` (`campaign_id`),
  INDEX `idx_cr_guest_id` (`guest_id`),
  INDEX `idx_cr_status` (`status`),
  INDEX `idx_cr_wa_message_id` (`wa_message_id`),
  CONSTRAINT `fk_cr_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cr_guest`    FOREIGN KEY (`guest_id`)    REFERENCES `guests`    (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 10. CONVERSATIONS  (one thread per guest per hotel)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `conversations` (
  `id`               VARCHAR(36)  NOT NULL,
  `hotel_id`         VARCHAR(36)  NOT NULL,
  `guest_id`         VARCHAR(36)  NOT NULL,
  `assigned_agent_id`VARCHAR(36)            COMMENT 'NULL = unassigned',
  `status`           ENUM('open','pending','resolved','archived') NOT NULL DEFAULT 'open',
  `channel`          ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
  `last_message`     TEXT,
  `last_message_at`  DATETIME,
  `last_message_type`ENUM('text','image','document','audio','video','template','location','interactive','sticker','unknown') DEFAULT 'text',
  `unread_count`     INT          NOT NULL DEFAULT 0,
  `resolved_at`      DATETIME,
  `resolved_by`      VARCHAR(36),
  `tags`             JSON                  COMMENT 'Conversation-level tag labels',
  `deleted_at`       DATETIME,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_conv_guest_hotel` (`guest_id`, `hotel_id`),
  INDEX `idx_conv_hotel_id` (`hotel_id`),
  INDEX `idx_conv_status` (`status`),
  INDEX `idx_conv_agent_id` (`assigned_agent_id`),
  INDEX `idx_conv_last_message_at` (`last_message_at`),
  INDEX `idx_conv_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_conv_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_conv_agent` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 11. MESSAGES  (individual WhatsApp messages)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `messages` (
  `id`               VARCHAR(36)  NOT NULL,
  `conversation_id`  VARCHAR(36)  NOT NULL,
  `hotel_id`         VARCHAR(36)  NOT NULL,
  `wa_message_id`    VARCHAR(100)          COMMENT 'Meta wamid — unique per message',
  `direction`        ENUM('inbound','outbound') NOT NULL,
  `type`             ENUM('text','image','document','audio','video','template','location','interactive','sticker','reaction','unknown') NOT NULL DEFAULT 'text',
  `body`             TEXT,
  `media_url`        VARCHAR(1000),
  `media_id`         VARCHAR(100)          COMMENT 'Meta media object ID',
  `media_mime_type`  VARCHAR(100),
  `media_filename`   VARCHAR(255),
  `media_caption`    TEXT,
  `template_id`      VARCHAR(36),
  `campaign_id`      VARCHAR(36),
  `template_vars`    JSON,
  `status`           ENUM('pending','sent','delivered','read','failed','deleted') NOT NULL DEFAULT 'pending',
  `error_code`       VARCHAR(50),
  `error_message`    VARCHAR(500),
  `sent_at`          DATETIME,
  `delivered_at`     DATETIME,
  `read_at`          DATETIME,
  `failed_at`        DATETIME,
  `context_msg_id`   VARCHAR(100)          COMMENT 'Replied-to message wa_message_id',
  `sender_id`        VARCHAR(36)           COMMENT 'User who sent (outbound only)',
  `metadata`         JSON                  COMMENT 'Raw webhook payload',
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_message_wa_id` (`wa_message_id`),
  INDEX `idx_msg_conversation_id` (`conversation_id`),
  INDEX `idx_msg_hotel_id` (`hotel_id`),
  INDEX `idx_msg_direction` (`direction`),
  INDEX `idx_msg_status` (`status`),
  INDEX `idx_msg_campaign_id` (`campaign_id`),
  INDEX `idx_msg_template_id` (`template_id`),
  INDEX `idx_msg_created_at` (`created_at`),
  CONSTRAINT `fk_msg_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_hotel`        FOREIGN KEY (`hotel_id`)        REFERENCES `hotels`        (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_template`     FOREIGN KEY (`template_id`)     REFERENCES `templates`     (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_campaign`     FOREIGN KEY (`campaign_id`)     REFERENCES `campaigns`     (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_sender`       FOREIGN KEY (`sender_id`)       REFERENCES `users`         (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 12. AUTOMATION_RULES  (trigger-based messaging rules)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `automation_rules` (
  `id`                     VARCHAR(36)  NOT NULL,
  `hotel_id`               VARCHAR(36)  NOT NULL,
  `template_id`            VARCHAR(36)  NOT NULL,
  `created_by`             VARCHAR(36)  NOT NULL,
  `name`                   VARCHAR(255) NOT NULL,
  `description`            TEXT,
  `trigger_type`           ENUM('before_arrival','after_checkin','during_stay','before_checkout','after_checkout','custom_date') NOT NULL,
  `trigger_offset_hours`   INT          NOT NULL DEFAULT 0  COMMENT 'Hours before/after trigger event',
  `trigger_offset_direction` ENUM('before','after') NOT NULL DEFAULT 'after',
  `send_time`              TIME                  COMMENT 'Preferred send time (local hotel timezone)',
  `audience_type`          ENUM('all','arriving','in_house','checked_out','tag') NOT NULL DEFAULT 'all',
  `audience_filter`        JSON                  COMMENT 'Tag IDs or other filter criteria',
  `variable_values`        JSON                  COMMENT 'Variable value mappings',
  `conditions`             JSON                  COMMENT 'Extra conditions [{field,op,value}]',
  `is_active`              TINYINT(1)   NOT NULL DEFAULT 1,
  `run_count`              INT          NOT NULL DEFAULT 0,
  `last_run_at`            DATETIME,
  `deleted_at`             DATETIME,
  `created_at`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ar_hotel_id` (`hotel_id`),
  INDEX `idx_ar_template_id` (`template_id`),
  INDEX `idx_ar_trigger_type` (`trigger_type`),
  INDEX `idx_ar_is_active` (`is_active`),
  INDEX `idx_ar_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_ar_hotel`    FOREIGN KEY (`hotel_id`)    REFERENCES `hotels`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`),
  CONSTRAINT `fk_ar_user`     FOREIGN KEY (`created_by`)  REFERENCES `users`     (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 13. AUTOMATION_LOGS  (execution records per rule per guest)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `automation_logs` (
  `id`          VARCHAR(36)  NOT NULL,
  `rule_id`     VARCHAR(36)  NOT NULL,
  `hotel_id`    VARCHAR(36)  NOT NULL,
  `guest_id`    VARCHAR(36)  NOT NULL,
  `message_id`  VARCHAR(36)            COMMENT 'Message created by this automation',
  `status`      ENUM('success','skipped','failed') NOT NULL,
  `error`       TEXT,
  `metadata`    JSON,
  `executed_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auto_log_rule_guest` (`rule_id`, `guest_id`, `executed_at`),
  INDEX `idx_al_rule_id` (`rule_id`),
  INDEX `idx_al_hotel_id` (`hotel_id`),
  INDEX `idx_al_guest_id` (`guest_id`),
  INDEX `idx_al_status` (`status`),
  INDEX `idx_al_executed_at` (`executed_at`),
  CONSTRAINT `fk_al_rule`    FOREIGN KEY (`rule_id`)    REFERENCES `automation_rules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_al_hotel`   FOREIGN KEY (`hotel_id`)   REFERENCES `hotels`           (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_al_guest`   FOREIGN KEY (`guest_id`)   REFERENCES `guests`           (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_al_message` FOREIGN KEY (`message_id`) REFERENCES `messages`         (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 14. LOGS  (system / API / error logs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `logs` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `hotel_id`   VARCHAR(36),
  `user_id`    VARCHAR(36),
  `type`       ENUM('api','error','message','campaign','automation','token','system') NOT NULL DEFAULT 'system',
  `level`      ENUM('debug','info','warn','error','fatal') NOT NULL DEFAULT 'info',
  `message`    TEXT         NOT NULL,
  `context`    JSON                  COMMENT 'Structured context data',
  `request_id` VARCHAR(100)          COMMENT 'Correlation ID',
  `ip`         VARCHAR(45),
  `user_agent` VARCHAR(500),
  `duration_ms`INT,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_logs_hotel_id` (`hotel_id`),
  INDEX `idx_logs_type_level` (`type`, `level`),
  INDEX `idx_logs_created_at` (`created_at`),
  INDEX `idx_logs_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SAMPLE SEED DATA
-- ============================================================

-- Hotel
INSERT INTO `hotels` (`id`,`name`,`slug`,`phone_number_id`,`waba_id`,`business_id`,`webhook_verify_token`,`timezone`,`country`,`plan`,`is_active`) VALUES
('h-001','The Grand Palace Hotel','grand-palace','1004350432772558','1621359509122346','122095259211303615','apple','Asia/Kolkata','IN','professional',1);

-- Admin user (password: Admin@123)
INSERT INTO `users` (`id`,`hotel_id`,`email`,`password_hash`,`name`,`role`,`is_active`) VALUES
('u-001','h-001','admin@grandpalace.com','$2a$12$n1c8BQMxRB9TOJwFfqZ69.zK4pKXfhdPogKf2SuVDIhGyLzUH/8vK','Super Admin','admin',1),
('u-002','h-001','manager@grandpalace.com','$2a$12$n1c8BQMxRB9TOJwFfqZ69.zK4pKXfhdPogKf2SuVDIhGyLzUH/8vK','Hotel Manager','manager',1),
('u-003','h-001','alice@grandpalace.com','$2a$12$n1c8BQMxRB9TOJwFfqZ69.zK4pKXfhdPogKf2SuVDIhGyLzUH/8vK','Alice (Agent)','agent',1);

-- Tags
INSERT INTO `tags` (`id`,`hotel_id`,`name`,`color`) VALUES
('t-001','h-001','VIP','#f59e0b'),
('t-002','h-001','Repeat Guest','#6366f1'),
('t-003','h-001','Honeymoon','#ec4899'),
('t-004','h-001','Corporate','#3b82f6'),
('t-005','h-001','Requires Assistance','#ef4444');

-- Guests (3 arriving, 2 in-house, 1 checked out)
INSERT INTO `guests` (`id`,`hotel_id`,`phone`,`name`,`email`,`stay_status`,`check_in_date`,`check_out_date`,`room_number`,`source`,`opt_in`) VALUES
('g-001','h-001','+919876543210','Rahul Sharma','rahul@example.com','arriving','2026-05-02','2026-05-05','101','manual',1),
('g-002','h-001','+919812345678','Priya Patel','priya@example.com','arriving','2026-05-02','2026-05-04','205','csv',1),
('g-003','h-001','+917777888899','John Smith','john@example.com','in_house','2026-05-01','2026-05-06','312','api',1),
('g-004','h-001','+918888999900','Anjali Mehta','anjali@example.com','in_house','2026-04-30','2026-05-03','408','manual',1),
('g-005','h-001','+911234567890','David Lee','david@example.com','checked_out','2026-04-25','2026-04-30',NULL,'pms',1),
('g-006','h-001','+919999000011','Meera Nair','meera@example.com','arriving','2026-05-03','2026-05-07','505','manual',1);

-- Guest-Tag associations
INSERT INTO `guest_tags` (`guest_id`,`tag_id`) VALUES
('g-001','t-001'),('g-001','t-002'),
('g-003','t-001'),('g-003','t-004'),
('g-004','t-003'),
('g-005','t-002');

-- Sample approved template
INSERT INTO `templates` (`id`,`hotel_id`,`name`,`display_name`,`category`,`language`,`status`,`body_text`,`footer_text`,`variables`) VALUES
('tmpl-001','h-001','welcome_arrival','Welcome Arrival','UTILITY','en_US','APPROVED','Dear {{1}}, we are delighted to welcome you to {{2}}! Your reservation for {{3}} night(s) is confirmed. Check-in: {{4}}. Room: {{5}}. Our team is ready to make your stay memorable. For any assistance, reply to this message.','Grand Palace Hotel','[{"name":"guest_name","example":"Rahul"},{"name":"hotel_name","example":"Grand Palace"},{"name":"nights","example":"3"},{"name":"check_in","example":"2 May 2026"},{"name":"room","example":"101"}]'),
('tmpl-002','h-001','checkout_feedback','Checkout Feedback','MARKETING','en_US','APPROVED','Hi {{1}}, thank you for staying at {{2}}! We hope you had a wonderful experience. We would love to hear your feedback — it helps us serve you better. Reply REVIEW to share your thoughts!','Grand Palace Hotel','[{"name":"guest_name","example":"Priya"},{"name":"hotel_name","example":"Grand Palace"}]'),
('tmpl-003','h-001','mid_stay_services','Mid Stay Upsell','MARKETING','en_US','APPROVED','Hello {{1}}, hope you are enjoying your stay at {{2}}! 🌟 Did you know we offer:\n• Spa treatments (20% off today!)\n• Rooftop dining tonight\n• Late checkout (subject to availability)\nReply YES to book any of these!','Grand Palace Hotel','[{"name":"guest_name","example":"John"},{"name":"hotel_name","example":"Grand Palace"}]');

-- Automation Rules
INSERT INTO `automation_rules` (`id`,`hotel_id`,`template_id`,`created_by`,`name`,`trigger_type`,`trigger_offset_hours`,`trigger_offset_direction`,`send_time`,`audience_type`,`is_active`) VALUES
('ar-001','h-001','tmpl-001','u-001','Welcome Message — Arriving Guests','before_arrival',2,'before','10:00:00','arriving',1),
('ar-002','h-001','tmpl-003','u-001','Mid-Stay Upsell — Day 2','after_checkin',48,'after','14:00:00','in_house',1),
('ar-003','h-001','tmpl-002','u-001','Post-Checkout Feedback','after_checkout',3,'after','11:00:00','all',1);

-- ============================================================
-- END OF SCHEMA
-- ============================================================
