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
  Switch,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAppLock } from '../../contexts/AppLockContext';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ElectionManagementScreen({ navigation, route }) {
  const { election } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [electionData, setElectionData] = useState(null);
  const [voterStats, setVoterStats] = useState({});
  const [eligibleVoters, setEligibleVoters] = useState([]);
  const [ineligibleVoters, setIneligibleVoters] = useState([]);
  const [showVoterModal, setShowVoterModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [countdown, setCountdown] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);



  const { colors } = useTheme();
  const { user } = useAuth();
  const { isLocked, lockedElectionId, setAppLock } = useAppLock();

  // Check if current election is locked (use database value as source of truth)
  const isCurrentElectionLocked = electionData?.app_locked === true;

  // Force re-render when app lock state changes
  useEffect(() => {
    // App lock state changed, component will re-render automatically
  }, [isLocked, lockedElectionId, election?.id, isCurrentElectionLocked]);

  const CACHE_KEY = `electionManagement-${election?.id || 'none'}`;
  const CACHE_TTL = 30 * 1000; // 30 seconds for real-time data

  useEffect(() => {
    if (election && election.id) {
      loadElectionData();
    }
  }, [election?.id]);

  useEffect(() => {
    if (electionData) {
      startCountdown();
      const interval = setInterval(() => {
        updateCountdown();
        // Only fetch voter stats every 30 seconds to reduce database calls
        if (electionData?.status === 'active' && Date.now() % 30000 < 1000) {
          fetchVoterStats();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [electionData?.id, electionData?.status]);

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      // Clear cache when component unmounts to ensure fresh data on next load
      AsyncStorage.removeItem(CACHE_KEY);
    };
  }, []);

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
        setVoterStats(cache.voterStats || {});
        setEligibleVoters(cache.eligibleVoters || []);
        setIneligibleVoters(cache.ineligibleVoters || []);
        setLoading(false);
        return; // Don't fetch fresh data if cache is valid
      }

      // Fetch fresh data
      const { data, error } = await supabase
        .from('elections')
        .select('*')
        .eq('id', election.id)
        .single();

      if (error) throw error;

      setElectionData(data);
      
      // Fetch all voters
      const { data: voters, error: votersError } = await supabase
        .from('members')
        .select('id, name, email')
        .eq('organization_id', user?.user_metadata?.organization_id);

      if (!votersError) {
        const allVoters = voters || [];
        const ineligibleIds = data.ineligible_voters || [];
        
        // Separate eligible and ineligible voters
        const eligible = allVoters.filter(voter => !ineligibleIds.includes(voter.id));
        const ineligible = allVoters.filter(voter => ineligibleIds.includes(voter.id));
        
        setEligibleVoters(eligible);
        setIneligibleVoters(ineligible);
      }

      // Fetch voter stats if election is active
      if (data.status === 'active') {
        await fetchVoterStats();
      }

      // Cache the data
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        voterStats: voterStats,
        eligibleVoters: eligibleVoters,
        ineligibleVoters: ineligibleVoters,
        timestamp: Date.now()
      }));

      setLoading(false);
    } catch (error) {
      console.error('Error loading election data:', error);
      setLoading(false);
    }
  };

  const fetchVoterStats = async () => {
    try {
      const { data: votes, error } = await supabase
        .from('election_votes')
        .select('*')
        .eq('election_id', election.id);

      if (error) throw error;

      const stats = {
        totalVotes: votes?.length || 0,
        totalEligible: eligibleVoters.length,
        participationRate: eligibleVoters.length > 0 ? ((votes?.length || 0) / eligibleVoters.length * 100).toFixed(1) : 0,
        positions: {}
      };

      // Calculate stats per position
      if (electionData?.positions) {
        electionData.positions.forEach((position, index) => {
          const positionVotes = votes?.filter(vote => 
            vote.votes && vote.votes[index] !== null
          ) || [];
          
          const voteCounts = {};
          positionVotes.forEach(vote => {
            const nominee = vote.votes[index];
            voteCounts[nominee] = (voteCounts[nominee] || 0) + 1;
          });

          stats.positions[position.title] = {
            totalVotes: positionVotes.length,
            voteCounts,
            leader: Object.keys(voteCounts).reduce((a, b) => 
              voteCounts[a] > voteCounts[b] ? a : b, null
            )
          };
        });
      }

      setVoterStats(stats);
      
      // Update cache with new stats
      if (electionData) {
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: electionData,
          voterStats: stats,
          eligibleVoters: eligibleVoters,
          ineligibleVoters: ineligibleVoters,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error fetching voter stats:', error);
    }
  };

  const startCountdown = () => {
    if (!electionData) return;
    
    const now = new Date().getTime();
    const startTime = new Date(electionData.start_time).getTime();
    const endTime = new Date(electionData.end_time).getTime();
    
    if (electionData.status === 'scheduled' && now < startTime) {
      // Countdown to start
      setCountdown({ type: 'start', timeLeft: startTime - now });
    } else if (electionData.status === 'active' && now < endTime) {
      // Countdown to end
      setCountdown({ type: 'end', timeLeft: endTime - now });
    } else {
      setCountdown(null);
    }
  };

  const updateCountdown = () => {
    if (!electionData) return;
    
    const now = new Date().getTime();
    const startTime = new Date(electionData.start_time).getTime();
    const endTime = new Date(electionData.end_time).getTime();
    
    if (electionData.status === 'scheduled' && now < startTime) {
      setCountdown({ type: 'start', timeLeft: startTime - now });
    } else if (electionData.status === 'active' && now < endTime) {
      setCountdown({ type: 'end', timeLeft: endTime - now });
    } else {
      setCountdown(null);
    }
  };

  const formatTimeLeft = (timeLeft) => {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const startElection = async () => {
    try {
      // Check if there are nominations for all positions
      const { data: nominations, error: nominationsError } = await supabase
        .from('election_nominations')
        .select('position_index')
        .eq('election_id', election.id);

      if (nominationsError) throw nominationsError;

      // Group nominations by position
      const nominationsByPosition = {};
      nominations?.forEach(nomination => {
        if (!nominationsByPosition[nomination.position_index]) {
          nominationsByPosition[nomination.position_index] = 0;
        }
        nominationsByPosition[nomination.position_index]++;
      });

      // Check if all positions have at least one nomination
      const positions = electionData?.positions || [];
      const missingNominations = positions.filter((_, index) => 
        !nominationsByPosition[index] || nominationsByPosition[index] === 0
      );

      if (missingNominations.length > 0) {
        Alert.alert(
          'Missing Nominations', 
          `The following positions need nominations before starting:\n${missingNominations.map((_, index) => positions[index].title).join('\n')}`
        );
        return;
      }

      const { error } = await supabase
        .from('elections')
        .update({ 
          status: 'waiting',
          current_position_index: -1 // Start in waiting mode
        })
        .eq('id', election.id);

      if (error) throw error;

      Alert.alert('Success', 'Election started! Members will now see the waiting page.');
      setRefreshKey(prev => prev + 1);
      await loadElectionData();
    } catch (error) {
      console.error('Error starting election:', error);
      Alert.alert('Error', 'Failed to start election');
    }
  };

  const endElection = async () => {
    try {
      const { error } = await supabase
        .from('elections')
        .update({ 
          status: 'ended'
        })
        .eq('id', election.id);

      if (error) throw error;

      Alert.alert('Success', 'Election has been ended!');
      setRefreshKey(prev => prev + 1);
      await loadElectionData();
    } catch (error) {
      console.error('Error ending election:', error);
      Alert.alert('Error', 'Failed to end election');
    }
  };

  const toggleAppLock = async () => {
    try {
      const newLockStatus = !isCurrentElectionLocked;
      
      // Update the database with the new app_locked status
      const { error } = await supabase
        .from('elections')
        .update({ app_locked: newLockStatus })
        .eq('id', election.id);

      if (error) throw error;

      // Update the app lock context
      await setAppLock(newLockStatus, newLockStatus ? election.id : null);

      // Update local election data
      setElectionData(prev => ({
        ...prev,
        app_locked: newLockStatus
      }));

      // Force a re-render by updating the refresh key
      setRefreshKey(prev => prev + 1);

      Alert.alert(
        newLockStatus ? 'App Locked' : 'App Unlocked',
        newLockStatus 
          ? 'Users will be locked to the election screen during voting'
          : 'Users can now navigate freely'
      );
    } catch (error) {
      console.error('Error toggling app lock:', error);
      Alert.alert('Error', 'Failed to toggle app lock');
    }
  };

  const openEditModal = () => {
    if (!electionData) return;
    
    // Prevent editing if election has ended
    if (electionData.status === 'ended') {
      Alert.alert('Cannot Edit', 'This election has ended and cannot be modified.');
      return;
    }
    
    // Navigate to the dedicated edit screen
    navigation.navigate('EditElection', { election: electionData });
  };

  const advanceToNextPosition = async () => {
    try {
      const currentIndex = electionData.current_position_index;
      const positions = electionData.positions || [];
      
      if (currentIndex >= positions.length - 1) {
        // All positions have been voted on, end the election
        const { error } = await supabase
          .from('elections')
          .update({ 
            status: 'ended',
            current_position_index: positions.length
          })
          .eq('id', election.id);

        if (error) throw error;

        Alert.alert('Election Complete', 'All positions have been voted on. The election is now complete.');
      } else {
        // Move to next position
        const nextIndex = currentIndex + 1;
        const { error } = await supabase
          .from('elections')
          .update({ current_position_index: nextIndex })
          .eq('id', election.id);

        if (error) throw error;

        Alert.alert('Position Started', `Voting is now open for: ${positions[nextIndex].title}`);
      }
      
      setRefreshKey(prev => prev + 1);
      await loadElectionData();
    } catch (error) {
      console.error('Error advancing position:', error);
      Alert.alert('Error', 'Failed to advance to next position');
    }
  };

  const startVotingForPosition = async (positionIndex) => {
    try {
      // Calculate end time for this position (default 5 minutes if not set)
      const positionTimer = electionData.positions[positionIndex]?.timer || 5; // minutes
      const endTime = new Date(Date.now() + (positionTimer * 60 * 1000)).toISOString();
      
      const { error } = await supabase
        .from('elections')
        .update({ 
          current_position_index: positionIndex,
          status: 'active', // Change status to active when starting voting
          end_time: endTime // Set end time for this position
        })
        .eq('id', election.id);

      if (error) throw error;

      const positionTitle = electionData.positions[positionIndex]?.title || 'Unknown Position';
      Alert.alert('Voting Started', `Voting is now open for: ${positionTitle}\nTimer: ${positionTimer} minutes`);
      
      setRefreshKey(prev => prev + 1);
      await loadElectionData();
    } catch (error) {
      console.error('Error starting voting for position:', error);
      Alert.alert('Error', 'Failed to start voting for position');
    }
  };

  const endVotingForPosition = async () => {
    try {
      const currentIndex = electionData.current_position_index;
      const positions = electionData.positions || [];
      
      if (currentIndex >= positions.length - 1) {
        // All positions have been voted on, end the election
        const { error } = await supabase
          .from('elections')
          .update({ 
            status: 'ended',
            current_position_index: positions.length
          })
          .eq('id', election.id);

        if (error) throw error;

        Alert.alert('Election Complete', 'All positions have been voted on. The election is now complete.');
      } else {
        // Move to next position
        const nextIndex = currentIndex + 1;
        const { error } = await supabase
          .from('elections')
          .update({ 
            current_position_index: nextIndex,
            status: 'waiting' // Go back to waiting for next position
          })
          .eq('id', election.id);

        if (error) throw error;

        Alert.alert('Position Completed', `Voting completed for: ${positions[currentIndex].title}\nReady to start next position.`);
      }
      
      setRefreshKey(prev => prev + 1);
      await loadElectionData();
    } catch (error) {
      console.error('Error ending voting for position:', error);
      Alert.alert('Error', 'Failed to end voting for position');
    }
  };

  const setPositionTimer = async (positionIndex, minutes) => {
    try {
      const positions = [...electionData.positions];
      positions[positionIndex] = {
        ...positions[positionIndex],
        timer: minutes
      };

      const { error } = await supabase
        .from('elections')
        .update({ positions })
        .eq('id', election.id);

      if (error) throw error;

      setElectionData(prev => ({
        ...prev,
        positions
      }));

      Alert.alert('Timer Updated', `Timer set to ${minutes} minutes for ${positions[positionIndex].title}`);
    } catch (error) {
      console.error('Error setting position timer:', error);
      Alert.alert('Error', 'Failed to set position timer');
    }
  };







  const toggleVoterEligibility = async (voterId, makeIneligible) => {
    try {
      const currentIneligible = electionData.ineligible_voters || [];
      let newIneligible;
      
      if (makeIneligible) {
        // Add to ineligible list
        newIneligible = [...currentIneligible, voterId];
      } else {
        // Remove from ineligible list
        newIneligible = currentIneligible.filter(id => id !== voterId);
      }
      
      const { error } = await supabase
        .from('elections')
        .update({ ineligible_voters: newIneligible })
        .eq('id', election.id);

      if (error) throw error;

      // Update local state
      const voter = makeIneligible 
        ? eligibleVoters.find(v => v.id === voterId)
        : ineligibleVoters.find(v => v.id === voterId);
      
      if (voter) {
        if (makeIneligible) {
          setEligibleVoters(prev => prev.filter(v => v.id !== voterId));
          setIneligibleVoters(prev => [...prev, voter]);
        } else {
          setIneligibleVoters(prev => prev.filter(v => v.id !== voterId));
          setEligibleVoters(prev => [...prev, voter]);
        }
      }

      // Update election data
      setElectionData(prev => ({
        ...prev,
        ineligible_voters: newIneligible
      }));

      Alert.alert(
        'Success',
        `Voter ${makeIneligible ? 'marked as ineligible' : 'marked as eligible'}`
      );
    } catch (error) {
      console.error('Error toggling voter eligibility:', error);
      Alert.alert('Error', 'Failed to update voter eligibility');
    }
  };

  const deleteElection = async () => {
    Alert.alert(
      'Delete Election',
      'Are you sure you want to delete this election? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all votes first
              const { error: votesError } = await supabase
                .from('election_votes')
                .delete()
                .eq('election_id', election.id);

              if (votesError) throw votesError;

              // Delete the election
              const { error } = await supabase
                .from('elections')
                .delete()
                .eq('id', election.id);

              if (error) throw error;

              Alert.alert('Success', 'Election deleted successfully!');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting election:', error);
              Alert.alert('Error', 'Failed to delete election');
            }
          }
        }
      ]
    );
  };

  // Ensure all functions are defined
  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );

  const StatsCard = ({ title, value, subtitle, color = colors.primary }) => (
    <Card style={styles.statsCard}>
      <Text style={[styles.statsValue, { color }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statsSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </Card>
  );

  const PositionStats = ({ position, stats }) => (
    <Card style={styles.positionCard}>
      <Text style={[styles.positionTitle, { color: colors.text }]}>{position.title}</Text>
      <Text style={[styles.positionSubtitle, { color: colors.textSecondary }]}>
        {stats.totalVotes} votes cast
      </Text>
      
      {Object.entries(stats.voteCounts || {}).map(([nominee, count]) => (
        <View key={nominee} style={styles.nomineeRow}>
          <View style={styles.nomineeInfo}>
            <Text style={[styles.nomineeName, { color: colors.text }]}>{nominee}</Text>
            <Text style={[styles.nomineeVotes, { color: colors.textSecondary }]}>
              {count} votes ({((count / stats.totalVotes) * 100).toFixed(1)}%)
            </Text>
          </View>
          {stats.leader === nominee && (
            <View style={[styles.leaderBadge, { backgroundColor: colors.primary }]}>
              <Feather name="award" size={12} color={colors.surface} />
            </View>
          )}
        </View>
      ))}
    </Card>
  );

  if (!election || !election.id) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>No election data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading election data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!electionData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Failed to load election data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Election Management</Text>
        <TouchableOpacity onPress={() => setShowStatsModal(true)}>
          <Feather name="bar-chart-2" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadElectionData}
            tintColor={colors.primary}
          />
        }
      >
        {/* Election Info */}
        <Card>
          <Text style={[styles.electionTitle, { color: colors.text }]}>{electionData?.title}</Text>
          {electionData?.description && (
            <Text style={[styles.electionDescription, { color: colors.textSecondary }]}>
              {electionData.description}
            </Text>
          )}
          
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: electionData?.status === 'active' ? '#4CAF50' : 
                electionData?.status === 'scheduled' ? '#2196F3' : '#FF9800' }
            ]}>
              <Text style={styles.statusText}>
                {electionData?.status === 'active' ? 'Active' : 
                 electionData?.status === 'scheduled' ? 'Scheduled' : 'Ended'}
              </Text>
            </View>
            {countdown && (
              <View style={[styles.countdownBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.countdownText}>
                  {countdown.type === 'start' ? 'Starts in: ' : 'Ends in: '}
                  {formatTimeLeft(countdown.timeLeft)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <StatsCard
            title="Positions"
            value={electionData?.positions?.length || 0}
            subtitle="up for election"
          />
        </View>

        {/* Admin Controls */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Admin Controls</Text>
          
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Text style={[styles.controlLabel, { color: colors.text }]}>App Lock</Text>
              <Text style={[styles.controlDescription, { color: colors.textSecondary }]}>
                Lock users to election screen during voting
              </Text>
            </View>
            <Switch
              key={`app-lock-${isCurrentElectionLocked}-${refreshKey}`}
              value={isCurrentElectionLocked}
              onValueChange={toggleAppLock}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={openEditModal}
          >
            <Feather name="edit-3" size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Edit Election</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={() => setShowVoterModal(true)}
          >
            <Feather name="users" size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Manage Voters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={deleteElection}
          >
            <Feather name="trash-2" size={18} color={colors.surface} />
            <Text style={[styles.actionButtonText, { color: colors.surface }]}>Delete Election</Text>
          </TouchableOpacity>
        </Card>

        {/* Start Election Button - Moved outside Admin Controls and made bigger */}
        {electionData?.status === 'scheduled' && (
          <TouchableOpacity
            style={[styles.startElectionButton, { backgroundColor: colors.primary }]}
            onPress={startElection}
          >
            <Feather name="play" size={24} color={colors.surface} />
            <Text style={[styles.startElectionButtonText, { color: colors.surface }]}>Start Election</Text>
          </TouchableOpacity>
        )}

        {/* End Election Button - Also moved outside for consistency */}
        {electionData?.status === 'active' && (
          <TouchableOpacity
            style={[styles.startElectionButton, { backgroundColor: colors.error }]}
            onPress={endElection}
          >
            <Feather name="stop-circle" size={24} color={colors.surface} />
            <Text style={[styles.startElectionButtonText, { color: colors.surface }]}>End Election</Text>
          </TouchableOpacity>
        )}

        {/* Position Advancement Controls */}
        {(electionData?.status === 'waiting' || electionData?.status === 'active') && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Position Management</Text>
            
            {/* Current Position Status */}
            <View style={styles.currentPositionStatus}>
              <Text style={[styles.currentPositionLabel, { color: colors.textSecondary }]}>
                Current Position:
              </Text>
              <Text style={[styles.currentPositionValue, { color: colors.text }]}>
                {electionData.current_position_index >= 0 && electionData.positions?.[electionData.current_position_index]
                  ? electionData.positions[electionData.current_position_index].title
                  : 'Waiting to begin'}
              </Text>
            </View>

            {/* Position List */}
            {electionData?.positions?.map((position, index) => (
              <View key={index} style={styles.positionItem}>
                <View style={styles.positionInfo}>
                  <Text style={[styles.positionTitle, { color: colors.text }]}>{position.title}</Text>
                  <Text style={[styles.positionStatus, { color: colors.textSecondary }]}>
                    {index < electionData.current_position_index ? 'Completed' :
                     index === electionData.current_position_index ? 'Current' : 'Pending'}
                  </Text>
                </View>
                
                {/* Position Controls */}
                {index === electionData.current_position_index && (
                  <View style={styles.positionControls}>
                    {/* Timer Setting */}
                    <TouchableOpacity
                      style={[styles.timerButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        // Use a simple approach for timer setting
                        const currentTimer = position.timer || 5;
                        const newTimer = currentTimer === 5 ? 10 : currentTimer === 10 ? 15 : currentTimer === 15 ? 30 : 5;
                        setPositionTimer(index, newTimer);
                      }}
                    >
                      <Feather name="clock" size={14} color={colors.text} />
                      <Text style={[styles.timerButtonText, { color: colors.text }]}>
                        {position.timer || 5}m
                      </Text>
                    </TouchableOpacity>

                    {/* Start/End Voting Buttons */}
                    {electionData.status === 'waiting' && (
                      <TouchableOpacity
                        style={[styles.startPositionButton, { backgroundColor: colors.primary }]}
                        onPress={() => startVotingForPosition(index)}
                      >
                        <Feather name="play" size={16} color={colors.surface} />
                        <Text style={[styles.startPositionButtonText, { color: colors.surface }]}>Start Voting</Text>
                      </TouchableOpacity>
                    )}
                    
                    {electionData.status === 'active' && (
                      <TouchableOpacity
                        style={[styles.endPositionButton, { backgroundColor: colors.error }]}
                        onPress={endVotingForPosition}
                      >
                        <Feather name="stop-circle" size={16} color={colors.surface} />
                        <Text style={[styles.endPositionButtonText, { color: colors.surface }]}>End Voting</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}

        {/* Position Results */}
        {electionData?.status === 'active' && Object.keys(voterStats.positions || {}).length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Live Results</Text>
            {Object.entries(voterStats.positions).map(([positionTitle, stats]) => (
              <PositionStats
                key={positionTitle}
                position={{ title: positionTitle }}
                stats={stats}
              />
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Voter Management Modal */}
      <Modal visible={showVoterModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Manage Voters</Text>
              <TouchableOpacity onPress={() => setShowVoterModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Eligible Voters ({eligibleVoters.length})
              </Text>
              {eligibleVoters.map(voter => (
                <View key={voter.id} style={styles.voterItem}>
                  <View style={styles.voterInfo}>
                    <Text style={[styles.voterName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {voter.name}
                    </Text>
                  </View>
                  <View style={styles.voterActions}>
                    <View style={[styles.voterStatus, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.voterStatusText, { color: colors.primary }]}>Eligible</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleButton, { backgroundColor: colors.error + '20' }]}
                      onPress={() => toggleVoterEligibility(voter.id, true)}
                    >
                      <Feather name="user-x" size={16} color={colors.error} />
                      <Text style={[styles.toggleButtonText, { color: colors.error }]}>Make Ineligible</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary, marginTop: 24 }]}>
                Ineligible Voters ({ineligibleVoters.length})
              </Text>
              {ineligibleVoters.map(voter => (
                <View key={voter.id} style={styles.voterItem}>
                  <View style={styles.voterInfo}>
                    <Text style={[styles.voterName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {voter.name}
                    </Text>
                  </View>
                  <View style={styles.voterActions}>
                    <View style={[styles.voterStatus, { backgroundColor: colors.error + '20' }]}>
                      <Text style={[styles.voterStatusText, { color: colors.error }]}>Ineligible</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleButton, { backgroundColor: colors.primary + '20' }]}
                      onPress={() => toggleVoterEligibility(voter.id, false)}
                    >
                      <Feather name="user-check" size={16} color={colors.primary} />
                      <Text style={[styles.toggleButtonText, { color: colors.primary }]}>Make Eligible</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal visible={showStatsModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Election Statistics</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.statsGrid}>
                <StatsCard
                  title="Total Votes"
                  value={voterStats.totalVotes || 0}
                  subtitle={`of ${voterStats.totalEligible || 0} eligible`}
                />
                <StatsCard
                  title="Participation"
                  value={`${voterStats.participationRate || 0}%`}
                  subtitle="voter turnout"
                />
              </View>
              
              {Object.entries(voterStats.positions || {}).map(([positionTitle, stats]) => (
                <PositionStats
                  key={positionTitle}
                  position={{ title: positionTitle }}
                  stats={stats}
                />
              ))}
            </ScrollView>
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  countdownBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countdownText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlInfo: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  controlDescription: {
    fontSize: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  startElectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startElectionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  currentPositionStatus: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  currentPositionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentPositionValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  positionInfo: {
    flex: 1,
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  positionStatus: {
    fontSize: 14,
  },
  startPositionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  startPositionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  advanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  advanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  positionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  timerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  endPositionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  endPositionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  positionCard: {
    marginBottom: 12,
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  positionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  nomineeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  nomineeInfo: {
    flex: 1,
  },
  nomineeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  nomineeVotes: {
    fontSize: 12,
    marginTop: 2,
  },
  leaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  voterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  voterInfo: {
    flex: 1,
    marginRight: 12,
  },
  voterName: {
    fontSize: 16,
    fontWeight: '600',
  },
  voterStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  voterStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  voterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

}); 