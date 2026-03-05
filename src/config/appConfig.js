const DEFAULT_APP_VERSION = "0.9.9";

export const APP_VERSION =
  String(import.meta.env.VITE_APP_VERSION ?? DEFAULT_APP_VERSION).trim() ||
  DEFAULT_APP_VERSION;
export const APP_VERSION_LABEL = `V ${APP_VERSION}`;
