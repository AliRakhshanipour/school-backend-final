// src/config/configuration.ts

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  app: {
    name: process.env.APP_NAME ?? 'School Management API',
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    url: process.env.APP_URL ?? 'http://localhost:3000',
    timezone: process.env.APP_TIMEZONE ?? 'Asia/Tehran',
    locale: process.env.APP_LOCALE ?? 'fa-IR',
  },

  logging: {
    level: process.env.LOG_LEVEL ?? 'debug',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  security: {
    cors: {
      origins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    },
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    },
  },

  upload: {
    root: process.env.FILE_UPLOAD_ROOT ?? './uploads',
    profileDir: process.env.FILE_UPLOAD_PROFILE_DIR ?? 'profiles',
    preregDir: process.env.FILE_UPLOAD_PREREG_DIR ?? 'preregistrations',
    maxProfileSizeKb: parseInt(
      process.env.MAX_PROFILE_PHOTO_SIZE_KB ?? '200',
      10,
    ),
  },


  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    path: process.env.SWAGGER_PATH ?? 'docs',
    username: process.env.SWAGGER_USERNAME,
    password: process.env.SWAGGER_PASSWORD,
  },
});
