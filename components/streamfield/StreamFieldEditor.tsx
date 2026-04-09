import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BlockTypeSchema, StreamFieldBlock } from "../../lib/types";
import { findBlockSchema, isBlockEditable } from "../../lib/streamfield";
import { BlockEditor } from "./BlockEditor";
import { ReadOnlyBlock } from "./ReadOnlyBlock";

interface Props {
  blocks: StreamFieldBlock[];
  blockTypes: BlockTypeSchema[];
  onChange: (blocks: StreamFieldBlock[]) => void;
  editable: boolean;
}

const BlockCard = React.memo(function BlockCard({
  block,
  blockTypes,
  onBlockChange,
  editable,
}: {
  block: StreamFieldBlock;
  blockTypes: BlockTypeSchema[];
  onBlockChange: (id: string, newValue: unknown) => void;
  editable: boolean;
}) {
  const schema = findBlockSchema(block.type, blockTypes);
  const canEdit = editable && schema != null && isBlockEditable(schema);
  const typeLabel = block.type.replace(/_/g, " ");

  return (
    <View style={[styles.card, !canEdit && styles.cardReadOnly]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, !canEdit && styles.typeBadgeReadOnly]}>
          <Text style={styles.typeBadgeText}>{typeLabel}</Text>
        </View>
        {!canEdit && <Text style={styles.viewOnly}>(view only)</Text>}
      </View>
      {canEdit && schema ? (
        <BlockEditor
          value={block.value}
          schema={schema}
          onChange={(newValue) => onBlockChange(block.id, newValue)}
          editable={true}
        />
      ) : (
        <ReadOnlyBlock
          value={block.value}
          schemaType={schema?.type ?? "unknown"}
        />
      )}
    </View>
  );
});

export function StreamFieldEditor({
  blocks,
  blockTypes,
  onChange,
  editable,
}: Props) {
  const handleBlockChange = useCallback(
    (blockId: string, newValue: unknown) => {
      const updated = blocks.map((b) =>
        b.id === blockId ? { ...b, value: newValue } : b
      );
      onChange(updated);
    },
    [blocks, onChange]
  );

  if (blocks.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No content blocks</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          blockTypes={blockTypes}
          onBlockChange={handleBlockChange}
          editable={editable}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  cardReadOnly: {
    backgroundColor: "#F9FAFB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeReadOnly: {
    backgroundColor: "#F3F4F6",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4F46E5",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  viewOnly: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  empty: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
