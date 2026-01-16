import { useState } from 'react';
import { FieldKey, useDataEngine } from '@fumari/stf';
import type { TypeNode } from '../../types';
import { getDefaultValue } from '../../utils/get-default-values';

export interface FieldInfo {
  unionIndex: number;
}

/**
 * A hook to store dynamic info of a field, such as selected type in union.
 */
export function useFieldInfo(
  fieldName: FieldKey,
  node: TypeNode,
): {
  info: FieldInfo;
  updateInfo: (value: Partial<FieldInfo>) => void;
} {
  const engine = useDataEngine();
  const attachedData = engine.attachedData<FieldInfo>('field-info');
  const [info, setInfo] = useState<FieldInfo>(() => {
    const value = engine.get(fieldName);
    const initialInfo = attachedData.get(fieldName);
    if (initialInfo) return initialInfo;

    const out: FieldInfo = {
      unionIndex: 0,
    };

    if (node.type === 'union') {
      // Try to find which union type matches the current value
      const matchingIndex = node.types.findIndex((type) => {
        const defaultValue = getDefaultValue(type);
        return JSON.stringify(value) === JSON.stringify(defaultValue);
      });
      out.unionIndex = matchingIndex >= 0 ? matchingIndex : 0;
    }

    return out;
  });

  attachedData.set(fieldName, info);
  return {
    info,
    updateInfo: (value) => {
      const updated = {
        ...info,
        ...value,
      };

      if (updated.unionIndex === info.unionIndex) return;

      setInfo(updated);

      let valueNode: TypeNode = node;
      if (node.type === 'union' && updated.unionIndex >= 0) {
        valueNode = node.types[updated.unionIndex]!;
      }

      engine.update(fieldName, getDefaultValue(valueNode));
    },
  };
}

// Placeholder for anyFields equivalent
export const anyFields: TypeNode = {
  type: 'unknown',
};
