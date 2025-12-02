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
import { semanticColors } from '@/constants/colors';

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
      <Text style={[styles.label, { color: semanticColors.textPrimary }]}>
        {label}
        {required ? <Text style={[styles.required, { color: semanticColors.interactiveDanger }]}> *</Text> : null}
      </Text>

      <TouchableOpacity
        onPress={open}
        activeOpacity={0.8}
        style={[
          styles.input,
          { backgroundColor: semanticColors.bgSurface, borderColor: semanticColors.borderSubtle },
          !!error && { borderColor: semanticColors.interactiveDanger },
        ]}
        testID={testID}
      >
        <Text
          style={[
            styles.valueText,
            { color: semanticColors.textPrimary },
            !selectedLabel && { color: semanticColors.textMuted },
          ]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Text style={[styles.caret, { color: semanticColors.textMuted }]}>▾</Text>
      </TouchableOpacity>

      {!!error && <Text style={[styles.errorText, { color: semanticColors.interactiveDanger }]}>{error}</Text>}

      <Modal transparent animationType="fade" visible={visible} onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close}>
          <View />
        </TouchableOpacity>

        <View style={[styles.modalCard, { backgroundColor: semanticColors.bgSurface }]}>
          <Text style={[styles.modalTitle, { color: semanticColors.textPrimary }]}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: semanticColors.borderSubtle }]} />}
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
                  <Text style={[styles.optionLabel, { color: semanticColors.textPrimary }, selected && { color: semanticColors.interactivePrimary, fontWeight: '700' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: 360 }}
          />

          <TouchableOpacity style={styles.cancelBtn} onPress={close}>
            <Text style={[styles.cancelText, { color: semanticColors.textSecondary }]}>Cancel</Text>
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
    marginBottom: 6,
    fontWeight: '600',
  },
  required: {
    fontWeight: '700',
  },
  input: {
    height: 44,
    borderWidth: 1,
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
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  caret: {
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    marginTop: 6,
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
    marginBottom: 8,
  },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionSelected: {
    fontWeight: '700',
  },
  separator: {
    height: 1,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  cancelText: {
    fontWeight: '600',
  },
});

export default SelectField;