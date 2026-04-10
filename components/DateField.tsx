import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatDateDisplay,
  parseDateValue,
  serializePickedDate,
} from "../lib/forms/date";

interface Props {
  label: string;
  value: string | null;
  onChange: (isoString: string | null) => void;
  mode: "date" | "datetime";
  required?: boolean;
  editable?: boolean;
}

export function DateField({
  label,
  value,
  onChange,
  mode,
  required = false,
  editable = true,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = parseDateValue(value, mode) ?? new Date();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (event.type === "set" && date) {
      onChange(serializePickedDate(date, mode));
    }
    if (event.type === "dismissed") {
      setShowPicker(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.valueButton,
          pressed && editable && styles.valuePressed,
          !editable && styles.valueDisabled,
        ]}
        onPress={() => editable && setShowPicker(!showPicker)}
        disabled={!editable}
      >
        <Text
          style={[
            styles.valueText,
            !value && styles.valuePlaceholder,
          ]}
        >
          {formatDateDisplay(value, mode)}
        </Text>
        {editable && value && !required && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onChange(null);
              setShowPicker(false);
            }}
            hitSlop={8}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode={mode === "datetime" ? "datetime" : "date"}
          display="spinner"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    color: "#EF4444",
  },
  valueButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FAFAFA",
  },
  valuePressed: {
    backgroundColor: "#F3F4F6",
  },
  valueDisabled: {
    opacity: 0.6,
  },
  valueText: {
    fontSize: 16,
    color: "#111827",
  },
  valuePlaceholder: {
    color: "#9CA3AF",
  },
  clearText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
});
