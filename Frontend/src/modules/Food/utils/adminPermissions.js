export const FEATURE_SETTINGS_OWNER_EMAIL = "badeadmin@gmail.com"

export function canAccessFeatureSettings(adminUser) {
  const email = String(adminUser?.email || "").trim().toLowerCase()
  return email === FEATURE_SETTINGS_OWNER_EMAIL
}
