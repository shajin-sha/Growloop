import { useEffect, useState } from "react";

import {
  getGitHubAppInfo,
  registerGitHubInstallation,
  type GitHubAppInfo
} from "../api/experimentsApi";

export function useGitHubApp() {
  const [app, setApp] = useState<GitHubAppInfo | null>(null);

  useEffect(() => {
    let isMounted = true;

    syncGitHubApp()
      .then((value) => {
        if (isMounted) {
          setApp(value);
        }
      })
      .catch(() => {
        if (isMounted) {
          setApp(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return app;
}

async function syncGitHubApp() {
  const params = new URLSearchParams(window.location.search);
  const installationId = params.get("installation_id");
  const setupAction = params.get("setup_action") ?? undefined;

  if (installationId) {
    await registerGitHubInstallation(Number(installationId), setupAction);
    params.delete("installation_id");
    params.delete("setup_action");

    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`
    );
  }

  return getGitHubAppInfo();
}
