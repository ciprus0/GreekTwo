import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ChapterCustomizationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { user, setUser } = useAuth();
  
  // Get organizationId from user metadata instead of route params
  const organizationId = user?.user_metadata?.organization_id;
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  
  const [customization, setCustomization] = useState({
    // Features
    features: {
      study: true,
      tasks: true,
      events: true,
      library: true,
      messages: true,
      pledgeSystem: true,
      announcements: true,
    },
    // Pledge settings
    pledgeExemption: false,
    pledgeExemptions: {
      study: false,
      tasks: false,
      events: false,
      library: false,
      messages: false,
      announcements: false,
    },
    // Tracking system
    trackingSystem: 'hours', // 'hours' or 'housePoints'
    // Requirements
    requirements: {
      gym: 0,
      study: 0,
      housePoints: 0,
    },
    // Roles
    roles: [
      { id: 'group_owner', name: 'Group Owner', color: '#7c3aed', isAdmin: true, isDefault: true },
      { id: 'president', name: 'President', color: '#dc2626', isAdmin: true, isDefault: true },
      { id: 'treasurer', name: 'Treasurer', color: '#059669', isAdmin: false, isDefault: true },
      { id: 'active', name: 'Active', color: '#2563eb', isAdmin: false, isDefault: true },
      { id: 'new_member', name: 'New Member', color: '#f59e0b', isAdmin: false, isDefault: true },
    ],
  });

  const steps = [
    { title: 'Features', subtitle: 'Choose which features to enable' },
    { title: 'Pledge System', subtitle: 'Configure pledge exemptions' },
    { title: 'Tracking System', subtitle: 'Choose hours or house points' },
    { title: 'Requirements', subtitle: 'Set activity requirements' },
    { title: 'Roles', subtitle: 'Customize member roles' },
    { title: 'Finish', subtitle: 'Complete setup' },
  ];

  const toggleFeature = (feature) => {
    setCustomization(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  const togglePledgeExemption = (feature) => {
    setCustomization(prev => ({
      ...prev,
      pledgeExemptions: {
        ...prev.pledgeExemptions,
        [feature]: !prev.pledgeExemptions[feature]
      }
    }));
  };

  const updateRequirement = (type, value) => {
    setCustomization(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [type]: parseInt(value) || 0
      }
    }));
  };

  const addRole = () => {
    setEditingRole({
      id: '',
      name: '',
      color: '#3b82f6',
      isAdmin: false,
      isDefault: false
    });
    setShowRoleModal(true);
  };

  const editRole = (role) => {
    setEditingRole({ ...role });
    setShowRoleModal(true);
  };

  const deleteRole = (roleId) => {
    if (customization.roles.find(r => r.id === roleId)?.isDefault) {
      Alert.alert('Cannot Delete', 'Default roles cannot be deleted');
      return;
    }
    
    setCustomization(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r.id !== roleId)
    }));
  };

  const saveRole = () => {
    if (!editingRole.name.trim()) {
      Alert.alert('Error', 'Role name is required');
      return;
    }

    if (!editingRole.id.trim()) {
      Alert.alert('Error', 'Role ID is required');
      return;
    }

    // Check if ID already exists (except for the current role being edited)
    const existingRole = customization.roles.find(r => r.id === editingRole.id);
    if (existingRole && existingRole !== editingRole) {
      Alert.alert('Error', 'Role ID already exists');
      return;
    }

    setCustomization(prev => ({
      ...prev,
      roles: prev.roles.map(r => 
        r.id === editingRole.id ? editingRole : r
      ).concat(
        prev.roles.find(r => r.id === editingRole.id) ? [] : [editingRole]
      )
    }));

    setShowRoleModal(false);
    setEditingRole(null);
  };

  const saveCustomization = async () => {
    setLoading(true);
    try {
      if (!organizationId) {
        throw new Error('Organization ID not found. Please try again.');
      }



      // Save the entire customization object to the features column
      // This maintains compatibility with the current database structure
      const { error } = await supabase
        .from('organizations')
        .update({
          features: customization  // Save the entire customization object including trackingSystem
        })
        .eq('id', organizationId);

      if (error) throw error;

      // Remove the needsCustomization flag from user metadata
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          needsCustomization: false
        }
      };

      // Update user in AsyncStorage and AuthContext
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      Alert.alert('Success', 'Chapter customization saved successfully!', [
        { text: 'OK', onPress: () => {
          // The AppNavigator will automatically route to the main app
          // since needsCustomization is now false
        }}
      ]);
    } catch (error) {

      Alert.alert('Error', 'Failed to save customization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Features
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              Select which features you want to enable for your chapter:
            </Text>
            
            {Object.entries(customization.features).map(([feature, enabled]) => (
              <View key={feature} style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {feature.charAt(0).toUpperCase() + feature.slice(1)}
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    {getFeatureDescription(feature)}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleFeature(feature)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            ))}
          </View>
        );

      case 1: // Pledge System
        return (
          <View style={styles.stepContainer}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Pledge Exemptions
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Allow pledges to be exempt from certain requirements
                </Text>
              </View>
              <Switch
                value={customization.pledgeExemption}
                onValueChange={(value) => setCustomization(prev => ({ ...prev, pledgeExemption: value }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>

            {customization.pledgeExemption && (
              <View style={styles.exemptionsContainer}>
                <Text style={[styles.exemptionsTitle, { color: colors.text }]}>
                  Exempt pledges from:
                </Text>
                {Object.entries(customization.pledgeExemptions).map(([feature, exempt]) => (
                  <View key={feature} style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, { color: colors.text }]}>
                        {feature.charAt(0).toUpperCase() + feature.slice(1)}
                      </Text>
                    </View>
                    <Switch
                      value={exempt}
                      onValueChange={() => togglePledgeExemption(feature)}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 2: // Tracking System
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              Choose how you want to track member involvement:
            </Text>
            
            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                customization.trackingSystem === 'hours' && { borderColor: colors.primary }
              ]}
              onPress={() => setCustomization(prev => ({ ...prev, trackingSystem: 'hours' }))}
            >
              <View style={styles.optionHeader}>
                <Feather name="clock" size={24} color={customization.trackingSystem === 'hours' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.optionTitle, { color: colors.text }]}>Hours Tracking</Text>
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Track member involvement using hours spent on activities
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                customization.trackingSystem === 'housePoints' && { borderColor: colors.primary }
              ]}
              onPress={() => setCustomization(prev => ({ ...prev, trackingSystem: 'housePoints' }))}
            >
              <View style={styles.optionHeader}>
                <Feather name="star" size={24} color={customization.trackingSystem === 'housePoints' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.optionTitle, { color: colors.text }]}>House Points</Text>
              </View>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Track member involvement using a points system
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 3: // Requirements
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              Set minimum requirements for member involvement:
            </Text>
            
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementLabel, { color: colors.text }]}>Gym Hours:</Text>
              <TextInput
                style={[styles.requirementInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={customization.requirements.gym.toString()}
                onChangeText={(value) => updateRequirement('gym', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.requirementRow}>
              <Text style={[styles.requirementLabel, { color: colors.text }]}>Study Hours:</Text>
              <TextInput
                style={[styles.requirementInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={customization.requirements.study.toString()}
                onChangeText={(value) => updateRequirement('study', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {customization.trackingSystem === 'housePoints' && (
              <View style={styles.requirementRow}>
                <Text style={[styles.requirementLabel, { color: colors.text }]}>House Points:</Text>
                <TextInput
                  style={[styles.requirementInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={customization.requirements.housePoints.toString()}
                  onChangeText={(value) => updateRequirement('housePoints', value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
          </View>
        );

      case 4: // Roles
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              Customize member roles for your chapter:
            </Text>
            
            {customization.roles.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleInfo}>
                  <View style={[styles.roleColor, { backgroundColor: role.color }]} />
                  <View style={styles.roleDetails}>
                    <Text style={[styles.roleName, { color: colors.text }]}>{role.name}</Text>
                    <Text style={[styles.roleId, { color: colors.textSecondary }]}>{role.id}</Text>
                    {role.isAdmin && (
                      <Text style={[styles.roleBadge, { color: colors.primary }]}>Admin</Text>
                    )}
                  </View>
                </View>
                <View style={styles.roleActions}>
                  <TouchableOpacity
                    style={[styles.roleAction, { backgroundColor: colors.primary }]}
                    onPress={() => editRole(role)}
                  >
                    <Feather name="edit-2" size={16} color={colors.surface} />
                  </TouchableOpacity>
                  {!role.isDefault && (
                    <TouchableOpacity
                      style={[styles.roleAction, { backgroundColor: colors.error }]}
                      onPress={() => deleteRole(role.id)}
                    >
                      <Feather name="trash-2" size={16} color={colors.surface} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            
            <TouchableOpacity
              style={[styles.addRoleButton, { backgroundColor: colors.primary }]}
              onPress={addRole}
            >
              <Feather name="plus" size={20} color={colors.surface} />
              <Text style={[styles.addRoleText, { color: colors.surface }]}>Add Role</Text>
            </TouchableOpacity>
          </View>
        );

      case 5: // Finish
        return (
          <View style={styles.stepContainer}>
            <View style={styles.summaryContainer}>
              <Feather name="check-circle" size={64} color={colors.success} />
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Setup Complete!</Text>
              <Text style={[styles.summaryDescription, { color: colors.textSecondary }]}>
                Your chapter has been customized with the following settings:
              </Text>
              
              <View style={styles.summarySection}>
                <Text style={[styles.summarySectionTitle, { color: colors.text }]}>Enabled Features:</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  {Object.entries(customization.features)
                    .filter(([, enabled]) => enabled)
                    .map(([feature]) => feature.charAt(0).toUpperCase() + feature.slice(1))
                    .join(', ')}
                </Text>
              </View>

              <View style={styles.summarySection}>
                <Text style={[styles.summarySectionTitle, { color: colors.text }]}>Tracking System:</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  {customization.trackingSystem === 'hours' ? 'Hours' : 'House Points'}
                </Text>
              </View>

              <View style={styles.summarySection}>
                <Text style={[styles.summarySectionTitle, { color: colors.text }]}>Member Roles:</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  {customization.roles.length} roles configured
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getFeatureDescription = (feature) => {
    const descriptions = {
      study: 'Track study hours and academic progress',
      tasks: 'Assign and manage chapter tasks',
      events: 'Create and manage chapter events',
      library: 'Access chapter resources and documents',
      messages: 'Internal chapter messaging system',
      pledgeSystem: 'Manage pledge requirements and progress',
      announcements: 'Post chapter announcements',
    };
    return descriptions[feature] || '';
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveCustomization();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={prevStep} disabled={currentStep === 0}>
          <Feather name="arrow-left" size={24} color={currentStep === 0 ? colors.border : colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {steps[currentStep].title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.primary,
                width: `${((currentStep + 1) / steps.length) * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {steps[currentStep].title}
        </Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          {steps[currentStep].subtitle}
        </Text>
        
        {renderStep()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: loading ? colors.border : colors.primary }
          ]}
          onPress={nextStep}
          disabled={loading}
        >
          <Text style={[styles.nextButtonText, { color: colors.surface }]}>
            {currentStep === steps.length - 1 ? 'Finish Setup' : 'Next'}
          </Text>
          <Feather 
            name={currentStep === steps.length - 1 ? 'check' : 'arrow-right'} 
            size={20} 
            color={colors.surface} 
          />
        </TouchableOpacity>
      </View>

      {/* Role Modal */}
      <Modal visible={showRoleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingRole?.id ? 'Edit Role' : 'Add Role'}
              </Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Role ID (e.g., vice_president)"
                placeholderTextColor={colors.textSecondary}
                value={editingRole?.id || ''}
                onChangeText={(value) => setEditingRole(prev => ({ ...prev, id: value }))}
              />
              
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Role Name (e.g., Vice President)"
                placeholderTextColor={colors.textSecondary}
                value={editingRole?.name || ''}
                onChangeText={(value) => setEditingRole(prev => ({ ...prev, name: value }))}
              />
              
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.text }]}>Admin Role:</Text>
                <Switch
                  value={editingRole?.isAdmin || false}
                  onValueChange={(value) => setEditingRole(prev => ({ ...prev, isAdmin: value }))}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={saveRole}
              >
                <Text style={[styles.modalButtonText, { color: colors.surface }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  stepContainer: {
    marginBottom: 32,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  exemptionsContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  exemptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  optionCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  requirementLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  requirementInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  roleDetails: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleId: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  roleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  addRoleText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  summarySection: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 