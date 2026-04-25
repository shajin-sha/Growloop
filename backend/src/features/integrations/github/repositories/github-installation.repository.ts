export type GitHubInstallation = {
  installationId: number;
  accountLogin: string;
  targetType: string;
  setupAction: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertGitHubInstallationInput = {
  installationId: number;
  accountLogin: string;
  targetType: string;
  setupAction?: string | null;
};

export interface GitHubInstallationRepository {
  findLatest(): Promise<GitHubInstallation | null>;
  upsert(input: UpsertGitHubInstallationInput): Promise<GitHubInstallation>;
  deleteById(installationId: number): Promise<void>;
}
