alter table experiment_variants
  add column if not exists commit_sha text;
