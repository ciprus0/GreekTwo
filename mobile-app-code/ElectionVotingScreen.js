import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAppLock } from '../../contexts/AppLockContext';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function ElectionVotingScreen({ navigation, route }) {
  const { election } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [electionData, setElectionData] = useState(null);
  const [userVotes, setUserVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const { colors } = useTheme();
  const { user } = useAuth();
  const { isLocked: appLocked, lockedElectionId } = useAppLock();

  const CACHE_KEY = `electionVoting-${election?.id || 'none'}`;
  const CACHE_TTL = 30 * 1000; // 30 seconds

  useEffect(() => {
    if (election) {
      loadElectionData();
      checkAppLock();
      startCountdown();
      const interval = setInterval(() => {
        updateCountdown();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [election]);

  // Handle back button for locked mode
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isLocked) {
        setShowExitModal(true);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isLocked]);

  const checkAppLock = () => {
    // Check if this election is locked via the context
    if (appLocked && lockedElectionId === election.id) {
      setIsLocked(true);
    }
  };

  const checkAdminStatus = async (electionDataParam = null) => {
    try {
      const currentElectionData = electionDataParam || electionData;
      if (!currentElectionData) return;

      // Check if user is the creator of the election
      if (currentElectionData.created_by === user.id) {
        setIsAdmin(true);
        return;
      }

      // Check if user has admin role in the organization
      const { data: member, error } = await supabase
        .from('members')
        .select('roles')
        .eq('id', user.id)
        .single();

      if (!error && member?.roles) {
        const roles = Array.isArray(member.roles) ? member.roles : member.roles.split(',').map(r => r.trim());
        const hasAdminRole = roles.some(role => 
          role.toLowerCase().includes('admin') || 
          role.toLowerCase().includes('president') || 
          role.toLowerCase().includes('vice')
        );
        setIsAdmin(hasAdminRole);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const loadElectionData = async () => {
    try {
      // Try cache first
      const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
      let cache = null;
      if (cacheRaw) {
        try { cache = JSON.parse(cacheRaw) } catch {}
      }
      
      if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        setElectionData(cache.data);
        setUserVotes(cache.userVotes || {});
        setHasVoted(cache.hasVoted || false);
        setLoading(false);
      }

      // Fetch fresh data
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('id', election.id)
        .single();

      if (error) throw error;

      setElectionData(data);

      // Check if user is admin for this election
      await checkAdminStatus(data);

      // Load nominations and update positions
      await loadNominations(data);

      // Check if user has already voted for the current position
      const { data: existingVote, error: voteError } = await supabase
        .from('election_votes')
        .select('*')
        .eq('election_id', election.id)
        .eq('voter_id', user.id)
        .single();

      if (!voteError && existingVote) {
        setUserVotes(existingVote.votes || {});
        // Check if user has voted for the current position
        const currentPositionIndex = data.current_position_index;
        if (currentPositionIndex >= 0 && existingVote.votes && existingVote.votes[currentPositionIndex]) {
          setHasVoted(true);
        } else {
          setHasVoted(false);
        }
      } else {
        setHasVoted(false);
        setUserVotes({});
      }

      // Get vote count for current position if admin
      if (isAdmin && data.current_position_index >= 0) {
        await refreshVoteCount();
      }

      // Cache the data
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        userVotes: userVotes,
        hasVoted: hasVoted,
        timestamp: Date.now()
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error loading election data:', error);
      setLoading(false);
    }
  };

  const loadNominations = async (electionDataParam = null) => {
    try {
      const { data, error } = await supabase
        .from('election_nominations')
        .select(`
          *,
          nominee:members!election_nominations_nominee_id_fkey(id, name, email)
        `)
        .eq('election_id', election.id);

      if (error) throw error;

      // Group nominations by position and update election data
      const nominationsByPosition = {};
      data?.forEach(nomination => {
        if (!nominationsByPosition[nomination.position_index]) {
          nominationsByPosition[nomination.position_index] = [];
        }
        nominationsByPosition[nomination.position_index].push({
          name: nomination.nominee?.name || 'Unknown',
          id: nomination.nominee_id
        });
      });

      // Update positions with nominations
      const currentElectionData = electionDataParam || electionData;
      if (currentElectionData) {
        const updatedPositions = currentElectionData.positions.map((position, index) => ({
          ...position,
          nominees: nominationsByPosition[index] || []
        }));

        setElectionData({
          ...currentElectionData,
          positions: updatedPositions
        });
      }
    } catch (error) {
      console.error('Error loading nominations:', error);
    }
  };

  const startCountdown = () => {
    if (!electionData) return;
    
    const now = new Date().getTime();
    const endTime = new Date(electionData.end_time).getTime();
    
    if (electionData.status === 'active' && now < endTime) {
      setCountdown({ timeLeft: endTime - now });
    } else {
      setCountdown(null);
    }
  };

  const updateCountdown = () => {
    if (!electionData) return;
    
    const now = new Date().getTime();
    const endTime = new Date(electionData.end_time).getTime();
    
    if (electionData.status === 'active' && now < endTime) {
      const timeLeft = endTime - now;
      setCountdown({ timeLeft });
      
      // Auto-submit if time runs out
      if (timeLeft <= 0) {
        handleSubmitVote();
      }
    } else {
      setCountdown(null);
    }
  };

  const formatTimeLeft = (timeLeft) => {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const setVote = (positionIndex, nominee) => {
    if (hasVoted) return;
    
    // Only allow voting for the current position
    const currentPositionIndex = electionData?.current_position_index;
    if (positionIndex !== currentPositionIndex) {
      Alert.alert('Error', 'You can only vote for the current position');
      return;
    }
    
    setUserVotes(prev => ({
      ...prev,
      [positionIndex]: nominee
    }));
  };

  const handleSubmitVote = async () => {
    if (hasVoted) return;

    // Check if user has voted for the current position
    const currentPositionIndex = electionData.current_position_index;
    if (currentPositionIndex < 0) {
      Alert.alert('Error', 'No position is currently being voted on');
      return;
    }

    const currentVote = userVotes[currentPositionIndex];
    if (!currentVote) {
      Alert.alert('Error', 'Please select a candidate for the current position');
      return;
    }

    try {
      // Check if user already has a vote record for this election
      const { data: existingVote, error: checkError } = await supabase
        .from('election_votes')
        .select('*')
        .eq('election_id', election.id)
        .eq('voter_id', user.id)
        .single();

      let error;
      if (checkError && checkError.code === 'PGRST116') {
        // No existing vote record, create new one
        const { error: insertError } = await supabase
          .from('election_votes')
          .insert([{
            election_id: election.id,
            voter_id: user.id,
            votes: userVotes,
            created_at: new Date().toISOString(),
          }]);
        error = insertError;
      } else if (!checkError) {
        // Existing vote record found, update it
        const updatedVotes = { ...existingVote.votes, ...userVotes };
        const { error: updateError } = await supabase
          .from('election_votes')
          .update({
            votes: updatedVotes,
          })
          .eq('election_id', election.id)
          .eq('voter_id', user.id);
        error = updateError;
      } else {
        error = checkError;
      }

      if (error) throw error;

      setHasVoted(true);
      
      // Refresh vote count for admins
      if (isAdmin) {
        refreshVoteCount();
      }
      
      Alert.alert('Success', `Vote submitted for ${electionData.positions[electionData.current_position_index]?.title}!`, [
        { text: 'OK', onPress: () => {
          // Don't navigate away, just stay on the screen
          // The UI will show the waiting state
        }}
      ]);
    } catch (error) {
      console.error('Error submitting vote:', error);
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    }
  };

  const handleExit = () => {
    // Always show exit modal to confirm, regardless of lock status
    setShowExitModal(true);
  };

  // Admin control functions
  const startVotingForPosition = async (positionIndex) => {
    try {
      const position = electionData.positions[positionIndex];
      const timerMinutes = position.timer || 5; // Default 5 minutes if no timer set
      const endTime = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();

      const { error } = await supabase
        .from('elections')
        .update({
          status: 'active',
          current_position_index: positionIndex,
          end_time: endTime
        })
        .eq('id', election.id);

      if (error) throw error;

      Alert.alert('Success', `Voting started for ${position.title}. Timer set to ${timerMinutes} minutes.`);
      setVoteCount(0); // Reset vote count for new position
      setHasVoted(false); // Reset voting state for new position
      setUserVotes(prev => {
        const newVotes = { ...prev };
        delete newVotes[positionIndex]; // Clear any previous vote for this position
        return newVotes;
      });
      loadElectionData(); // Refresh data
    } catch (error) {
      console.error('Error starting voting:', error);
      Alert.alert('Error', 'Failed to start voting. Please try again.');
    }
  };

  const endVotingForPosition = async () => {
    try {
      const currentPositionIndex = electionData.current_position_index;
      const nextPositionIndex = currentPositionIndex + 1;

      let updateData = {
        status: 'waiting',
        current_position_index: -1
      };

      // If there are more positions, move to next
      if (nextPositionIndex < electionData.positions.length) {
        updateData.current_position_index = nextPositionIndex;
      } else {
        // All positions completed, end election
        updateData.status = 'ended';
        // Clear app lock when election ends
        updateData.app_locked = false;
      }

      // Only update end_time if we're moving to the next position
      if (nextPositionIndex < electionData.positions.length) {
        const nextPosition = electionData.positions[nextPositionIndex];
        const timerMinutes = nextPosition?.timer || 5;
        updateData.end_time = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
      } else {
        // Election is ending, set end_time to current time
        updateData.end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('elections')
        .update(updateData)
        .eq('id', election.id);

      if (error) throw error;

      const positionTitle = electionData.positions[currentPositionIndex]?.title || 'Current Position';
      Alert.alert('Success', `Voting ended for ${positionTitle}.${nextPositionIndex < electionData.positions.length ? ' Moving to next position.' : ' Election completed.'}`);
      loadElectionData(); // Refresh data
    } catch (error) {
      console.error('Error ending voting:', error);
      Alert.alert('Error', 'Failed to end voting. Please try again.');
    }
  };

  const setPositionTimer = async (positionIndex, minutes) => {
    try {
      const updatedPositions = [...electionData.positions];
      updatedPositions[positionIndex] = {
        ...updatedPositions[positionIndex],
        timer: minutes
      };

      const { error } = await supabase
        .from('elections')
        .update({ positions: updatedPositions })
        .eq('id', election.id);

      if (error) throw error;

      Alert.alert('Success', `Timer set to ${minutes} minutes for ${updatedPositions[positionIndex].title}`);
      loadElectionData(); // Refresh data
    } catch (error) {
      console.error('Error setting timer:', error);
      Alert.alert('Error', 'Failed to set timer. Please try again.');
    }
  };

  const refreshVoteCount = async () => {
    try {
      if (electionData.current_position_index >= 0) {
        const { count, error } = await supabase
          .from('election_votes')
          .select('*', { count: 'exact', head: true })
          .eq('election_id', election.id);

        if (!error) {
          setVoteCount(count || 0);
        }
      }
    } catch (error) {
      console.error('Error refreshing vote count:', error);
    }
  };

  const toggleAppLock = async () => {
    try {
      const newLockState = !electionData.app_locked;
      
      const { error } = await supabase
        .from('elections')
        .update({ app_locked: newLockState })
        .eq('id', election.id);

      if (error) throw error;

      Alert.alert('Success', `App lock ${newLockState ? 'enabled' : 'disabled'}`);
      loadElectionData(); // Refresh data
    } catch (error) {
      console.error('Error toggling app lock:', error);
      Alert.alert('Error', 'Failed to toggle app lock. Please try again.');
    }
  };

  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );

  const PositionCard = ({ position, positionIndex, nominees, selectedNominee }) => (
    <Card style={styles.positionCard}>
      <Text style={[styles.positionTitle, { color: colors.text }]}>{position.title}</Text>
      <Text style={[styles.positionSubtitle, { color: colors.textSecondary }]}>
        Select your candidate:
      </Text>
      
      {nominees.map((nominee, nomineeIndex) => (
        <TouchableOpacity
          key={nomineeIndex}
          style={[
            styles.nomineeOption,
            { borderColor: colors.border },
            selectedNominee?.id === nominee.id && { 
              borderColor: colors.primary, 
              backgroundColor: colors.primary + '20' 
            }
          ]}
          onPress={() => setVote(positionIndex, nominee)}
          disabled={hasVoted}
        >
          <View style={[
            styles.radioButton,
            { borderColor: colors.primary },
            selectedNominee?.id === nominee.id && { backgroundColor: colors.primary }
          ]}>
            {selectedNominee?.id === nominee.id && (
              <View style={[styles.radioInner, { backgroundColor: colors.surface }]} />
            )}
          </View>
          <Text style={[styles.nomineeName, { color: colors.text }]}>{nominee.name}</Text>
        </TouchableOpacity>
      ))}
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading election...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle different election states
  if (!electionData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Election Not Found</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            This election could not be loaded.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.surface }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show waiting page when election is in waiting status
  if (electionData.status === 'waiting') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          {!isLocked && (
            <TouchableOpacity onPress={handleExit}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>{electionData.title}</Text>
          {isLocked && (
            <View style={[styles.lockIndicator, { backgroundColor: colors.primary }]}>
              <Feather name="lock" size={16} color={colors.surface} />
            </View>
          )}
          {!isLocked && <View style={{ width: 24 }} />}
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.waitingContainer}>
            <Feather name="clock" size={64} color={colors.primary} />
            <Text style={[styles.waitingTitle, { color: colors.text }]}>Waiting for Voting to Begin</Text>
            <Text style={[styles.waitingMessage, { color: colors.textSecondary }]}>
              The election has started but voting has not yet begun. Please wait for the admin to open voting for each position.
            </Text>
            
            <Card style={styles.positionsPreview}>
              <Text style={[styles.positionsTitle, { color: colors.text }]}>Positions to Vote On:</Text>
              {electionData.positions?.map((position, index) => {
                const isCompleted = index < electionData.current_position_index;
                return (
                  <View key={index} style={styles.positionPreview}>
                    <Text style={[styles.positionName, { color: colors.text }]}>{position.title}</Text>
                    <View style={styles.positionPreviewRight}>
                      <Text style={[styles.nomineeCount, { color: colors.textSecondary }]}>
                        {position.nominees?.length || 0} nominees
                      </Text>
                      {isCompleted && (
                        <View style={[styles.doneBadge, { backgroundColor: colors.success }]}>
                          <Text style={styles.doneText}>Done</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>

            {/* Admin Controls */}
            {isAdmin && (
              <Card style={styles.adminControlsCard}>
                <Text style={[styles.adminTitle, { color: colors.text }]}>Admin Controls</Text>
                
                {/* App Lock Toggle */}
                <View style={styles.adminControlRow}>
                  <View style={styles.adminControlLabel}>
                    <Feather name="lock" size={20} color={colors.textSecondary} />
                    <Text style={[styles.adminControlText, { color: colors.text }]}>App Lock</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.adminToggleButton,
                      { backgroundColor: electionData.app_locked ? colors.error : colors.success }
                    ]}
                    onPress={toggleAppLock}
                  >
                    <Text style={[styles.adminToggleText, { color: colors.surface }]}>
                      {electionData.app_locked ? 'Enabled' : 'Disabled'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Position Management */}
                <Text style={[styles.adminSectionTitle, { color: colors.text }]}>Position Management</Text>
                
                                 {electionData.positions?.map((position, index) => {
                   // Check if this position has been completed
                   const isCompleted = index < electionData.current_position_index;
                   
                   return (
                     <View key={index} style={styles.adminPositionRow}>
                       <View style={styles.adminPositionInfo}>
                         <Text style={[styles.adminPositionTitle, { color: colors.text }]}>
                           {position.title}
                         </Text>

                       </View>
                       
                       <View style={styles.adminPositionActions}>
                         {/* Set Timer Button */}
                         <TouchableOpacity
                           style={[styles.adminActionButton, { backgroundColor: colors.primary }]}
                           onPress={() => {
                             const currentTimer = position.timer || 5;
                             const timers = [5, 10, 15, 30];
                             const currentIndex = timers.indexOf(currentTimer);
                             const nextIndex = (currentIndex + 1) % timers.length;
                             setPositionTimer(index, timers[nextIndex]);
                           }}
                         >
                           <Text style={[styles.adminActionText, { color: colors.surface }]}>
                             {position.timer || 5}m
                           </Text>
                         </TouchableOpacity>
                         
                         {/* Start Voting Button */}
                         <TouchableOpacity
                           style={[
                             styles.adminActionButton, 
                             { backgroundColor: isCompleted ? colors.border : colors.success }
                           ]}
                           onPress={() => !isCompleted && startVotingForPosition(index)}
                           disabled={isCompleted}
                         >
                           <Text style={[styles.adminActionText, { color: isCompleted ? colors.textSecondary : colors.surface }]}>
                             {isCompleted ? 'Done' : 'Start'}
                           </Text>
                         </TouchableOpacity>
                       </View>
                     </View>
                   );
                 })}

                {/* End Election Button */}
                <TouchableOpacity
                  style={[styles.endElectionButton, { backgroundColor: colors.error }]}
                  onPress={() => {
                    Alert.alert(
                      'End Election',
                      'Are you sure you want to end this election? This action cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'End Election', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const { error } = await supabase
                                .from('elections')
                                .update({ 
                                  status: 'ended',
                                  app_locked: false 
                                })
                                .eq('id', election.id);
                              
                              if (error) throw error;
                              
                              Alert.alert('Success', 'Election has been ended.');
                              loadElectionData();
                            } catch (error) {
                              console.error('Error ending election:', error);
                              Alert.alert('Error', 'Failed to end election. Please try again.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Feather name="x-circle" size={20} color={colors.surface} />
                  <Text style={[styles.endElectionText, { color: colors.surface }]}>End Election</Text>
                </TouchableOpacity>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show ended message when election has ended
  if (electionData.status === 'ended') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{electionData.title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.endedContainer}>
          <Feather name="check-circle" size={64} color={colors.success} />
          <Text style={[styles.endedTitle, { color: colors.text }]}>Election Complete</Text>
          <Text style={[styles.endedMessage, { color: colors.textSecondary }]}>
            This election has ended. Results will be available soon.
          </Text>
          
          <TouchableOpacity
            style={[styles.viewResultsButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ElectionResults', { election })}
          >
            <Text style={[styles.viewResultsText, { color: colors.surface }]}>View Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if election is not in active state
  if (electionData.status !== 'active') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Election Not Available</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            This election is not currently active for voting.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.surface }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        {!isLocked && (
          <TouchableOpacity onPress={handleExit}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>{electionData.title}</Text>
        {isLocked && (
          <View style={[styles.lockIndicator, { backgroundColor: colors.primary }]}>
            <Feather name="lock" size={16} color={colors.surface} />
          </View>
        )}
      </View>

      {/* Countdown Timer */}
      {countdown && (
        <View style={[styles.countdownContainer, { backgroundColor: colors.primary }]}>
          <Feather name="clock" size={20} color={colors.surface} />
          <Text style={[styles.countdownText, { color: colors.surface }]}>
            Time Remaining: {formatTimeLeft(countdown.timeLeft)}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Election Info */}
        <Card>
          <Text style={[styles.electionTitle, { color: colors.text }]}>{electionData.title}</Text>
          {electionData.description && (
            <Text style={[styles.electionDescription, { color: colors.textSecondary }]}>
              {electionData.description}
            </Text>
          )}
          

        </Card>

        {/* Current Position Being Voted On */}
        {electionData.current_position_index >= 0 && electionData.positions?.[electionData.current_position_index] && (
          <Card style={styles.currentPositionCard}>
            <Text style={[styles.currentPositionTitle, { color: colors.text }]}>
              Currently Voting: {electionData.positions[electionData.current_position_index].title}
            </Text>
            
            {hasVoted ? (
              <View style={styles.votedWaitingState}>
                <Feather name="check-circle" size={48} color={colors.success} />
                <Text style={[styles.votedWaitingTitle, { color: colors.text }]}>
                  Vote Submitted!
                </Text>
                <Text style={[styles.votedWaitingMessage, { color: colors.textSecondary }]}>
                  You have voted for {electionData.positions[electionData.current_position_index].title}
                </Text>
                <Text style={[styles.votedWaitingSubtitle, { color: colors.textSecondary }]}>
                  Waiting for next position voting to begin...
                </Text>
              </View>
            ) : (
              <PositionCard
                position={electionData.positions[electionData.current_position_index]}
                positionIndex={electionData.current_position_index}
                nominees={electionData.positions[electionData.current_position_index].nominees}
                selectedNominee={userVotes[electionData.current_position_index]}
              />
            )}
          </Card>
        )}

        {/* Completed Positions */}
        {electionData.positions?.map((position, positionIndex) => {
          if (positionIndex < electionData.current_position_index) {
            return (
              <Card key={positionIndex} style={styles.completedPositionCard}>
                <View style={styles.completedPositionHeader}>
                  <Text style={[styles.completedPositionTitle, { color: colors.text }]}>
                    {position.title}
                  </Text>
                  <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>
                <Text style={[styles.completedMessage, { color: colors.textSecondary }]}>
                  Voting for this position has been completed.
                </Text>
              </Card>
            );
          }
          return null;
        })}

        {/* Submit Button */}
        {!hasVoted && electionData.current_position_index >= 0 && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              !userVotes[electionData.current_position_index] && { opacity: 0.5 }
            ]}
            onPress={handleSubmitVote}
            disabled={!userVotes[electionData.current_position_index]}
          >
            <Feather name="check" size={20} color={colors.surface} />
            <Text style={[styles.submitButtonText, { color: colors.surface }]}>
              Submit Vote for {electionData.positions[electionData.current_position_index]?.title}
            </Text>
          </TouchableOpacity>
        )}

                 {/* Instructions */}
         <Card style={styles.instructionsCard}>
           <Text style={[styles.instructionsTitle, { color: colors.text }]}>Voting Instructions</Text>
           <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
             • Select one candidate for the current position{'\n'}
             • You can change your selection before submitting{'\n'}
             • Once submitted, your vote for this position cannot be changed{'\n'}
             • Voting will automatically close when time expires{'\n'}
             • You will be able to vote for the next position when it opens
           </Text>
         </Card>

         {/* Admin Controls - Show during active voting */}
         {isAdmin && (
           <Card style={styles.adminControlsCard}>
             <Text style={[styles.adminTitle, { color: colors.text }]}>Admin Controls</Text>
             
             {/* Current Position Info */}
             {electionData.current_position_index >= 0 && (
               <View style={styles.adminCurrentPosition}>
                 <Text style={[styles.adminCurrentPositionTitle, { color: colors.text }]}>
                   Currently Voting: {electionData.positions[electionData.current_position_index]?.title}
                 </Text>
                 <Text style={[styles.adminCurrentPositionSubtitle, { color: colors.textSecondary }]}>
                   Timer: {electionData.positions[electionData.current_position_index]?.timer || 5} minutes
                 </Text>
                 <Text style={[styles.voteCountText, { color: colors.primary }]}>
                   Votes Cast: {voteCount}
                 </Text>
               </View>
             )}

             {/* Admin Action Buttons */}
             <View style={styles.adminActionButtons}>
               {/* Timer Control */}
               <TouchableOpacity
                 style={[styles.adminActionButton, { backgroundColor: colors.primary }]}
                 onPress={() => {
                   const currentPosition = electionData.positions[electionData.current_position_index];
                   const currentTimer = currentPosition?.timer || 5;
                   const timers = [5, 10, 15, 30];
                   const currentIndex = timers.indexOf(currentTimer);
                   const nextIndex = (currentIndex + 1) % timers.length;
                   setPositionTimer(electionData.current_position_index, timers[nextIndex]);
                 }}
               >
                 <Feather name="clock" size={16} color={colors.surface} />
                 <Text style={[styles.adminActionText, { color: colors.surface }]}>
                   {electionData.positions[electionData.current_position_index]?.timer || 5}m
                 </Text>
               </TouchableOpacity>

               {/* Refresh Vote Count */}
               <TouchableOpacity
                 style={[styles.adminActionButton, { backgroundColor: colors.info }]}
                 onPress={refreshVoteCount}
               >
                 <Feather name="refresh-cw" size={16} color={colors.surface} />
                 <Text style={[styles.adminActionText, { color: colors.surface }]}>Refresh</Text>
               </TouchableOpacity>

               {/* End Voting Button */}
               <TouchableOpacity
                 style={[styles.adminActionButton, { backgroundColor: colors.error }]}
                 onPress={endVotingForPosition}
               >
                 <Feather name="stop-circle" size={16} color={colors.surface} />
                 <Text style={[styles.adminActionText, { color: colors.surface }]}>End Voting</Text>
               </TouchableOpacity>

               {/* App Lock Toggle */}
               <TouchableOpacity
                 style={[
                   styles.adminActionButton,
                   { backgroundColor: electionData.app_locked ? colors.error : colors.success }
                 ]}
                 onPress={toggleAppLock}
               >
                 <Feather name="lock" size={16} color={colors.surface} />
                 <Text style={[styles.adminActionText, { color: colors.surface }]}>
                   {electionData.app_locked ? 'Locked' : 'Unlocked'}
                 </Text>
               </TouchableOpacity>
             </View>

             {/* Next Position Preview */}
             {electionData.current_position_index + 1 < electionData.positions.length && (
               <View style={styles.adminNextPosition}>
                 <Text style={[styles.adminNextPositionTitle, { color: colors.text }]}>
                   Next Position: {electionData.positions[electionData.current_position_index + 1]?.title}
                 </Text>
                 <Text style={[styles.adminNextPositionSubtitle, { color: colors.textSecondary }]}>
                   {electionData.positions[electionData.current_position_index + 1]?.nominees?.length || 0} nominees
                 </Text>
               </View>
             )}

             {/* End Election Button */}
             <TouchableOpacity
               style={[styles.endElectionButton, { backgroundColor: colors.error }]}
               onPress={() => {
                 Alert.alert(
                   'End Election',
                   'Are you sure you want to end this election? This action cannot be undone.',
                   [
                     { text: 'Cancel', style: 'cancel' },
                     { 
                       text: 'End Election', 
                       style: 'destructive',
                       onPress: async () => {
                         try {
                           const { error } = await supabase
                             .from('elections')
                             .update({ 
                               status: 'ended',
                               app_locked: false 
                             })
                             .eq('id', election.id);
                           
                           if (error) throw error;
                           
                           Alert.alert('Success', 'Election has been ended.');
                           loadElectionData();
                         } catch (error) {
                           console.error('Error ending election:', error);
                           Alert.alert('Error', 'Failed to end election. Please try again.');
                         }
                       }
                     }
                   ]
                 );
               }}
             >
               <Feather name="x-circle" size={20} color={colors.surface} />
               <Text style={[styles.endElectionText, { color: colors.surface }]}>End Election</Text>
             </TouchableOpacity>
           </Card>
         )}
       </ScrollView>

      {/* Exit Confirmation Modal */}
      <Modal visible={showExitModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Feather name="alert-triangle" size={24} color={colors.error} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Exit Election?</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                {hasVoted 
                  ? 'You have voted for the current position. Are you sure you want to exit? You can return later to vote for the next position.'
                  : 'Are you sure you want to exit? Your vote for this position will not be saved.'
                }
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={() => {
                  setShowExitModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.surface }]}>Exit</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  lockIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  positionsPreview: {
    width: '100%',
    maxWidth: 400,
  },
  positionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  positionPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  positionPreviewRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  positionName: {
    fontSize: 16,
    fontWeight: '500',
  },
  nomineeCount: {
    fontSize: 14,
  },
  endedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  endedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  endedMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  viewResultsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  viewResultsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentPositionCard: {
    marginBottom: 16,
  },
  currentPositionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  completedPositionCard: {
    marginBottom: 16,
  },
  completedPositionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedPositionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  completedMessage: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  electionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  electionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  votedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  votedText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  positionCard: {
    marginBottom: 16,
  },
  positionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  positionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  nomineeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nomineeName: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructionsCard: {
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '98%',
    maxWidth: 800,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalBody: {
    padding: 24,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
  // Admin control styles
  adminControlsCard: {
    marginTop: 20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  adminTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  adminControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminControlLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  adminControlText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  adminToggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  adminToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  adminSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  adminPositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  adminPositionInfo: {
    flex: 1,
    marginRight: 8,
    minWidth: 0, // Allow text to wrap
  },
  adminPositionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  adminPositionSubtitle: {
    fontSize: 12,
    lineHeight: 14,
  },
  adminPositionActions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
    minWidth: 100,
  },
  adminActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 45,
    alignItems: 'center',
  },
  adminActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endElectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  endElectionText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Additional admin control styles for active voting
  adminCurrentPosition: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  adminCurrentPositionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  adminCurrentPositionSubtitle: {
    fontSize: 14,
  },
  adminActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  adminNextPosition: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  adminNextPositionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  adminNextPositionSubtitle: {
    fontSize: 12,
  },
  voteCountText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  votedWaitingState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  votedWaitingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  votedWaitingMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  votedWaitingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 