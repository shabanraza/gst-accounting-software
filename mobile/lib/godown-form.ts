export type GodownFormDraft = {
  name: string
}

export function createInitialGodownForm(name = ''): GodownFormDraft {
  return { name }
}

export function validateGodownForm(form: GodownFormDraft) {
  if (!form.name.trim()) {
    return 'Godown name is required.'
  }
  return null
}

export function buildCreateGodownInput(form: GodownFormDraft, companyId: string) {
  return {
    companyId,
    name: form.name.trim(),
  }
}

export function buildUpdateGodownInput(
  form: GodownFormDraft,
  companyId: string,
  godownId: string,
) {
  return {
    companyId,
    godownId,
    name: form.name.trim(),
  }
}
