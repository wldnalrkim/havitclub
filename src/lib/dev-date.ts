const COOKIE_NAME = "havitclub_dev_date";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getClientOperationalDate() {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  return value && DATE_PATTERN.test(value) ? value : null;
}

export function getOperationalDate() {
  return getClientOperationalDate() ?? undefined;
}

export const DEV_DATE_COOKIE_NAME = COOKIE_NAME;
