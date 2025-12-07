// src/config/validation.schema.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  APP_NAME: Joi.string().default('School Management API'),
  APP_PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().optional(),

  LOG_LEVEL: Joi.string()
    .valid('debug', 'log', 'warn', 'error')
    .default('debug'),

  DATABASE_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGINS: Joi.string().allow('', null),

  RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),

  FILE_UPLOAD_ROOT: Joi.string().default('./uploads'),
  FILE_UPLOAD_PROFILE_DIR: Joi.string().default('profiles'),
  MAX_PROFILE_PHOTO_SIZE_KB: Joi.number().integer().min(1).default(200),

  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('docs'),
  SWAGGER_USERNAME: Joi.string().optional(),
  SWAGGER_PASSWORD: Joi.string().optional(),

  APP_TIMEZONE: Joi.string().default('Asia/Tehran'),
  APP_LOCALE: Joi.string().default('fa-IR'),

  FILE_UPLOAD_PREREG_DIR: Joi.string().default('preregistrations'),

});
