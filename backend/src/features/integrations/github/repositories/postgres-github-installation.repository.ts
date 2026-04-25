import type { DbPool } from "../../../../db/pool";
import type {
  GitHubInstallation,
  GitHubInstallationRepository,
  UpsertGitHubInstallationInput
} from "./github-installation.repository";

type InstallationRow = {
  installation_id: string;
  account_login: string;
  target_type: string;
  setup_action: string | null;
  created_at: Date;
  updated_at: Date;
};

export class PostgresGitHubInstallationRepository implements GitHubInstallationRepository {
  constructor(private readonly db: DbPool) {}

  async findLatest(): Promise<GitHubInstallation | null> {
    const result = await this.db.query(
      `select *
       from github_app_installations
       order by updated_at desc
       limit 1`
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapInstallation(result.rows[0]);
  }

  async upsert(input: UpsertGitHubInstallationInput): Promise<GitHubInstallation> {
    const result = await this.db.query(
      `insert into github_app_installations (
         installation_id,
         account_login,
         target_type,
         setup_action
       )
       values ($1, $2, $3, $4)
       on conflict (installation_id)
       do update set
         account_login = excluded.account_login,
         target_type = excluded.target_type,
         setup_action = excluded.setup_action,
         updated_at = now()
       returning *`,
      [
        input.installationId,
        input.accountLogin,
        input.targetType,
        input.setupAction ?? null
      ]
    );

    return mapInstallation(result.rows[0]);
  }
}

function mapInstallation(row: InstallationRow): GitHubInstallation {
  return {
    installationId: Number(row.installation_id),
    accountLogin: row.account_login,
    targetType: row.target_type,
    setupAction: row.setup_action,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
