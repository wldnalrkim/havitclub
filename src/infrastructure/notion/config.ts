const TEST_ENVIRONMENT = "test";

export function isNotionTestEnvironment() {
  return (
    process.env.NOTION_DATA_MODE === TEST_ENVIRONMENT ||
    process.env.VERCEL_ENV === "preview"
  );
}

export function getNotionEnvironmentVariable(name: string) {
  const environmentName = isNotionTestEnvironment() ? `${name}_TEST` : name;
  return process.env[environmentName];
}

export function isProductionDeployment() {
  return process.env.VERCEL_ENV === "production";
}

export function isTestDateOverrideEnabled() {
  return !isProductionDeployment() && (
    process.env.NODE_ENV !== "production" ||
    isNotionTestEnvironment() ||
    process.env.ENABLE_TEST_DATE === "true"
  );
}
