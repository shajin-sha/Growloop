import { useEffect, useState } from "react";

import { getGitHubAppInfo, type GitHubAppInfo } from "../api/experimentsApi";

export function useGitHubApp() {
  const [app, setApp] = useState<GitHubAppInfo | null>(null);

  useEffect(() => {
    let isMounted = true;

    getGitHubAppInfo()
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
