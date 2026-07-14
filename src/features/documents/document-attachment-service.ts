export type DocumentAttachmentRecord = {
  id: string
  companyId: string
  linkedDocumentType: string
  linkedDocumentId: string
  storageKey: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  createdAt: Date
}

export type CreateDocumentAttachmentInput = Omit<
  DocumentAttachmentRecord,
  'id' | 'createdAt'
>

export interface DocumentAttachmentRepository {
  create: (
    attachment: DocumentAttachmentRecord,
  ) => Promise<DocumentAttachmentRecord>
  findById: (id: string) => Promise<DocumentAttachmentRecord | null>
}

export class CrossCompanyAttachmentError extends Error {
  constructor() {
    super('Attachment storage key must belong to the same company')
    this.name = 'CrossCompanyAttachmentError'
  }
}

export async function createDocumentAttachment(
  repository: DocumentAttachmentRepository,
  input: CreateDocumentAttachmentInput,
): Promise<DocumentAttachmentRecord> {
  if (!input.storageKey.includes(`/${input.companyId}/`)) {
    throw new CrossCompanyAttachmentError()
  }

  return repository.create({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  })
}

/** Stub object-storage adapter — replace with Cloudflare R2 in production. */
export type ObjectStorageAdapter = {
  putObject: (input: {
    key: string
    body: Uint8Array
    contentType: string
  }) => Promise<{ key: string }>
  getSignedUrl: (key: string) => Promise<string>
}

export class InMemoryObjectStorageAdapter implements ObjectStorageAdapter {
  private objects = new Map<string, { body: Uint8Array; contentType: string }>()

  async putObject(input: {
    key: string
    body: Uint8Array
    contentType: string
  }) {
    this.objects.set(input.key, {
      body: input.body,
      contentType: input.contentType,
    })
    return { key: input.key }
  }

  async getSignedUrl(key: string) {
    return `memory://${key}`
  }
}
