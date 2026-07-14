export type CompanyRole =
  'owner' | 'admin' | 'accountant' | 'billing' | 'inventory' | 'readonly'

export type MembershipRecord = {
  id: string
  companyId: string
  userId: string
  role: CompanyRole
  createdAt: Date
}

export interface MembershipRepository {
  create: (membership: MembershipRecord) => Promise<MembershipRecord>
  findByCompanyAndUser: (
    companyId: string,
    userId: string,
  ) => Promise<MembershipRecord | null>
  listByUserId: (userId: string) => Promise<Array<MembershipRecord>>
  listByCompanyId: (companyId: string) => Promise<Array<MembershipRecord>>
  updateRole: (
    companyId: string,
    userId: string,
    role: CompanyRole,
  ) => Promise<MembershipRecord | null>
  remove: (companyId: string, userId: string) => Promise<void>
}

export class InsufficientRoleError extends Error {
  constructor(role: CompanyRole | null, allowedRoles: Array<CompanyRole>) {
    super(
      role
        ? `Role '${role}' is not permitted for this action (requires one of: ${allowedRoles.join(', ')})`
        : `No membership found for this company (requires one of: ${allowedRoles.join(', ')})`,
    )
    this.name = 'InsufficientRoleError'
  }
}

export type Capability =
  | 'manage_company'
  | 'manage_masters'
  | 'manage_inventory'
  | 'post_sales'
  | 'post_purchase'
  | 'post_voucher'
  | 'post_payment'
  | 'view'

const ALL_CAPABILITIES: Array<Capability> = [
  'manage_company',
  'manage_masters',
  'manage_inventory',
  'post_sales',
  'post_purchase',
  'post_voucher',
  'post_payment',
  'view',
]

const roleCapabilities: Record<CompanyRole, Array<Capability>> = {
  owner: ALL_CAPABILITIES,
  admin: ALL_CAPABILITIES,
  accountant: [
    'manage_masters',
    'post_sales',
    'post_purchase',
    'post_voucher',
    'post_payment',
    'view',
  ],
  billing: ['post_sales', 'post_payment', 'view'],
  inventory: ['manage_inventory', 'view'],
  readonly: ['view'],
}

export function roleHasCapability(
  role: CompanyRole,
  capability: Capability,
): boolean {
  return roleCapabilities[role].includes(capability)
}

export function rolesForCapability(capability: Capability): Array<CompanyRole> {
  return (Object.keys(roleCapabilities) as Array<CompanyRole>).filter((role) =>
    roleCapabilities[role].includes(capability),
  )
}

/**
 * Loads the caller's membership for a company and verifies it grants the
 * requested capability. Returns the membership so callers can record the actor.
 */
export async function assertCapability(
  repository: MembershipRepository,
  input: { companyId: string; userId: string; capability: Capability },
): Promise<MembershipRecord> {
  return assertMembershipRole(repository, {
    companyId: input.companyId,
    userId: input.userId,
    allowedRoles: rolesForCapability(input.capability),
  })
}

export async function assertMembershipRole(
  repository: MembershipRepository,
  input: {
    companyId: string
    userId: string
    allowedRoles: Array<CompanyRole>
  },
): Promise<MembershipRecord> {
  const membership = await repository.findByCompanyAndUser(
    input.companyId,
    input.userId,
  )

  if (!membership || !input.allowedRoles.includes(membership.role)) {
    throw new InsufficientRoleError(
      membership?.role ?? null,
      input.allowedRoles,
    )
  }

  return membership
}

export async function assertCompanyMembership(
  repository: MembershipRepository,
  input: { companyId: string; userId: string },
): Promise<MembershipRecord> {
  return assertMembershipRole(repository, {
    companyId: input.companyId,
    userId: input.userId,
    allowedRoles: Object.keys(roleCapabilities) as Array<CompanyRole>,
  })
}

export async function assignCompanyMembership(
  repository: MembershipRepository,
  input: { companyId: string; userId: string; role: CompanyRole },
): Promise<MembershipRecord> {
  const existing = await repository.findByCompanyAndUser(
    input.companyId,
    input.userId,
  )
  if (existing) {
    return existing
  }

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    userId: input.userId,
    role: input.role,
    createdAt: new Date(),
  })
}
