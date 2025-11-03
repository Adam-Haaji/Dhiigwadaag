
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

export default function RequestScreen() {
  const handleCreateRequest = () => {
    router.push('/createRequest');
  };

  const handleEmergencyRequest = () => {
    router.push('/emergencyRequest');
  };

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const recentRequests = [
    {
      id: 1,
      bloodType: 'O-',
      location: 'City Hospital',
      urgency: 'Critical',
      timeAgo: '2 hours ago',
      status: 'Active',
    },
    {
      id: 2,
      bloodType: 'A+',
      location: 'General Hospital',
      urgency: 'Urgent',
      timeAgo: '5 hours ago',
      status: 'Fulfilled',
    },
    {
      id: 3,
      bloodType: 'B-',
      location: 'Medical Center',
      urgency: 'Normal',
      timeAgo: '1 day ago',
      status: 'Active',
    },
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Critical':
        return colors.error;
      case 'Urgent':
        return colors.warning;
      default:
        return colors.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? colors.success : colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Blood Requests",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
      )}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS !== 'ios' && styles.scrollContentWithTabBar
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Blood Requests</Text>
          <Text style={styles.subtitle}>
            Create a request or respond to emergency needs
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateRequest}>
            <IconSymbol name="plus.circle.fill" size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyRequest}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Emergency Request</Text>
          </TouchableOpacity>
        </View>

        {/* Blood Type Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blood Types</Text>
          <View style={styles.bloodTypesGrid}>
            {bloodTypes.map((type, index) => (
              <TouchableOpacity key={index} style={styles.bloodTypeCard}>
                <Text style={styles.bloodTypeText}>{type}</Text>
                <Text style={styles.bloodTypeLabel}>Available</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Requests</Text>
          {recentRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestBloodType}>
                  <Text style={styles.requestBloodTypeText}>{request.bloodType}</Text>
                </View>
                <View style={styles.requestStatus}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(request.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {request.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.requestDetails}>
                <View style={styles.requestInfo}>
                  <IconSymbol name="location.fill" size={16} color={colors.textSecondary} />
                  <Text style={styles.requestLocation}>{request.location}</Text>
                </View>
                
                <View style={styles.requestInfo}>
                  <IconSymbol name="clock.fill" size={16} color={colors.textSecondary} />
                  <Text style={styles.requestTime}>{request.timeAgo}</Text>
                </View>
              </View>
              
              <View style={styles.requestFooter}>
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) }]}>
                  <Text style={styles.urgencyText}>{request.urgency}</Text>
                </View>
                
                {request.status === 'Active' && (
                  <TouchableOpacity style={styles.respondButton}>
                    <Text style={styles.respondButtonText}>Respond</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Active Requests</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>Fulfilled Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Emergency</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  createButton: {
    backgroundColor: colors.secondary,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    boxShadow: '0px 4px 12px rgba(52, 152, 219, 0.3)',
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emergencyButton: {
    backgroundColor: colors.error,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    boxShadow: '0px 4px 12px rgba(231, 76, 60, 0.3)',
    elevation: 4,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  bloodTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bloodTypeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  bloodTypeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  bloodTypeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestBloodType: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestBloodTypeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 16,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestLocation: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  requestTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  urgencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  respondButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  respondButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
