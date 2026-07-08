export type User = {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  is_verified: boolean;
  created_at: Date;
};

export type Project = {
  project_id: string;
  project_name: string;
  author: string;
  created_at: Date;
  content: string;
};

export type LanguageOptions = "bun" | "go" | "node" | "python";

export type ProjectConfig = {
  language: LanguageOptions;
  env?: Record<string, string>;
};
