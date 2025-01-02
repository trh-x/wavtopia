interface Config {
  database: {
    url: string;
  };
  storage: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  server: {
    port: number;
    jwtSecret: string;
  };
  tools: {
    exportToWavPath: string;
  };
}

const config: Config = {
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://wavtopia:wavtopia@localhost:5432/wavtopia",
  },
  storage: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ROOT_USER || "wavtopia",
    secretKey: process.env.MINIO_ROOT_PASSWORD || "wavtopia123",
    bucket: process.env.MINIO_BUCKET || "wavtopia",
  },
  server: {
    port: parseInt(process.env.PORT || "3000"),
    jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  },
  tools: {
    exportToWavPath:
      process.env.EXPORT_TO_WAV_PATH || "/usr/local/bin/export-to-wav",
  },
};

export default config;
