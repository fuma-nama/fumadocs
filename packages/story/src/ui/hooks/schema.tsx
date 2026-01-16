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
    const initialInfo = attachedData.get(fieldName);
    if (initialInfo) return initialInfo;

    const out: FieldInfo = {
      unionIndex: 0,
    };

    if (node.type === 'union') {
      // Try to find which union type matches the current value
      const matchingIndex = node.types.findIndex(validate);
      out.unionIndex = matchingIndex === -1 ? 0 : matchingIndex;
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

function validate(node: TypeNode, value: unknown): boolean {
  switch (node.type) {
    case 'array':
      return Array.isArray(value) && value.every((item) => validate(node.elementType, item));
    case 'enum':
      return node.members.some((member) => member.value === value);
    case 'intersection':
      return validate(node.intersection, value);
    case 'union':
      return node.types.some((t) => validate(t, value));
    case 'null':
      return value === 'null';
    case 'literal':
      return node.value === value;
    case 'unknown':
    case 'never':
      return true;
    case 'object':
      return (
        typeof value === 'object' &&
        value !== null &&
        node.properties.every((prop) => {
          const propValue = value[prop.name as never];
          return (!prop.required && propValue === undefined) || validate(prop.type, propValue);
        })
      );
    default:
      return typeof value === node.type;
  }
}
