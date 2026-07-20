import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'

import { Badge } from '@/components/ui/badge'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { spacing } from '@/lib/spacing'
import { fontFamilies, themeColors, typography } from '@/lib/theme'
import { Text, View } from '@/tw'

export type VoucherReviewLine = {
  key: string
  name: string
  detail: string
  badge?: string
  amount?: string
}

export function VoucherReviewPreview({
  title,
  partyName,
  documentDate,
  documentMeta,
  placeOfSupply,
  paymentLabel,
  lines,
  taxableAmount,
  gstAmount,
  grandTotal,
}: {
  title: string
  partyName: string
  documentDate: string
  documentMeta?: string
  placeOfSupply: string
  paymentLabel?: string
  lines: Array<VoucherReviewLine>
  taxableAmount?: string
  gstAmount?: string
  grandTotal?: string
}) {
  return (
    <View style={styles.invoice}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{title}</Text>
          <Text style={styles.party} numberOfLines={2}>
            {partyName}
          </Text>
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={themeColors.mutedForeground}
            />
            <Text style={styles.meta}>{formatShortDate(documentDate)}</Text>
          </View>
        </View>
        <View style={styles.headerBadges}>
          {paymentLabel ? <Badge label={paymentLabel} variant="primary" /> : null}
          {documentMeta ? (
            <Text style={styles.metaRight} numberOfLines={1}>
              {documentMeta}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.supplyCard}>
        <View style={styles.supplyIcon}>
          <Ionicons name="location-outline" size={16} color={themeColors.primary} />
        </View>
        <View style={styles.supplyCopy}>
          <Text style={styles.label}>Place of supply</Text>
          <Text style={styles.value}>{placeOfSupply}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Items</Text>
        <Text style={styles.sectionMeta}>{lines.length} line</Text>
      </View>

      <View style={styles.lineList}>
        {lines.map((line) => (
          <View key={line.key} style={styles.lineRow}>
            <View style={styles.lineIcon}>
              <Ionicons name="cube-outline" size={16} color={themeColors.primary} />
            </View>
            <View style={styles.lineCopy}>
              <View style={styles.lineTitleRow}>
                <Text style={styles.lineTitle} numberOfLines={1}>
                  {line.name}
                </Text>
                {line.amount ? (
                  <Text style={styles.lineAmount} numberOfLines={1}>
                    {line.amount}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.lineDetail} numberOfLines={1}>
                {line.detail}
              </Text>
              {line.badge ? (
                <View style={styles.lineBadge}>
                  <Badge label={line.badge} variant="primary" />
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {taxableAmount && gstAmount && grandTotal ? (
        <View style={styles.totals}>
          <TotalRow label="Taxable amount" value={formatInr(taxableAmount)} />
          <TotalRow label="GST" value={formatInr(gstAmount)} />
          <View style={styles.totalDivider} />
          <TotalRow label="Grand total" value={formatInr(grandTotal)} emphasis />
        </View>
      ) : null}
    </View>
  )
}

function TotalRow({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={emphasis ? styles.grandLabel : styles.totalLabel}>{label}</Text>
      <Text style={emphasis ? styles.grandValue : styles.totalValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  invoice: {
    backgroundColor: themeColors.card,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingBottom: spacing.lg,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: themeColors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  party: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: 20,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.regular,
    fontSize: typography.body,
  },
  headerBadges: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  metaRight: {
    maxWidth: 150,
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  supplyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    backgroundColor: themeColors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  supplyIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: themeColors.card,
  },
  supplyCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  label: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  value: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  sectionTitle: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
  },
  sectionMeta: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.regular,
    fontSize: typography.caption,
  },
  lineList: {
    gap: spacing.sm,
  },
  lineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
    paddingBottom: spacing.md,
  },
  lineIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: themeColors.primaryMuted,
  },
  lineCopy: {
    minWidth: 0,
    flex: 1,
    gap: 4,
  },
  lineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lineTitle: {
    minWidth: 0,
    flex: 1,
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
  },
  lineAmount: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  lineDetail: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.regular,
    fontSize: typography.label,
  },
  lineBadge: {
    marginTop: 2,
  },
  totals: {
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#f8fbff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalLabel: {
    color: themeColors.mutedForeground,
    fontFamily: fontFamilies.regular,
    fontSize: typography.body,
  },
  totalValue: {
    color: themeColors.foreground,
    fontFamily: fontFamilies.semibold,
    fontSize: typography.body,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  totalDivider: {
    height: 1,
    backgroundColor: themeColors.border,
  },
  grandLabel: {
    color: themeColors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    fontWeight: '600',
  },
  grandValue: {
    color: themeColors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
})
