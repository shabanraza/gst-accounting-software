import { isExpoWeb } from './platform.ts'
import { WORKSPACE_COMPANY_KEY } from './env.ts'

async function readValue() {
  if (isExpoWeb()) {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(WORKSPACE_COMPANY_KEY)
  }

  const SecureStore = await import('expo-secure-store')
  return SecureStore.getItemAsync(WORKSPACE_COMPANY_KEY)
}

async function writeValue(companyId: string) {
  if (isExpoWeb()) {
    localStorage.setItem(WORKSPACE_COMPANY_KEY, companyId)
    return
  }

  const SecureStore = await import('expo-secure-store')
  await SecureStore.setItemAsync(WORKSPACE_COMPANY_KEY, companyId)
}

async function deleteValue() {
  if (isExpoWeb()) {
    localStorage.removeItem(WORKSPACE_COMPANY_KEY)
    return
  }

  const SecureStore = await import('expo-secure-store')
  await SecureStore.deleteItemAsync(WORKSPACE_COMPANY_KEY)
}

export async function readPreferredCompanyId() {
  return readValue()
}

export async function writePreferredCompanyId(companyId: string) {
  await writeValue(companyId)
}

export async function clearWorkspaceStorage() {
  await deleteValue()
}
