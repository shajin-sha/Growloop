import type { SdkExperimentConfig, TrackEventPayload } from "@growloop/shared";

type GrowloopOptions = {
  apiUrl: string;
  experimentId: string;
  autoPageview?: boolean;
};

type StoredAssignment = {
  experimentId: string;
  variantId: string;
};

const VISITOR_KEY = "growloop.visitorId";
const ASSIGNMENT_KEY = "growloop.assignments";

class GrowloopClient {
  private config: SdkExperimentConfig | null = null;
  private variantId: string | null = null;

  constructor(private readonly options: GrowloopOptions) {}

  async init() {
    this.config = await this.fetchConfig();

    if (!this.config || this.config.status !== "running" || this.config.variants.length === 0) {
      return;
    }

    this.variantId = this.getOrAssignVariant(this.config);

    if (this.options.autoPageview !== false) {
      await this.track("pageview");
    }
  }

  async track(eventName: string, metadata?: Record<string, unknown>) {
    if (!this.variantId) {
      return;
    }

    const payload: TrackEventPayload = {
      experimentId: this.options.experimentId,
      variantId: this.variantId,
      visitorId: getVisitorId(),
      eventName,
      url: window.location.href,
      metadata
    };

    await fetch(`${this.options.apiUrl}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    });
  }

  getVariantId() {
    return this.variantId;
  }

  private async fetchConfig() {
    const response = await fetch(
      `${this.options.apiUrl}/api/sdk/experiments/${this.options.experimentId}`
    );

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { experiment: SdkExperimentConfig };
    return body.experiment;
  }

  private getOrAssignVariant(config: SdkExperimentConfig) {
    const assignments = readAssignments();
    const existing = assignments.find((item) => item.experimentId === config.id);

    if (existing && config.variants.some((variant) => variant.id === existing.variantId)) {
      return existing.variantId;
    }

    const variantId = chooseVariant(config, getVisitorId());
    const next = assignments.filter((item) => item.experimentId !== config.id);
    next.push({ experimentId: config.id, variantId });
    localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(next));

    return variantId;
  }
}

function chooseVariant(config: SdkExperimentConfig, visitorId: string) {
  const totalWeight = config.variants.reduce((total, variant) => total + variant.weight, 0);
  const bucket = hash(`${config.id}:${visitorId}`) % totalWeight;
  let cursor = 0;

  for (const variant of config.variants) {
    cursor += variant.weight;

    if (bucket < cursor) {
      return variant.id;
    }
  }

  return config.variants[0].id;
}

function getVisitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);

  if (existing) {
    return existing;
  }

  const visitorId = crypto.randomUUID();
  localStorage.setItem(VISITOR_KEY, visitorId);

  return visitorId;
}

function readAssignments(): StoredAssignment[] {
  const value = localStorage.getItem(ASSIGNMENT_KEY);

  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as StoredAssignment[];
  } catch {
    return [];
  }
}

function hash(value: string) {
  let result = 0;

  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }

  return Math.abs(result);
}

function readScriptOptions(): GrowloopOptions | null {
  const script = document.currentScript as HTMLScriptElement | null;

  if (!script?.dataset.apiUrl || !script.dataset.experimentId) {
    return null;
  }

  return {
    apiUrl: script.dataset.apiUrl.replace(/\/$/, ""),
    experimentId: script.dataset.experimentId,
    autoPageview: script.dataset.autoPageview !== "false"
  };
}

export function createGrowloop(options: GrowloopOptions) {
  const client = new GrowloopClient(options);
  void client.init();
  return client;
}

declare global {
  interface Window {
    Growloop?: GrowloopClient;
  }
}

const scriptOptions = typeof document === "undefined" ? null : readScriptOptions();

if (scriptOptions && typeof window !== "undefined") {
  window.Growloop = createGrowloop(scriptOptions);
}
