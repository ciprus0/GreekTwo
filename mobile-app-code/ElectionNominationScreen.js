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
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ElectionNominationScreen({ navigation, route }) {
  const { election } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [electionData, setElectionData] = useState(null);
  const [members, setMembers] = useState([]);
  const [nominations, setNominations] = useState({});
  const [userNominations, setUserNominations] = useState({});
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);

  const { colors } = useTheme();
  const { user } = useAuth();

  const CACHE_KEY = `electionNominations-${election?.id || 'none'}`;
  const CACHE_TTL = 60 * 1000; // 1 minute

  useEffect(() => {
    if (election && election.id) {
      loadData();
    }
  }, [election?.id]);

  useEffect(() => {
    // Filter members based on search query
    if (searchQuery.trim()) {
      const filtered = members.filter(member => 
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const loadData = async () => {
    try {
      // Try cache first
      const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
      let cache = null;
      if (cacheRaw) {
        try { cache = JSON.parse(cacheRaw) } catch {}
      }
      
      if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        setElectionData(cache.electionData);
        setMembers(cache.members);
        setNominations(cache.nominations);
        setUserNominations(cache.userNominations);
        setLoading(false);
      }

      // Fetch fresh data
      await Promise.all([
        fetchElectionData(),
        fetchMembers(),
        fetchNominations(),
        fetchUserNominations()
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error loading nomination data:', error);
      setLoading(false);
    }
  };

  const fetchElectionData = async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', election.id)
      .single();

    if (error) throw error;
    setElectionData(data);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('organization_id', user.user_metadata?.organization_id)
      .order('name');

    if (error) throw error;
    setMembers(data || []);
  };

  const fetchNominations = async () => {
    const { data, error } = await supabase
      .from('election_nominations')
      .select(`
        *,
        nominee:members!election_nominations_nominee_id_fkey(id, name, email),
        nominated_by_user:members!election_nominations_nominated_by_fkey(id, name, email)
      `)
      .eq('election_id', election.id);

    if (error) throw error;

    // Group nominations by position
    const grouped = {};
    (data || []).forEach(nomination => {
      if (!grouped[nomination.position_index]) {
        grouped[nomination.position_index] = [];
      }
      grouped[nomination.position_index].push(nomination);
    });
    setNominations(grouped);
  };

  const fetchUserNominations = async () => {
    const { data, error } = await supabase
      .from('election_nominations')
      .select('position_index, nominee_id')
      .eq('election_id', election.id)
      .eq('nominated_by', user.id);

    if (error) throw error;

    // Group user nominations by position
    const grouped = {};
    (data || []).forEach(nomination => {
      if (!grouped[nomination.position_index]) {
        grouped[nomination.position_index] = [];
      }
      grouped[nomination.position_index].push(nomination.nominee_id);
    });
    setUserNominations(grouped);
  };

  const openNominationModal = (positionIndex) => {
    setSelectedPosition(positionIndex);
    setSearchQuery('');
    setShowNominationModal(true);
  };

  const submitNomination = async (nomineeId) => {
    try {
      const { error } = await supabase
        .from('election_nominations')
        .insert({
          election_id: election.id,
          position_index: selectedPosition,
          nominee_id: nomineeId,
          nominated_by: user.id
        });

      if (error) throw error;

      Alert.alert('Success', 'Nomination submitted successfully!');
      setShowNominationModal(false);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error submitting nomination:', error);
      Alert.alert('Error', 'Failed to submit nomination. Please try again.');
    }
  };

  const removeNomination = async (nominationId) => {
    try {
      const { error } = await supabase
        .from('election_nominations')
        .delete()
        .eq('id', nominationId);

      if (error) throw error;

      Alert.alert('Success', 'Nomination removed successfully!');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error removing nomination:', error);
      Alert.alert('Error', 'Failed to remove nomination. Please try again.');
    }
  };

  const isNominated = (positionIndex, nomineeId) => {
    return nominations[positionIndex]?.some(n => n.nominee_id === nomineeId) || false;
  };

  const hasUserNominated = (positionIndex, nomineeId) => {
    return userNominations[positionIndex]?.includes(nomineeId) || false;
  };

  const getUserNomination = (positionIndex, nomineeId) => {
    return nominations[positionIndex]?.find(n => 
      n.nominee_id === nomineeId && n.nominated_by === user.id
    );
  };

  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  const PositionCard = ({ position, positionIndex }) => {
    const positionNominations = nominations[positionIndex] || [];
    
    return (
      <Card style={styles.positionCard}>
        <View style={styles.positionHeader}>
          <Text style={[styles.positionTitle, { color: colors.text }]}>{position.title}</Text>
          <TouchableOpacity
            style={[styles.nominateButton, { backgroundColor: colors.primary }]}
            onPress={() => openNominationModal(positionIndex)}
          >
            <Text style={styles.nominateButtonText}>Nominate</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.nominationsLabel, { color: colors.textSecondary }]}>
          Nominations ({positionNominations.length})
        </Text>
        
        {positionNominations.length > 0 ? (
          positionNominations.map((nomination, index) => (
            <View key={nomination.id} style={styles.nominationItem}>
              <View style={styles.nominationInfo}>
                <Text style={[styles.nomineeName, { color: colors.text }]}>
                  {nomination.nominee?.name || 'Unknown'}
                </Text>
                <Text style={[styles.nominatedBy, { color: colors.textSecondary }]}>
                  Nominated by {nomination.nominated_by_user?.name || 'Unknown'}
                </Text>
              </View>
              {hasUserNominated(positionIndex, nomination.nominee_id) && (
                <TouchableOpacity
                  style={[styles.removeButton, { borderColor: colors.error }]}
                  onPress={() => removeNomination(nomination.id)}
                >
                  <Text style={[styles.removeButtonText, { color: colors.error }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <Text style={[styles.noNominations, { color: colors.textSecondary }]}>
            No nominations yet
          </Text>
        )}
      </Card>
    );
  };

  const MemberItem = ({ member }) => {
    const isAlreadyNominated = isNominated(selectedPosition, member.id);
    const hasUserNominatedThis = hasUserNominated(selectedPosition, member.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          { borderColor: colors.border },
          isAlreadyNominated && { opacity: 0.6 }
        ]}
        onPress={() => {
          if (!isAlreadyNominated) {
            submitNomination(member.id);
          }
        }}
        disabled={isAlreadyNominated}
      >
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {member.name || member.email}
          </Text>
          <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
            {member.email}
          </Text>
        </View>
        {isAlreadyNominated && (
          <View style={styles.nominatedBadge}>
            <Text style={[styles.nominatedText, { color: colors.success }]}>
              {hasUserNominatedThis ? 'You nominated' : 'Nominated'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading nominations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nominations</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
      >
        <Card style={styles.electionInfo}>
          <Text style={[styles.electionTitle, { color: colors.text }]}>{electionData?.title}</Text>
          <Text style={[styles.electionDescription, { color: colors.textSecondary }]}>
            {electionData?.description}
          </Text>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Positions</Text>
        
        {electionData?.positions?.map((position, index) => (
          <PositionCard key={index} position={position} positionIndex={index} />
        ))}
      </ScrollView>

      {/* Nomination Modal */}
      <Modal
        visible={showNominationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNominationModal(false)}>
              <Text style={[styles.modalButton, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nominate for {electionData?.positions?.[selectedPosition]?.title}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: colors.surface, 
                borderColor: colors.border,
                color: colors.text 
              }]}
              placeholder="Search members..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MemberItem member={item} />}
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  electionInfo: {
    marginBottom: 24,
  },
  electionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  electionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  positionCard: {
    marginBottom: 16,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  nominateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nominateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  nominationsLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  nominationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  nominationInfo: {
    flex: 1,
  },
  nomineeName: {
    fontSize: 15,
    fontWeight: '500',
  },
  nominatedBy: {
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noNominations: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 20,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  membersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  nominatedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,255,0,0.1)',
  },
  nominatedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
  },
}); 