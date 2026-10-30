import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import type { CategorySlice } from '@/domains/dashboard/summary';
import { formatShare } from '@/domains/dashboard/summary';
import { Money } from '@/shared/money';

import { Text } from './text';
import { radius, spacing, useTheme } from './theme';

const SIZE = 200;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * Gráfico de rosca (US-013): cada fatia é um círculo com `strokeDasharray`.
 * Tocar numa fatia (ou na legenda) mostra valor e porcentagem no centro.
 */
export function DonutChart({ slices, total }: { slices: CategorySlice[]; total: Money }) {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = slices.find((s) => s.categoryId === selectedId) ?? null;

  let offset = 0;
  return (
    <View style={{ gap: spacing.xl, alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surfaceRaised} strokeWidth={STROKE} fill="none" />
            {slices.map((slice) => {
              const length = slice.share * C;
              const gap = slices.length > 1 ? 3 : 0;
              const circle = (
                <Circle
                  key={slice.categoryId}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={slice.color}
                  strokeWidth={selectedId === slice.categoryId ? STROKE + 6 : STROKE}
                  strokeDasharray={`${Math.max(length - gap, 0)} ${C - Math.max(length - gap, 0)}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  fill="none"
                  opacity={selectedId && selectedId !== slice.categoryId ? 0.35 : 1}
                  onPress={() => setSelectedId(selectedId === slice.categoryId ? null : slice.categoryId)}
                />
              );
              offset += length;
              return circle;
            })}
          </G>
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center', maxWidth: 120 }} pointerEvents="none">
          <Text variant="label" color="textMuted" numberOfLines={1}>
            {selected ? selected.name : 'Total gasto'}
          </Text>
          <Text variant="heading" adjustsFontSizeToFit numberOfLines={1}>
            {(selected ? selected.total : total).format()}
          </Text>
          {selected && (
            <Text variant="caption" style={{ color: selected.color, fontWeight: '800' }}>
              {formatShare(selected.share)}
            </Text>
          )}
        </View>
      </View>

      <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
        {slices.map((slice) => (
          <Pressable
            key={slice.categoryId}
            onPress={() => setSelectedId(selectedId === slice.categoryId ? null : slice.categoryId)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.sm,
              backgroundColor: selectedId === slice.categoryId ? colors.surfaceRaised : 'transparent',
            }}>
            <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: slice.color }} />
            <Text style={{ flex: 1 }} numberOfLines={1}>
              {slice.name}
            </Text>
            <Text variant="caption" color="textMuted">
              {formatShare(slice.share)}
            </Text>
            <Text variant="bodyStrong" style={{ minWidth: 92, textAlign: 'right' }}>
              {slice.total.format()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
