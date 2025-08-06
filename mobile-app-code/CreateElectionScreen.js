import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Modal,
  Alert,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  Switch
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const pad = n => n.toString().padStart(2, '0');
const localDateString = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function CreateElectionScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [positions, setPositions] = useState([{ title: '', nominees: [''] }]);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [endDateModalVisible, setEndDateModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [endTimePickerVisible, setEndTimePickerVisible] = useState(false);
  const [selectedTimeValue, setSelectedTimeValue] = useState(new Date());
  const [selectedEndTimeValue, setSelectedEndTimeValue] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [isStartDatePicker, setIsStartDatePicker] = useState(true);

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    if (canNavigateToStep(step + 1)) {
      setStep(step + 1);
    }
  };

  const canNavigateToStep = (targetStep) => {
    if (targetStep === 1 && (!title.trim())) return false;
    if (targetStep === 2 && (!startDate || !endDate)) return false;
    if (targetStep === 3 && positions.some(pos => !pos.title.trim())) return false;
    return true;
  };

  const handleStepPress = (targetStep) => {
    if (canNavigateToStep(targetStep)) {
      setStep(targetStep);
    }
  };

  const handleTimeConfirm = (selectedTime) => {
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    setStartTime(`${hours}:${minutes}`);
    setTimePickerVisible(false);
  };

  const handleEndTimeConfirm = (selectedTime) => {
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    setEndTime(`${hours}:${minutes}`);
    setEndTimePickerVisible(false);
  };

  const showTimePicker = () => {
    setTimePickerVisible(true);
  };

  const showEndTimePicker = () => {
    setEndTimePickerVisible(true);
  };

  const handleDateSelect = (day) => {
    setStartDate(day.dateString);
    setCalendarModalVisible(false);
  };

  const handleEndDateSelect = (day) => {
    setEndDate(day.dateString);
    setEndDateModalVisible(false);
  };

  const addPosition = () => {
    setPositions(prev => [...prev, { title: '', nominees: [''] }]);
  };

  const removePosition = (index) => {
    if (positions.length > 1) {
      setPositions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updatePosition = (index, field, value) => {
    setPositions(prev => prev.map((pos, i) => 
      i === index ? { ...pos, [field]: value } : pos
    ));
  };

  const addNominee = (positionIndex) => {
    setPositions(prev => prev.map((pos, i) => 
      i === positionIndex 
        ? { ...pos, nominees: [...pos.nominees, ''] }
        : pos
    ));
  };

  const removeNominee = (positionIndex, nomineeIndex) => {
    setPositions(prev => prev.map((pos, i) => 
      i === positionIndex 
        ? { ...pos, nominees: pos.nominees.filter((_, j) => j !== nomineeIndex) }
        : pos
    ));
  };

  const updateNominee = (positionIndex, nomineeIndex, value) => {
    setPositions(prev => prev.map((pos, i) => 
      i === positionIndex 
        ? { 
            ...pos, 
            nominees: pos.nominees.map((nom, j) => j === nomineeIndex ? value : nom)
          }
        : pos
    ));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an election title');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please select start and end dates');
      return;
    }

    if (!startTime || !endTime) {
      Alert.alert('Error', 'Please select start and end times');
      return;
    }

    if (positions.some(pos => !pos.title.trim())) {
      Alert.alert('Error', 'Please enter titles for all positions');
      return;
    }

    setSubmitting(true);

    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);

      if (endDateTime <= startDateTime) {
        Alert.alert('Error', 'End time must be after start time');
        setSubmitting(false);
        return;
      }

      // Format positions data for JSONB column (empty nominees for nomination phase)
      const positionsData = positions.map(position => ({
        title: position.title.trim(),
        nominees: [] // Start with empty nominees, will be populated during nomination phase
      }));

      const { data: election, error: electionError } = await supabase
        .from('elections')
        .insert({
          title: title.trim(),
          description: description.trim(),
          positions: positionsData,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          organization_id: user?.user_metadata?.organization_id,
          created_by: user.id,
          status: 'scheduled',
          current_position_index: -1 // Start in waiting mode
        })
        .select()
        .single();

      if (electionError) throw electionError;

      Alert.alert('Success', 'Election created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);

    } catch (error) {
      console.error('Error creating election:', error);
      Alert.alert('Error', 'Failed to create election. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Feather name="arrow-left" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Create Election</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3].map((stepIndex) => (
        <TouchableOpacity
          key={stepIndex}
          style={[
            styles.stepDot,
            { backgroundColor: colors.border },
            step >= stepIndex && { backgroundColor: colors.primary }
          ]}
          onPress={() => handleStepPress(stepIndex)}
        />
      ))}
    </View>
  );

  const renderStep0 = () => (
    <ScrollView 
      style={styles.stepContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>Basic Information</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Enter the basic details for your election
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Election Title *</Text>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.background, 
            color: colors.text,
            borderColor: colors.border 
          }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter election title"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[styles.textArea, { 
            backgroundColor: colors.background, 
            color: colors.text,
            borderColor: colors.border 
          }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter election description"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>
    </ScrollView>
  );

  const renderStep1 = () => (
    <ScrollView 
      style={styles.stepContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>Date & Time</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Set when the election will start and end
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Start Date *</Text>
        <TouchableOpacity
          style={[styles.dateButton, { 
            backgroundColor: colors.background, 
            borderColor: colors.border 
          }]}
          onPress={() => setCalendarModalVisible(true)}
        >
          <Text style={[styles.dateButtonText, { color: colors.text }]}>
            {startDate || 'Select start date'}
          </Text>
          <Feather name="calendar" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>Start Time *</Text>
        <TouchableOpacity
          style={[styles.dateButton, { 
            backgroundColor: colors.background, 
            borderColor: colors.border 
          }]}
          onPress={showTimePicker}
        >
          <Text style={[styles.dateButtonText, { color: colors.text }]}>
            {startTime || 'Select start time'}
          </Text>
          <Feather name="clock" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>End Date *</Text>
        <TouchableOpacity
          style={[styles.dateButton, { 
            backgroundColor: colors.background, 
            borderColor: colors.border 
          }]}
          onPress={() => setEndDateModalVisible(true)}
        >
          <Text style={[styles.dateButtonText, { color: colors.text }]}>
            {endDate || 'Select end date'}
          </Text>
          <Feather name="calendar" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>End Time *</Text>
        <TouchableOpacity
          style={[styles.dateButton, { 
            backgroundColor: colors.background, 
            borderColor: colors.border 
          }]}
          onPress={showEndTimePicker}
        >
          <Text style={[styles.dateButtonText, { color: colors.text }]}>
            {endTime || 'Select end time'}
          </Text>
          <Feather name="clock" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView 
      style={styles.stepContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
    >
        <Text style={[styles.stepTitle, { color: colors.text }]}>Positions</Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          Define the positions for the election
        </Text>

        {positions.map((position, positionIndex) => (
          <View key={positionIndex} style={[styles.positionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.positionHeader}>
              <Text style={[styles.positionTitle, { color: colors.text }]}>
                Position {positionIndex + 1}
              </Text>
              {positions.length > 1 && (
                <TouchableOpacity onPress={() => removePosition(positionIndex)}>
                  <Feather name="trash-2" size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Position Title *</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.background, 
                  color: colors.text,
                  borderColor: colors.border 
                }]}
                value={position.title}
                onChangeText={(text) => updatePosition(positionIndex, 'title', text)}
                placeholder="e.g., President, Vice President"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nominees</Text>
              <Text style={[styles.nomineeInfo, { color: colors.textSecondary }]}>
                Nominees will be added during the nomination phase after the election is created.
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.addPositionButton, { borderColor: colors.primary }]} onPress={addPosition}>
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={[styles.addPositionText, { color: colors.primary }]}>Add Position</Text>
        </TouchableOpacity>
      </ScrollView>
  );

  const renderStep3 = () => (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView 
        style={styles.stepContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.stepTitle, { color: colors.text }]}>Review & Create</Text>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          Review your election details before creating
        </Text>

        <View style={styles.summarySection}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Basic Information</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Title:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{title}</Text>
          {description && (
            <>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Description:</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{description}</Text>
            </>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Date & Time</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Start:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {startDate} at {startTime}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>End:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {endDate} at {endTime}
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Positions</Text>
          {positions.map((position, index) => (
            <View key={index} style={styles.positionSummary}>
              <Text style={[styles.positionSummaryTitle, { color: colors.text }]}>
                {position.title || `Position ${index + 1}`}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
                Nominees will be added during the nomination phase
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );

  const renderCalendarModal = () => (
    <Modal visible={calendarModalVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Start Date</Text>
            <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={startDate ? { [startDate]: { selected: true, selectedColor: colors.primary } } : {}}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.surface,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textSecondary,
              dotColor: colors.primary,
              selectedDotColor: colors.surface,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              indicatorColor: colors.primary,
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
            minDate={localDateString(new Date())}
          />
        </View>
      </View>
    </Modal>
  );

  const renderEndDateModal = () => (
    <Modal visible={endDateModalVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select End Date</Text>
            <TouchableOpacity onPress={() => setEndDateModalVisible(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Calendar
            onDayPress={handleEndDateSelect}
            markedDates={endDate ? { [endDate]: { selected: true, selectedColor: colors.primary } } : {}}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.surface,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textSecondary,
              dotColor: colors.primary,
              selectedDotColor: colors.surface,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              indicatorColor: colors.primary,
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
            minDate={startDate || localDateString(new Date())}
          />
        </View>
      </View>
    </Modal>
  );

  const renderTimePicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal visible={timePickerVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Start Time</Text>
                <TouchableOpacity onPress={() => setTimePickerVisible(false)}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedTimeValue}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setSelectedTimeValue(selectedTime);
                  }
                }}
                style={styles.timePicker}
                textColor={colors.text}
                accentColor={colors.primary}
              />
              <View style={styles.timePickerActions}>
                <TouchableOpacity 
                  style={[styles.timePickerButton, { backgroundColor: colors.border }]}
                  onPress={() => setTimePickerVisible(false)}
                >
                  <Text style={[styles.timePickerButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timePickerButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleTimeConfirm(selectedTimeValue);
                  }}
                >
                  <Text style={[styles.timePickerButtonText, { color: colors.surface }]}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    } else {
      return timePickerVisible ? (
        <DateTimePicker
          value={selectedTimeValue}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setTimePickerVisible(false);
            if (selectedTime) {
              setSelectedTimeValue(selectedTime);
              handleTimeConfirm(selectedTime);
            }
          }}
          textColor={colors.text}
          accentColor={colors.primary}
        />
      ) : null;
    }
  };

  const renderEndTimePicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal visible={endTimePickerVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select End Time</Text>
                <TouchableOpacity onPress={() => setEndTimePickerVisible(false)}>
                  <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedEndTimeValue}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setSelectedEndTimeValue(selectedTime);
                  }
                }}
                style={styles.timePicker}
                textColor={colors.text}
                accentColor={colors.primary}
              />
              <View style={styles.timePickerActions}>
                <TouchableOpacity 
                  style={[styles.timePickerButton, { backgroundColor: colors.border }]}
                  onPress={() => setEndTimePickerVisible(false)}
                >
                  <Text style={[styles.timePickerButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timePickerButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleEndTimeConfirm(selectedEndTimeValue);
                  }}
                >
                  <Text style={[styles.timePickerButtonText, { color: colors.surface }]}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    } else {
      return endTimePickerVisible ? (
        <DateTimePicker
          value={selectedEndTimeValue}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setEndTimePickerVisible(false);
            if (selectedTime) {
              setSelectedEndTimeValue(selectedTime);
              handleEndTimeConfirm(selectedTime);
            }
          }}
          textColor={colors.text}
          accentColor={colors.primary}
        />
      ) : null;
    }
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStepIndicator()}
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        {step < 3 ? (
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary },
              !canNavigateToStep(step + 1) && { backgroundColor: colors.border }
            ]}
            onPress={handleContinue}
            disabled={!canNavigateToStep(step + 1)}
          >
            <Text style={[styles.continueButtonText, { color: colors.surface }]}>
              Continue
            </Text>
            <Feather name="arrow-right" size={20} color={colors.surface} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              submitting && { backgroundColor: colors.border }
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={[styles.submitButtonText, { color: colors.surface }]}>
              {submitting ? 'Creating...' : 'Create Election'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {renderCalendarModal()}
      {renderEndDateModal()}
      {renderTimePicker()}
      {renderEndTimePicker()}
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
    paddingVertical: 15,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 34,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  content: {
    flex: 1,
  },

  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },

  scrollContent: {
    flexGrow: 1,
  },
  positionCard: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  positionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  nomineeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addPositionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addPositionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  nomineeInfo: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },

  summarySection: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    marginBottom: 12,
  },
  positionSummary: {
    marginBottom: 16,
  },
  positionSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timePicker: {
    width: '100%',
  },
  timePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 