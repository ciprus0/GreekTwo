"use client"

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CryptoJS from 'crypto-js';
import PasswordResetService from '../../lib/passwordResetService';
import { Feather } from '@expo/vector-icons';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const { user } = useAuth();

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Current password is required');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'New password is required');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert(
        'Password Requirements',
        'Password must be at least 8 characters long and contain:\n• At least one uppercase letter\n• At least one lowercase letter\n• At least one number'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const currentPasswordHash = CryptoJS.SHA256(currentPassword).toString();
      
      const { data: member, error: verifyError } = await supabase
        .from('members')
        .select('id, password_hash')
        .eq('email', user.email)
        .eq('password_hash', currentPasswordHash)
        .single();

      if (verifyError || !member) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      const newPasswordHash = CryptoJS.SHA256(newPassword).toString();

      const { error: updateError } = await supabase
        .from('members')
        .update({ password_hash: newPasswordHash })
        .eq('id', member.id);

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Password updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Would you like to reset your password via email?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Password',
          onPress: async () => {
            try {
              setLoading(true);
              
              const result = await PasswordResetService.createResetToken(user.email);

              if (result.success) {
                Alert.alert(
                  'Reset Email Sent',
                  'Check your email for password reset instructions. You can close this screen and check your email.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to send reset email');
              }
            } catch (error) {
              console.error('Error with password reset:', error);
              Alert.alert('Error', 'Failed to send reset email. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Update Password</Text>
              
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text 
                    }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Feather
                      name={showCurrentPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>New Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text 
                    }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Feather
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border,
                      color: colors.text 
                    }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Feather
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.passwordRequirements}>
                <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                  Password Requirements:
                </Text>
                <Text style={[styles.requirement, { color: colors.textSecondary }]}>
                  • At least 8 characters long
                </Text>
                <Text style={[styles.requirement, { color: colors.textSecondary }]}>
                  • At least one uppercase letter
                </Text>
                <Text style={[styles.requirement, { color: colors.textSecondary }]}>
                  • At least one lowercase letter
                </Text>
                <Text style={[styles.requirement, { color: colors.textSecondary }]}>
                  • At least one number
                </Text>
              </View>

              {/* Change Password Button */}
              <TouchableOpacity
                style={[
                  styles.changeButton,
                  {
                    backgroundColor: loading ? colors.border : colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={[styles.changeButtonText, { color: colors.surface }]}>
                    Change Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Forgot Password Section */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Forgot Password?</Text>
              <Text style={[styles.forgotDescription, { color: colors.textSecondary }]}>
                If you've forgotten your password, we can send you a reset link via email.
              </Text>
              
              <TouchableOpacity
                style={[styles.forgotButton, { borderColor: colors.primary }]}
                onPress={handleForgotPassword}
              >
                <Text style={[styles.forgotButtonText, { color: colors.primary }]}>
                  Send Reset Email
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 12,
    padding: 4,
  },
  passwordRequirements: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    fontSize: 12,
    marginBottom: 2,
  },
  changeButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  forgotDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  forgotButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 