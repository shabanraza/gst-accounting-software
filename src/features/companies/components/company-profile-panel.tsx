import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type ProfileFields = {
  addressLine1: string
  addressLine2: string
  city: string
  pincode: string
  pan: string
  contactPhone: string
  contactEmail: string
  bankName: string
  bankAccountNumber: string
  bankIfsc: string
  authorizedSignatory: string
  logoUrl: string
}

const emptyProfile: ProfileFields = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  pincode: '',
  pan: '',
  contactPhone: '',
  contactEmail: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  authorizedSignatory: '',
  logoUrl: '',
}

const fields: Array<{ key: keyof ProfileFields; label: string; placeholder?: string }> = [
  { key: 'addressLine1', label: 'Address line 1', placeholder: 'Shop 12, MG Road' },
  { key: 'addressLine2', label: 'Address line 2', placeholder: 'Near City Mall' },
  { key: 'city', label: 'City' },
  { key: 'pincode', label: 'PIN code' },
  { key: 'pan', label: 'PAN', placeholder: 'ABCDE1234F' },
  { key: 'contactPhone', label: 'Phone' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'authorizedSignatory', label: 'Authorised signatory' },
  { key: 'bankName', label: 'Bank name' },
  { key: 'bankAccountNumber', label: 'Bank account number' },
  { key: 'bankIfsc', label: 'IFSC' },
  { key: 'logoUrl', label: 'Logo URL' },
]

export function CompanyProfilePanel() {
  const trpc = useTRPC()
  const { companyId, company, refresh } = useWorkspace()

  const [profile, setProfile] = React.useState<ProfileFields>(emptyProfile)

  React.useEffect(() => {
    if (!company) return
    setProfile({
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      city: company.city,
      pincode: company.pincode,
      pan: company.pan,
      contactPhone: company.contactPhone,
      contactEmail: company.contactEmail,
      bankName: company.bankName,
      bankAccountNumber: company.bankAccountNumber,
      bankIfsc: company.bankIfsc,
      authorizedSignatory: company.authorizedSignatory,
      logoUrl: company.logoUrl,
    })
  }, [company])

  const updateProfile = useMutation(
    trpc.companies.updateProfile.mutationOptions(),
  )

  async function handleSave() {
    if (!companyId) return
    try {
      await updateProfile.mutateAsync({ companyId, ...profile })
      await refresh()
      toast.success('Company profile saved')
    } catch (err) {
      toast.error(getFormErrorMessage(err, 'Unable to save profile'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Company profile</CardTitle>
        <CardDescription>
          Used on GST tax invoices: address, PAN, bank details, and signatory.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div className="flex flex-col gap-1.5" key={field.key}>
            <label
              className="text-xs font-medium"
              htmlFor={`company-${field.key}`}
            >
              {field.label}
            </label>
            <Input
              id={`company-${field.key}`}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              placeholder={field.placeholder}
              value={profile[field.key]}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          disabled={!companyId || updateProfile.isPending}
          onClick={() => void handleSave()}
          type="button"
        >
          {updateProfile.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </CardFooter>
    </Card>
  )
}
