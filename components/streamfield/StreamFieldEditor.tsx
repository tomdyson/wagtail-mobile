import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BlockTypeSchema, StreamFieldBlock } from "../../lib/types";
import {
  defaultValueForBlock,
  findBlockSchema,
  generateBlockId,
  isBlockEditable,
} from "../../lib/streamfield";
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
  onDelete,
  onMoveUp,
  onMoveDown,
  editable,
  isFirst,
  isLast,
}: {
  block: StreamFieldBlock;
  blockTypes: BlockTypeSchema[];
  onBlockChange: (id: string, newValue: unknown) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  editable: boolean;
  isFirst: boolean;
  isLast: boolean;
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
        {editable && (
          <View style={styles.cardActions}>
            {!isFirst && (
              <Pressable
                onPress={() => onMoveUp(block.id)}
                hitSlop={8}
                style={styles.actionButton}
              >
                <Ionicons name="chevron-up" size={18} color="#9CA3AF" />
              </Pressable>
            )}
            {!isLast && (
              <Pressable
                onPress={() => onMoveDown(block.id)}
                hitSlop={8}
                style={styles.actionButton}
              >
                <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
              </Pressable>
            )}
            <Pressable
              onPress={() => onDelete(block.id)}
              hitSlop={8}
              style={styles.actionButton}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </Pressable>
          </View>
        )}
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

  const handleDelete = useCallback(
    (blockId: string) => {
      Alert.alert("Delete block", "Remove this block?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onChange(blocks.filter((b) => b.id !== blockId)),
        },
      ]);
    },
    [blocks, onChange]
  );

  const handleMoveUp = useCallback(
    (blockId: string) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx <= 0) return;
      const updated = [...blocks];
      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
      onChange(updated);
    },
    [blocks, onChange]
  );

  const handleMoveDown = useCallback(
    (blockId: string) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < 0 || idx >= blocks.length - 1) return;
      const updated = [...blocks];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
      onChange(updated);
    },
    [blocks, onChange]
  );

  const handleAddBlock = useCallback(
    (bt: BlockTypeSchema) => {
      const newBlock: StreamFieldBlock = {
        type: bt.type,
        value: defaultValueForBlock(bt.schema),
        id: generateBlockId(),
      };
      onChange([...blocks, newBlock]);
    },
    [blocks, onChange]
  );

  const editableTypes = editable
    ? blockTypes.filter((bt) => isBlockEditable(bt.schema))
    : [];

  if (blocks.length === 0 && editableTypes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No content blocks</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          blockTypes={blockTypes}
          onBlockChange={handleBlockChange}
          onDelete={handleDelete}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          editable={editable}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
        />
      ))}
      {editableTypes.length > 0 && (
        <View style={styles.addBlockRow}>
          {editableTypes.map((bt) => (
            <Pressable
              key={bt.type}
              style={({ pressed }) => [
                styles.addBlockChip,
                pressed && styles.addBlockChipPressed,
              ]}
              onPress={() => handleAddBlock(bt)}
            >
              <Text style={styles.addBlockChipText}>
                + {bt.type.replace(/_/g, " ")}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
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
    flexWrap: "wrap",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  actionButton: {
    padding: 4,
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
  addBlockRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addBlockChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
  },
  addBlockChipPressed: {
    backgroundColor: "#EFF6FF",
  },
  addBlockChipText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },
});
