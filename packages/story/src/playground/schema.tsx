import { useState } from 'react';
import { FieldKey, useDataEngine } from '@fumari/stf';
import type { TypeNode } from '../lib/types';
import { getDefaultValue } from '../get-default-values';

export interface FieldInfo {
  unionIndex: number;
  intersection?: {
    merged: TypeNode;
  };
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

    if (node.type === 'intersection') {
      // For intersection, merge all object types
      const objects = node.types.filter((t) => t.type === 'object') as Array<
        Extract<TypeNode, { type: 'object' }>
      >;
      if (objects.length > 0) {
        const merged: TypeNode = {
          type: 'object',
          properties: objects.flatMap((obj) => obj.properties),
        };
        out.intersection = { merged };
      }
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
      } else if (updated.intersection) {
        valueNode = updated.intersection.merged;
      }

      engine.update(fieldName, getDefaultValue(valueNode));
    },
  };
}

/**
 * Resolve TypeNode (no-op for TypeNode, but kept for API compatibility).
 */
export function useResolvedTypeNode(node: TypeNode): TypeNode {
  return node;
}

/**
 * Schema scope (simplified for TypeNode - no readOnly/writeOnly needed).
 */
export interface SchemaScope {
  writeOnly: boolean;
  readOnly: boolean;
}

export function useSchemaScope(): SchemaScope {
  // For TypeNode, we don't need readOnly/writeOnly, but keep for compatibility
  return {
    writeOnly: false,
    readOnly: false,
  };
}

// Placeholder for anyFields equivalent
export const anyFields: TypeNode = {
  type: 'unknown',
  typeName: 'any',
};

