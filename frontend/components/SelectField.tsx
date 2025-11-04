import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  GestureResponderEvent,
  DimensionValue,
} from 'react-native';

type Option = { label: string; value: string };

type SelectFieldProps = {
  label: string;
  placeholder?: string;
  value?: string | null;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  width?: DimensionValue;
  testID?: string;
};

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  placeholder = 'Select...',
  value,
  options,
  onChange,
  required,
  error,
  width = '100%',
  testID,
}) => {
  const [visible, setVisible] = useState(false);

  const selectedLabel = useMemo(() => {
    const found = options.find(o => o.value === value);
    return found?.label ?? '';
  }, [options, value]);

  const close = () => setVisible(false);
  const open = (e: GestureResponderEvent) => {
    e.preventDefault();
    setVisible(true);
  };

  return (
    <View style={[styles.wrapper, { width }]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <TouchableOpacity
        onPress={open}
        activeOpacity={0.8}
        style={[styles.input, !!error && styles.inputError]}
        testID={testID}
      >
        <Text
          style={[
            styles.valueText,
            !selectedLabel && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <View />
        </TouchableOpacity>

        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.value);
                    close();
                  }}
                  style={styles.optionRow}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: 360 }}
          />

          <TouchableOpacity style={styles.cancelBtn} onPress={close}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '600',
  },
  required: {
    color: '#E74C3C',
    fontWeight: '700',
  },
  input: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  caret: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  errorText: {
    marginTop: 6,
    color: '#EF4444',
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,

    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 15,
    color: '#111827',
  },
  optionSelected: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default SelectField;