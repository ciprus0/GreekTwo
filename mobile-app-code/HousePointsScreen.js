import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import { calculateProgressForType, getTypeEmoji, getTypeColor, getTypeDisplayText } from '../../lib/hourRequirementsUtils';

const { width } = Dimensions.get('window');

export default function HousePointsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [userSubmissions, setUserSubmissions] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);
  const [requirement, setRequirement] = useState(0);
  const [housePointsProgress, setHousePointsProgress] = useState({ totalCompleted: 0, totalRequired: 0, hasRequirements: false, requirements: [] });
  
  // Create activity form state
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    points: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    submission_type: 'qr' // 'qr' or 'file'
  });
  
  // Date/time picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  
  // Admin submissions state
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  
  const [permission, requestPermission] = useCameraPermissions();

  const { colors } = useTheme();
  const { user } = useAuth();

  const CACHE_KEY = `housePoints-${user?.id || 'guest'}`;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (user) {
      // Clear cache to ensure fresh data
      AsyncStorage.removeItem(CACHE_KEY);
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load cache first for initial display
      const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
      let cache = null;
      if (cacheRaw) {
        try {
          cache = JSON.parse(cacheRaw);
        } catch (e) {
          // Cache is invalid
        }
      }

      // Show cached data immediately if available
      if (cache && cache.activities) {
        setActivities(cache.activities || []);
        setUserPoints(cache.userPoints || 0);
        setUserSubmissions(cache.userSubmissions || {});
        setRequirement(cache.requirement || 0);
        setHousePointsProgress(cache.housePointsProgress || { totalCompleted: 0, totalRequired: 0, hasRequirements: false, requirements: [] });
      }

      // Always fetch fresh data - run in sequence since some depend on userProfile
      await fetchUserProfile();
      await fetchOrganizationData();
      await fetchActivities();
      await fetchUserPoints();
      await fetchUserSubmissions();
      await fetchRequirement();
      await fetchHousePointsProgress();

      // Cache the fresh data
      const cacheData = {
        activities,
        userPoints,
        userSubmissions,
        requirement,
        housePointsProgress,
        timestamp: Date.now()
      };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      setLoading(false);
    } catch (error) {
      console.error('Error loading house points data:', error);
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('name, roles, organization_id')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setUserProfile(data);
      const roles = Array.isArray(data.roles) ? data.roles : (typeof data.roles === 'string' ? data.roles.split(',').map(r => r.trim()) : []);
      setIsAdmin(roles.some(role => 
        role === 'Active' || role === 'group_owner' || role === 'Group Owner' || 
        role.toLowerCase().includes('admin') || role.toLowerCase().includes('president') || 
        role.toLowerCase().includes('vice')
      ));
    }
  };

  const fetchOrganizationData = async () => {
    try {
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('organizations')
        .select('name, features')
        .eq('id', organizationId)
        .single();

      if (!error && data) {
        setOrganizationData(data);
      }
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('house_points_activities')
        .select(`
          *,
          created_by_member:members(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('house_points_totals')
        .select('total_points')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();

      if (!error && data) {
        setUserPoints(data.total_points);
      } else {
        setUserPoints(0);
      }
    } catch (error) {
      console.error('Error fetching user points:', error);
      setUserPoints(0);
    }
  };

  const fetchUserSubmissions = async () => {
    try {
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('house_points_submissions')
        .select('activity_id, status')
        .eq('user_id', user.id);

      if (!error && data) {
        const submissions = {};
        data.forEach(sub => {
          submissions[sub.activity_id] = sub.status;
        });
        setUserSubmissions(submissions);
      }
    } catch (error) {
      console.error('Error fetching user submissions:', error);
    }
  };

  const fetchRequirement = async () => {
    try {
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', organizationId)
        .single();

      if (!error && data?.features?.requirements?.housePoints) {
        setRequirement(data.features.requirements.housePoints);
      }
    } catch (error) {
      console.error('Error fetching requirement:', error);
    }
  };

  const fetchHousePointsProgress = async () => {
    try {
      if (!user?.id) return;

      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      // Get organization hour requirements
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('hour_requirements')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      const requirements = orgData?.hour_requirements || [];

      // Fetch house points data
      const { data: housePointsData, error: housePointsError } = await supabase
        .from("house_points_totals")
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .single();

      if (housePointsError && housePointsError.code !== 'PGRST116') throw housePointsError;

      const progress = calculateProgressForType([housePointsData], requirements, 'housePoints', user.id);
      setHousePointsProgress(progress);
    } catch (error) {
      console.error("Error fetching house points progress:", error);
    }
  };

  const handleScanQR = async (activity) => {
    setSelectedActivity(activity);
    
    // Check camera permission first
    if (!permission) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Camera Permission Required', 'Please grant camera permission to scan QR codes.');
        return;
      }
    } else if (!permission.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Camera Permission Required', 'Please grant camera permission to scan QR codes.');
        return;
      }
    }
    
    setShowScanner(true);
  };

  const handleBarCodeScanned = async (result) => {
    const { data } = result;
    setShowScanner(false);
    
    if (data === selectedActivity.qr_code) {
      // QR code matches, auto-approve submission
      const { error } = await supabase
        .from('house_points_submissions')
        .insert({
          activity_id: selectedActivity.id,
          user_id: user.id,
          submission_type: 'qr',
          status: 'auto_approved',
          points_awarded: selectedActivity.points
        });

      if (error) {
        Alert.alert('Error', 'Failed to submit activity. Please try again.');
      } else {
        Alert.alert('Success', `You earned ${selectedActivity.points} house points!`);
        loadData(); // Refresh data
      }
    } else {
      Alert.alert('Invalid QR Code', 'The scanned QR code does not match this activity.');
    }
  };

  const handleUploadFile = async (activity) => {
    setSelectedActivity(activity);
    setShowUploadModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      // Upload file to Supabase storage
      const fileName = `house_points_${selectedActivity.id}_${user.id}_${Date.now()}.jpg`;
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      const filePath = `${organizationId}/house_points/${fileName}`;
      
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, blob);

      if (uploadError) {
        Alert.alert('Error', 'Failed to upload file. Please try again.');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Create submission
      const { error } = await supabase
        .from('house_points_submissions')
        .insert({
          activity_id: selectedActivity.id,
          user_id: user.id,
          submission_type: 'file',
          file_url: urlData.publicUrl,
          status: 'pending',
          points_awarded: 0
        });

      if (error) {
        Alert.alert('Error', 'Failed to submit activity. Please try again.');
      } else {
        Alert.alert('Success', 'File uploaded successfully! Waiting for admin approval.');
        setShowUploadModal(false);
        loadData(); // Refresh data
      }
    }
  };

  const showQRCode = (activity) => {
    setSelectedActivity(activity);
    setShowQRModal(true);
  };

  const getSubmissionStatus = (activityId) => {
    return userSubmissions[activityId] || null;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'auto_approved':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
      case 'auto_approved':
        return 'Completed';
      case 'pending':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Not Started';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // Remove seconds
  };

  const isActivityExpired = (activity) => {
    const now = new Date();
    // Create end date in local timezone
    const endDate = new Date(activity.end_date + 'T00:00:00');
    if (activity.end_time) {
      const [hours, minutes] = activity.end_time.split(':');
      endDate.setHours(parseInt(hours), parseInt(minutes));
    }
    return now > endDate;
  };



  // Create activity functions
  const createActivity = async () => {
    if (!newActivity.title || !newActivity.description || !newActivity.points || 
        !newActivity.start_date || !newActivity.end_date) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      // Generate QR code for the activity
      const qrCode = `HP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Fix date issue by ensuring we use local dates
      const startDate = new Date(newActivity.start_date + 'T00:00:00');
      const endDate = new Date(newActivity.end_date + 'T23:59:59');

      const { error } = await supabase
        .from('house_points_activities')
        .insert({
          title: newActivity.title,
          description: newActivity.description,
          points: parseInt(newActivity.points),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          start_time: newActivity.start_time || null,
          end_time: newActivity.end_time || null,
          submission_type: newActivity.submission_type,
          qr_code: qrCode,
          organization_id: user?.user_metadata?.organization_id || user?.organization_id,
          created_by: user.id
        });

      if (error) throw error;

      Alert.alert('Success', 'Activity created successfully!');
      setShowCreateModal(false);
      setNewActivity({
        title: '',
        description: '',
        points: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        submission_type: 'qr'
      });
      // Reset date pickers
      setStartDate(new Date());
      setEndDate(new Date());
      setStartTime(new Date());
      setEndTime(new Date());
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error creating activity:', error);
      Alert.alert('Error', 'Failed to create activity. Please try again.');
    }
  };

  // Admin submission functions
  const fetchPendingSubmissions = async () => {
    try {
      const organizationId = user?.user_metadata?.organization_id || user?.organization_id;
      if (!organizationId) return;

      const { data, error } = await supabase
        .from('house_points_submissions')
        .select(`
          *,
          activity:house_points_activities(title, points),
          member:members(name)
        `)
        .eq('status', 'pending')
        .eq('activity.organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPendingSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching pending submissions:', error);
    }
  };

  const approveSubmission = async (submissionId, points) => {
    try {
      const { error } = await supabase
        .from('house_points_submissions')
        .update({
          status: 'approved',
          points_awarded: points,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      Alert.alert('Success', 'Submission approved!');
      fetchPendingSubmissions(); // Refresh submissions
      loadData(); // Refresh user points
    } catch (error) {
      console.error('Error approving submission:', error);
      Alert.alert('Error', 'Failed to approve submission. Please try again.');
    }
  };

  const rejectSubmission = async (submissionId) => {
    try {
      const { error } = await supabase
        .from('house_points_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      Alert.alert('Success', 'Submission rejected.');
      fetchPendingSubmissions(); // Refresh submissions
    } catch (error) {
      console.error('Error rejecting submission:', error);
      Alert.alert('Error', 'Failed to reject submission. Please try again.');
    }
  };

  // Date/time picker handlers
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNewActivity(prev => ({ ...prev, start_date: formattedDate }));
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNewActivity(prev => ({ ...prev, end_date: formattedDate }));
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      setNewActivity(prev => ({ ...prev, start_time: formattedTime }));
    }
  };

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      setEndTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      setNewActivity(prev => ({ ...prev, end_time: formattedTime }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>House Points</Text>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Feather name="plus" size={20} color={colors.surface} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading house points...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>House Points</Text>
        {isAdmin && (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                fetchPendingSubmissions();
                setShowSubmissionsModal(true);
              }}
            >
              <Feather name="list" size={18} color={colors.surface} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Feather name="plus" size={20} color={colors.surface} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Points Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.pointsRow}>
            <View>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>Your Points</Text>
              <Text style={[styles.pointsValue, { color: colors.text }]}>{userPoints}</Text>
            </View>
                      {housePointsProgress.hasRequirements && (
            <View>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>Required</Text>
              <Text style={[styles.pointsValue, { color: colors.text }]}>{housePointsProgress.totalRequired.toFixed(1)}</Text>
            </View>
          )}
        </View>
        
        {housePointsProgress.hasRequirements && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.primary,
                    width: `${Math.min((housePointsProgress.totalCompleted / housePointsProgress.totalRequired) * 100, 100)}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {Math.round(Math.min((housePointsProgress.totalCompleted / housePointsProgress.totalRequired) * 100, 100))}% Complete
            </Text>
          </View>
        )}
        
        {/* Show individual requirements if there are multiple */}
        {housePointsProgress.hasRequirements && housePointsProgress.requirements.length > 1 && (
          <View style={{ marginTop: 12 }}>
            {housePointsProgress.requirements.map((req) => (
              <View key={req.id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.pointsLabel, { color: colors.textSecondary, fontSize: 12 }]}>{req.name}</Text>
                  <Text style={[styles.pointsLabel, { color: colors.textSecondary, fontSize: 12 }]}>
                    {req.completed.toFixed(1)}/{req.required.toFixed(1)} points
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border, height: 6 }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: colors.primary,
                        width: `${Math.min((req.completed / req.required) * 100, 100)}%`
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}
        </View>

        {/* Activities */}
        <View style={styles.activitiesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Activities</Text>
          
          {activities.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Feather name="star" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No activities available yet
              </Text>
              {isAdmin && (
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Create the first activity to get started
                </Text>
              )}
            </View>
          ) : (
            activities.map((activity) => {
              const status = getSubmissionStatus(activity.id);
              const isExpired = isActivityExpired(activity);
              
              return (
                <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                      <Text style={[styles.activityPoints, { color: colors.primary }]}>
                        {activity.points} points
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                        {isExpired ? 'Expired' : getStatusText(status)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
                    {activity.description}
                  </Text>
                  
                  <View style={styles.activityMeta}>
                    <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                      {formatDate(activity.start_date)} - {formatDate(activity.end_date)}
                    </Text>
                    {activity.start_time && activity.end_time && (
                      <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                        {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
                      </Text>
                    )}
                  </View>
                  
                  {!isExpired && status !== 'approved' && status !== 'auto_approved' && (
                    <View style={styles.activityActions}>
                      {activity.submission_type === 'qr' ? (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleScanQR(activity)}
                        >
                          <Feather name="camera" size={16} color={colors.surface} />
                          <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                            Scan QR
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleUploadFile(activity)}
                        >
                          <Feather name="upload" size={16} color={colors.surface} />
                          <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                            Upload File
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {isAdmin && activity.submission_type === 'qr' && (
                                                 <TouchableOpacity
                           style={[styles.actionButton, { backgroundColor: colors.accent }]}
                           onPress={() => showQRCode(activity)}
                         >
                           <Feather name="maximize-2" size={16} color={colors.surface} />
                           <Text style={[styles.actionButtonText, { color: colors.surface }]}>
                             Show QR
                           </Text>
                         </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                QR Code for {selectedActivity?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
                         <View style={styles.modalBody}>
               <View style={[styles.qrContainer, { backgroundColor: colors.background }]}>
                 <QRCode
                   value={selectedActivity?.qr_code || ''}
                   size={200}
                   color={colors.text}
                   backgroundColor={colors.background}
                 />
                 <Text style={[styles.qrCode, { color: colors.text, marginTop: 16 }]}>
                   {selectedActivity?.qr_code}
                 </Text>
                 <Text style={[styles.qrInstructions, { color: colors.textSecondary }]}>
                   Members can scan this code to earn {selectedActivity?.points} points
                 </Text>
               </View>
             </View>
          </View>
        </View>
      </Modal>

      {/* QR Scanner */}
      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          {!permission ? (
            <View style={[styles.scannerContainer, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.scannerText}>Requesting camera permission...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={[styles.scannerContainer, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.scannerText}>Camera permission is required</Text>
              <TouchableOpacity
                style={[styles.closeScannerButton, { position: 'relative', top: 0, right: 0, marginTop: 20 }]}
                onPress={requestPermission}
              >
                <Text style={[styles.scannerText, { fontSize: 16 }]}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            />
          )}
          <View style={styles.scannerOverlay}>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => setShowScanner(false)}
            >
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerText}>Scan QR Code</Text>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Upload File for {selectedActivity?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                onPress={pickImage}
              >
                <Feather name="image" size={24} color={colors.surface} />
                <Text style={[styles.uploadButtonText, { color: colors.surface }]}>
                  Select Image
                </Text>
              </TouchableOpacity>
              <Text style={[styles.uploadInstructions, { color: colors.textSecondary }]}>
                Upload an image as proof of completion. An admin will review your submission.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Activity Modal */}
      <Modal visible={showCreateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Activity</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Activity Title"
                placeholderTextColor={colors.textSecondary}
                value={newActivity.title}
                onChangeText={(text) => setNewActivity(prev => ({ ...prev, title: text }))}
              />
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Description"
                placeholderTextColor={colors.textSecondary}
                value={newActivity.description}
                onChangeText={(text) => setNewActivity(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Points"
                placeholderTextColor={colors.textSecondary}
                value={newActivity.points}
                onChangeText={(text) => setNewActivity(prev => ({ ...prev, points: text }))}
                keyboardType="numeric"
              />
                             <TouchableOpacity
                 style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                 onPress={() => setShowStartDatePicker(true)}
               >
                 <Feather name="calendar" size={20} color={colors.text} />
                 <Text style={[styles.datePickerText, { color: colors.text }]}>
                   {newActivity.start_date ? newActivity.start_date : 'Select Start Date'}
                 </Text>
               </TouchableOpacity>
               
               <TouchableOpacity
                 style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                 onPress={() => setShowEndDatePicker(true)}
               >
                 <Feather name="calendar" size={20} color={colors.text} />
                 <Text style={[styles.datePickerText, { color: colors.text }]}>
                   {newActivity.end_date ? newActivity.end_date : 'Select End Date'}
                 </Text>
               </TouchableOpacity>
               
               <TouchableOpacity
                 style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                 onPress={() => setShowStartTimePicker(true)}
               >
                 <Feather name="clock" size={20} color={colors.text} />
                 <Text style={[styles.datePickerText, { color: colors.text }]}>
                   {newActivity.start_time ? newActivity.start_time : 'Select Start Time (Optional)'}
                 </Text>
               </TouchableOpacity>
               
               <TouchableOpacity
                 style={[styles.datePickerButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                 onPress={() => setShowEndTimePicker(true)}
               >
                 <Feather name="clock" size={20} color={colors.text} />
                 <Text style={[styles.datePickerText, { color: colors.text }]}>
                   {newActivity.end_time ? newActivity.end_time : 'Select End Time (Optional)'}
                 </Text>
               </TouchableOpacity>
              
              <View style={styles.submissionTypeContainer}>
                <Text style={[styles.submissionTypeLabel, { color: colors.text }]}>Submission Type:</Text>
                <View style={styles.submissionTypeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.submissionTypeButton,
                      { 
                        backgroundColor: newActivity.submission_type === 'qr' ? colors.primary : colors.background,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setNewActivity(prev => ({ ...prev, submission_type: 'qr' }))}
                  >
                    <Text style={[styles.submissionTypeButtonText, { color: newActivity.submission_type === 'qr' ? colors.surface : colors.text }]}>
                      QR Code
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submissionTypeButton,
                      { 
                        backgroundColor: newActivity.submission_type === 'file' ? colors.primary : colors.background,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => setNewActivity(prev => ({ ...prev, submission_type: 'file' }))}
                  >
                    <Text style={[styles.submissionTypeButtonText, { color: newActivity.submission_type === 'file' ? colors.surface : colors.text }]}>
                      File Upload
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.createActivityButton, { backgroundColor: colors.primary }]}
                onPress={createActivity}
              >
                <Text style={[styles.createActivityButtonText, { color: colors.surface }]}>
                  Create Activity
                </Text>
                             </TouchableOpacity>
             </ScrollView>
           </View>
         </View>
       </Modal>

               {/* Admin Submissions Modal */}
      <Modal visible={showSubmissionsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pending Submissions</Text>
              <TouchableOpacity onPress={() => setShowSubmissionsModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {pendingSubmissions.length === 0 ? (
                <View style={styles.emptySubmissions}>
                  <Feather name="check-circle" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptySubmissionsText, { color: colors.textSecondary }]}>
                    No pending submissions
                  </Text>
                </View>
              ) : (
                pendingSubmissions.map((submission) => (
                  <View key={submission.id} style={[styles.submissionCard, { backgroundColor: colors.background }]}>
                    <View style={styles.submissionHeader}>
                      <Text style={[styles.submissionMember, { color: colors.text }]}>
                        {submission.member?.name || 'Unknown Member'}
                      </Text>
                      <Text style={[styles.submissionActivity, { color: colors.primary }]}>
                        {submission.activity?.title || 'Unknown Activity'}
                      </Text>
                    </View>
                    <Text style={[styles.submissionPoints, { color: colors.textSecondary }]}>
                      {submission.activity?.points || 0} points
                    </Text>
                    {submission.submission_type === 'file' && submission.file_url && (
                      <TouchableOpacity
                        style={[styles.viewFileButton, { backgroundColor: colors.accent }]}
                        onPress={() => {
                          // Open file URL in browser or image viewer
                          Alert.alert('View File', 'File viewing will be implemented in a future update.');
                        }}
                      >
                        <Text style={[styles.viewFileButtonText, { color: colors.surface }]}>
                          View File
                        </Text>
                      </TouchableOpacity>
                    )}
                    <View style={styles.submissionActions}>
                      <TouchableOpacity
                        style={[styles.approveButton, { backgroundColor: colors.primary }]}
                        onPress={() => approveSubmission(submission.id, submission.activity?.points || 0)}
                      >
                        <Text style={[styles.approveButtonText, { color: colors.surface }]}>
                          Approve
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectButton, { backgroundColor: colors.error || '#ef4444' }]}
                        onPress={() => rejectSubmission(submission.id)}
                      >
                        <Text style={[styles.rejectButtonText, { color: colors.surface }]}>
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
                 </View>
       </Modal>

       {/* Date/Time Pickers - positioned at the very end to appear as native overlays */}
       {showStartDatePicker && (
         <DateTimePicker
           value={startDate}
           mode="date"
           display="default"
           onChange={handleStartDateChange}
         />
       )}
       
       {showEndDatePicker && (
         <DateTimePicker
           value={endDate}
           mode="date"
           display="default"
           onChange={handleEndDateChange}
         />
       )}
       
       {showStartTimePicker && (
         <DateTimePicker
           value={startTime}
           mode="time"
           display="default"
           onChange={handleStartTimeChange}
         />
       )}
       
       {showEndTimePicker && (
         <DateTimePicker
           value={endTime}
           mode="time"
           display="default"
           onChange={handleEndTimeChange}
         />
       )}
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pointsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  activitiesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityPoints: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  activityMeta: {
    marginBottom: 12,
  },
  activityDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  qrContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  qrCode: {
    fontSize: 16,
    fontFamily: 'monospace',
    marginBottom: 12,
    textAlign: 'center',
  },
  qrInstructions: {
    fontSize: 14,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadInstructions: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeScannerButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submissionTypeContainer: {
    marginBottom: 16,
  },
  submissionTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  submissionTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  submissionTypeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submissionTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createActivityButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createActivityButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubmissions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySubmissionsText: {
    fontSize: 16,
    marginTop: 16,
  },
  submissionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  submissionHeader: {
    marginBottom: 8,
  },
  submissionMember: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  submissionActivity: {
    fontSize: 14,
    fontWeight: '600',
  },
  submissionPoints: {
    fontSize: 14,
    marginBottom: 12,
  },
  viewFileButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewFileButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
    flex: 1,
  },
}); 