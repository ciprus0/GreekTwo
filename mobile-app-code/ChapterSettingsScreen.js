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

export default function ChapterSettingsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);
  const [activeSection, setActiveSection] = useState('features');
  
  const [customization, setCustomization] = useState({
    // Features - All possible pages in the app
    features: {
      announcements: true,
      hours: true,
      study: true,
      gym: true,
      events: true,
      polls: true,
      messages: true,
      tasks: true,
      library: true,
      pledgeSystem: true,
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

  const { colors } = useTheme();
  const { user } = useAuth();

  const CACHE_KEY = `chapterSettings-${user?.user_metadata?.organization_id || 'none'}`;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  

  useEffect(() => {
    if (user?.user_metadata?.organization_id) {
      loadOrganizationData();
    }
  }, [user]);

  const loadOrganizationData = async () => {
    try {
      if (!user?.user_metadata?.organization_id) {
        console.error('No organization ID found');
        setLoading(false);
        return;
      }

      // Try cache first

      const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
      let cache = null;
      if (cacheRaw) {
        try { 
          cache = JSON.parse(cacheRaw);
  
        } catch (e) {
          
        }
      } else {
        
      }
      
      if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        setOrganizationData(cache.data);
        if (cache.customization) {
          // Use the cached customization directly since it's already in the correct format
          setCustomization(cache.customization);
        }
        setLoading(false);
        return;
      } else if (cache) {

      }

      // Fetch fresh data
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.user_metadata.organization_id)
        .single();

      if (error) throw error;

      setOrganizationData(data);
      
      // Parse features from JSONB with fallback
      // Handle the data structure - we're now saving the entire customization object
      if (data.features && typeof data.features === 'object') {
        // Check if this is the entire customization object (has roles, features, etc.)
        if (data.features.roles && data.features.features) {
          // This is the entire customization object
          setCustomization(prev => ({
            ...prev,
            features: data.features.features,
            roles: data.features.roles,
            pledgeExemption: data.features.pledgeExemption,
            pledgeExemptions: data.features.pledgeExemptions,
            trackingSystem: data.features.trackingSystem,
            requirements: data.features.requirements
          }));
        } else if (data.features.roles && !data.features.features) {
          // This is the old format where roles were stored separately
          setCustomization(prev => ({
            ...prev,
            roles: data.features.roles
          }));
        } else {
          // This is just a features object - filter out dashboard
          const filteredFeatures = { ...data.features };
          delete filteredFeatures.dashboard; // Remove dashboard from features
          setCustomization(prev => ({
            ...prev,
            features: { ...prev.features, ...filteredFeatures }
          }));
        }
      } else {
        // If no features in database, keep the default features
      }

      // Cache the data with proper structure
      let cachedCustomization = customization;
      
      if (data.features && typeof data.features === 'object') {
        // Check if this is the entire customization object (has roles, features, etc.)
        if (data.features.roles && data.features.features) {
          // This is the entire customization object
          cachedCustomization = {
            ...customization,
            features: data.features.features,
            roles: data.features.roles,
            pledgeExemption: data.features.pledgeExemption,
            pledgeExemptions: data.features.pledgeExemptions,
            trackingSystem: data.features.trackingSystem,
            requirements: data.features.requirements
          };
        } else if (data.features.roles && !data.features.features) {
          // This is the old format where roles were stored separately
          cachedCustomization = {
            ...customization,
            roles: data.features.roles
          };
        } else {
          // This is just a features object - filter out dashboard
          const filteredFeatures = { ...data.features };
          delete filteredFeatures.dashboard; // Remove dashboard from features
          cachedCustomization = {
            ...customization,
            features: { ...customization.features, ...filteredFeatures }
          };
        }
      }
      
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        customization: cachedCustomization,
        timestamp: Date.now()
      }));

      setLoading(false);
    } catch (error) {

      setLoading(false);
    }
  };

  const toggleFeature = (feature) => {
    setCustomization(prev => {
      const newFeatures = {
        ...prev.features,
        [feature]: !prev.features[feature]
      };
      return {
        ...prev,
        features: newFeatures
      };
    });
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

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Ensure dashboard is not included in the features
      const featuresToSave = { ...customization };
      if (featuresToSave.features && featuresToSave.features.dashboard) {
        delete featuresToSave.features.dashboard;
      }
      
      // Save the entire customization object to the features column for now
      // This maintains compatibility with the current database structure
      const { error } = await supabase
        .from('organizations')
        .update({
          features: featuresToSave // Save the entire customization object without dashboard
        })
        .eq('id', user.user_metadata?.organization_id);

      if (error) throw error;

      // Update cache
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { ...organizationData, features: customization },
        customization,
        timestamp: Date.now()
      }));

      Alert.alert('Success', 'Chapter settings saved successfully!', [
        { text: 'OK', onPress: () => {
          // Clear the sidebar cache to force a refresh
          AsyncStorage.removeItem('sidebarCache');
        }}
      ]);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getFeatureDescription = (feature) => {
    const descriptions = {
      announcements: 'Post and view chapter announcements',
      hours: 'Track and log member hours',
      study: 'Study hours tracking and academic progress',
      gym: 'Gym hours tracking and fitness activities',
      events: 'Create and manage chapter events',
      polls: 'Create and participate in polls and elections',
      messages: 'Internal chapter messaging system',
      tasks: 'Assign and manage chapter tasks',
      library: 'Access chapter resources and documents',
      pledgeSystem: 'Pledge system and restrictions',
    };
    return descriptions[feature] || '';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chapter Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!organizationData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chapter Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Unable to load chapter data</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadOrganizationData}
          >
            <Text style={[styles.retryButtonText, { color: colors.surface }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chapter Settings</Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? colors.border : colors.primary }]}
          onPress={saveSettings}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, { color: colors.surface }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Organization Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>{organizationData?.name}</Text>
          <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
            Chapter Settings & Configuration
          </Text>
        </View>

        {/* Section Navigation */}
        <View style={styles.sectionNav}>
          <TouchableOpacity
            style={[
              styles.sectionButton,
              { backgroundColor: activeSection === 'features' ? colors.primary : colors.surface, borderColor: colors.border }
            ]}
            onPress={() => setActiveSection('features')}
          >
            <Feather name="settings" size={24} color={activeSection === 'features' ? colors.surface : colors.text} />
            <Text style={[styles.sectionButtonText, { color: activeSection === 'features' ? colors.surface : colors.text }]}>
              Features
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sectionButton,
              { backgroundColor: activeSection === 'roles' ? colors.primary : colors.surface, borderColor: colors.border }
            ]}
            onPress={() => setActiveSection('roles')}
          >
            <Feather name="users" size={24} color={activeSection === 'roles' ? colors.surface : colors.text} />
            <Text style={[styles.sectionButtonText, { color: activeSection === 'roles' ? colors.surface : colors.text }]}>
              Roles
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sectionButton,
              { backgroundColor: activeSection === 'tracking' ? colors.primary : colors.surface, borderColor: colors.border }
            ]}
            onPress={() => setActiveSection('tracking')}
          >
            <Feather name="activity" size={24} color={activeSection === 'tracking' ? colors.surface : colors.text} />
            <Text style={[styles.sectionButtonText, { color: activeSection === 'tracking' ? colors.surface : colors.text }]}>
              {customization?.trackingSystem === 'housePoints' ? 'House Points' : 'Hours'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.sectionButton,
              { backgroundColor: activeSection === 'pledge' ? colors.primary : colors.surface, borderColor: colors.border }
            ]}
            onPress={() => setActiveSection('pledge')}
          >
            <Feather name="shield" size={24} color={activeSection === 'pledge' ? colors.surface : colors.text} />
            <Text style={[styles.sectionButtonText, { color: activeSection === 'pledge' ? colors.surface : colors.text }]}>
              Pledge System
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        {activeSection === 'features' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Chapter Features</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Turn features on/off for the entire chapter. Disabled features will be hidden from all members:
            </Text>
          
          
          {Object.entries(customization?.features || {}).map(([feature, enabled]) => (
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
        )}

        {/* Pledge System Section */}
        {activeSection === 'pledge' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pledge System</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Configure which features are hidden from pledges/new members:
            </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Hide Features from Pledges
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Enable to hide specific features from pledges and new members
              </Text>
            </View>
                          <Switch
                value={customization?.pledgeExemption || false}
                onValueChange={(value) => setCustomization(prev => ({ ...prev, pledgeExemption: value }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
          </View>

          {customization.pledgeExemption && (
            <View style={styles.exemptionsContainer}>
              <Text style={[styles.exemptionsTitle, { color: colors.text }]}>
                Hide these features from pledges:
              </Text>
              {Object.entries(customization?.pledgeExemptions || {}).map(([feature, hidden]) => (
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
                    value={hidden}
                    onValueChange={() => togglePledgeExemption(feature)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
        )}
        {/* Tracking System Section */}
        {activeSection === 'tracking' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tracking System</Text>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Choose how to track member involvement:
            </Text>
          
          <TouchableOpacity
            style={[
              styles.optionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              (customization?.trackingSystem || 'hours') === 'hours' && { borderColor: colors.primary }
            ]}
            onPress={() => setCustomization(prev => ({ ...prev, trackingSystem: 'hours' }))}
          >
            <View style={styles.optionHeader}>
              <Feather name="clock" size={24} color={(customization?.trackingSystem || 'hours') === 'hours' ? colors.primary : colors.textSecondary} />
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
              (customization?.trackingSystem || 'hours') === 'housePoints' && { borderColor: colors.primary }
            ]}
            onPress={() => setCustomization(prev => ({ ...prev, trackingSystem: 'housePoints' }))}
          >
            <View style={styles.optionHeader}>
              <Feather name="star" size={24} color={(customization?.trackingSystem || 'hours') === 'housePoints' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.optionTitle, { color: colors.text }]}>House Points</Text>
            </View>
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              Track member involvement using a points system
            </Text>
          </TouchableOpacity>
        </View>
        )}

        {/* Requirements Section */}
        {activeSection === 'tracking' && (
          <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Set minimum requirements for member involvement:
          </Text>
          
          <View style={styles.requirementRow}>
            <Text style={[styles.requirementLabel, { color: colors.text }]}>Gym Hours:</Text>
            <TextInput
              style={[styles.requirementInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={(customization?.requirements?.gym || 0).toString()}
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
              value={(customization?.requirements?.study || 0).toString()}
              onChangeText={(value) => updateRequirement('study', value)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {(customization?.trackingSystem || 'hours') === 'housePoints' && (
            <View style={styles.requirementRow}>
              <Text style={[styles.requirementLabel, { color: colors.text }]}>House Points:</Text>
              <TextInput
                style={[styles.requirementInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={(customization?.requirements?.housePoints || 0).toString()}
                onChangeText={(value) => updateRequirement('housePoints', value)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}
        </View>
        )}

        {/* Roles Section */}
        {activeSection === 'roles' && (
          <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Member Roles</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Customize member roles for your chapter:
          </Text>
          
          {(customization?.roles || []).map((role) => (
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
        )}
      </ScrollView>

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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionNav: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
    paddingHorizontal: 4,
  },
  sectionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 70,
  },
  sectionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    marginBottom: 20,
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
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  exemptionsTitle: {
    fontSize: 16,
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
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 