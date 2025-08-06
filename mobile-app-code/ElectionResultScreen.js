import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function ElectionResultsScreen({ navigation, route }) {
  const { election } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [electionData, setElectionData] = useState(null);
  const [results, setResults] = useState([]);
  const [participationStats, setParticipationStats] = useState({});
  const [showParticipationModal, setShowParticipationModal] = useState(false);
  const [participatingMembers, setParticipatingMembers] = useState([]);

  const { colors } = useTheme();
  const { user } = useAuth();

  const CACHE_KEY = `electionResults-${election?.id || 'none'}`;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (election && election.id) {
      loadResults();
    }
  }, [election?.id]);

  const loadResults = async () => {
    try {
      // Try cache first
      const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
      let cache = null;
      if (cacheRaw) {
        try { cache = JSON.parse(cacheRaw) } catch {}
      }
      
      if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
        setElectionData(cache.electionData);
        setResults(cache.results);
        setParticipationStats(cache.participationStats);
        setLoading(false);
      }

      // Fetch fresh data
      await Promise.all([
        fetchElectionData(),
        fetchResults(),
        fetchParticipationStats()
      ]);

            setLoading(false);
    } catch (error) {
      console.error('Error loading election results:', error);
      setLoading(false);
    }
  };

  // Cache results when data changes
  useEffect(() => {
    if (electionData && results && participationStats) {
      const cacheData = {
        electionData,
        results,
        participationStats,
        timestamp: Date.now()
      };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    }
  }, [electionData, results, participationStats]);

  const fetchElectionData = async () => {
    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .eq('id', election.id)
      .single();

    if (error) throw error;
    setElectionData(data);
  };

  const fetchResults = async () => {
    try {
      // Get all votes for this election
      const { data: votes, error: votesError } = await supabase
        .from('election_votes')
        .select('votes')
        .eq('election_id', election.id);

      if (votesError) throw votesError;

      // Get all nominations for this election
      const { data: nominations, error: nominationsError } = await supabase
        .from('election_nominations')
        .select(`
          position_index,
          nominee:members!election_nominations_nominee_id_fkey(id, name, email)
        `)
        .eq('election_id', election.id);

      if (nominationsError) throw nominationsError;

      // Get election data to get position titles
      const { data: electionData, error: electionError } = await supabase
        .from('elections')
        .select('positions')
        .eq('id', election.id)
        .single();

      if (electionError) throw electionError;

      // Calculate results
      const results = [];
      const positions = electionData.positions || [];

      // Group nominations by position
      const nominationsByPosition = {};
      nominations.forEach(nomination => {
        if (!nominationsByPosition[nomination.position_index]) {
          nominationsByPosition[nomination.position_index] = [];
        }
        nominationsByPosition[nomination.position_index].push({
          id: nomination.nominee.id,
          name: nomination.nominee.name,
          email: nomination.nominee.email
        });
      });

      // Calculate votes for each position
      positions.forEach((position, positionIndex) => {
        const positionNominations = nominationsByPosition[positionIndex] || [];
        const voteCounts = {};

        // Initialize vote counts for all nominees
        positionNominations.forEach(nominee => {
          voteCounts[nominee.id] = 0;
        });

        // Count votes
        votes.forEach(vote => {
          const positionVote = vote.votes[positionIndex];
          if (positionVote && positionVote.id) {
            voteCounts[positionVote.id] = (voteCounts[positionVote.id] || 0) + 1;
          }
        });

        // Calculate total votes for this position
        const totalPositionVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);

        // Create result entries
        positionNominations.forEach(nominee => {
          const voteCount = voteCounts[nominee.id] || 0;
          const percentage = totalPositionVotes > 0 ? (voteCount / totalPositionVotes) * 100 : 0;

          results.push({
            position_title: position.title,
            nominee_name: nominee.name,
            vote_count: voteCount,
            percentage: Math.round(percentage * 100) / 100
          });
        });
      });

      setResults(results);
    } catch (error) {
      console.error('Error fetching election results:', error);
      setResults([]);
    }
  };

  const fetchParticipationStats = async () => {
    // Get total eligible voters
    const { data: eligibleVoters, error: eligibleError } = await supabase
      .from('members')
      .select('id')
      .eq('organization_id', user.user_metadata?.organization_id);

    if (eligibleError) throw eligibleError;

    // Get total voters
    const { data: voters, error: votersError } = await supabase
      .from('election_votes')
      .select('voter_id')
      .eq('election_id', election.id);

    if (votersError) throw votersError;

    const totalEligible = eligibleVoters?.length || 0;
    const totalVoted = voters?.length || 0;
    const participationPercentage = totalEligible > 0 ? (totalVoted / totalEligible) * 100 : 0;

    setParticipationStats({
      totalEligible,
      totalVoted,
      participationPercentage: Math.round(participationPercentage * 100) / 100
    });
  };

  const fetchParticipatingMembers = async () => {
    try {
      console.log('Fetching participating members for election:', election.id);
      
      // First get the voter IDs
      const { data: votes, error: votesError } = await supabase
        .from('election_votes')
        .select('voter_id')
        .eq('election_id', election.id);

      console.log('Votes query result:', { votes, votesError });

      if (votesError) throw votesError;

      if (!votes || votes.length === 0) {
        console.log('No votes found for this election');
        return [];
      }

      console.log('Found votes:', votes.length, 'voter IDs:', votes.map(v => v.voter_id));

      // Then get the member details for those voter IDs
      const voterIds = votes.map(vote => vote.voter_id);
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, name, email')
        .in('id', voterIds);

      console.log('Members query result:', { members, membersError });

      if (membersError) throw membersError;

      const participatingMembers = members?.map(member => ({
        id: member.id,
        name: member.name || 'Unknown',
        email: member.email || 'Unknown'
      })) || [];

      console.log('Final participating members:', participatingMembers);
      return participatingMembers;
    } catch (error) {
      console.error('Error fetching participating members:', error);
      return [];
    }
  };

  const getWinner = (positionResults) => {
    if (!positionResults || positionResults.length === 0) return null;
    
    const maxVotes = Math.max(...positionResults.map(r => r.vote_count));
    const winners = positionResults.filter(r => r.vote_count === maxVotes);
    
    return winners.length === 1 ? winners[0] : null; // Return null if tie
  };

  const isTie = (positionResults) => {
    if (!positionResults || positionResults.length === 0) return false;
    
    const maxVotes = Math.max(...positionResults.map(r => r.vote_count));
    const winners = positionResults.filter(r => r.vote_count === maxVotes);
    
    return winners.length > 1;
  };

  const getPositionResults = (positionTitle) => {
    return results.filter(r => r.position_title === positionTitle);
  };

  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );

  const StatsCard = ({ title, value, subtitle, color = colors.primary }) => (
    <View style={[styles.statsCard, { backgroundColor: color }]}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PositionResults = ({ positionTitle }) => {
    const positionResults = getPositionResults(positionTitle);
    const winner = getWinner(positionResults);
    const tie = isTie(positionResults);
    const totalVotes = positionResults.reduce((sum, result) => sum + result.vote_count, 0);
    
    return (
      <Card style={styles.positionCard}>
        <View style={styles.positionHeader}>
          <Text style={[styles.positionTitle, { color: colors.text }]}>{positionTitle}</Text>
          {winner && totalVotes > 0 && (
            <View style={[styles.winnerBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.winnerText}>Winner</Text>
            </View>
          )}
          {tie && totalVotes > 0 && (
            <View style={[styles.winnerBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.winnerText}>Tie</Text>
            </View>
          )}
        </View>
        
        {positionResults.length > 0 ? (
          positionResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultInfo}>
                <Text style={[styles.nomineeName, { color: colors.text }]}>
                  {result.nominee_name}
                </Text>
                <Text style={[styles.voteCount, { color: colors.textSecondary }]}>
                  {result.vote_count} votes ({result.percentage}%)
                </Text>
              </View>
                          {winner && result.nominee_name === winner.nominee_name && totalVotes > 0 && !tie && (
              <Feather name="award" size={20} color={colors.success} />
            )}
            {tie && result.vote_count === Math.max(...positionResults.map(r => r.vote_count)) && totalVotes > 0 && (
              <Feather name="award" size={20} color={colors.warning} />
            )}
            </View>
          ))
        ) : (
          <Text style={[styles.noResults, { color: colors.textSecondary }]}>
            No nominees for this position
          </Text>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading results...</Text>
      </View>
    );
  }

  // Get all positions from the election data, not just those with results
  const uniquePositions = electionData?.positions?.map(position => position.title) || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Election Results</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadResults} />
        }
      >
        <Card style={styles.electionInfo}>
          <Text style={[styles.electionTitle, { color: colors.text }]}>{electionData?.title}</Text>
          {electionData?.description && (
            <Text style={[styles.electionDescription, { color: colors.textSecondary }]}>
              {electionData.description}
            </Text>
          )}
        </Card>

        {/* Participation Stats */}
        <View style={styles.statsGrid}>
          <StatsCard
            title="Total Voters"
            value={participationStats.totalVoted || 0}
            subtitle={`of ${participationStats.totalEligible || 0} eligible`}
            color={colors.primary}
          />
          <TouchableOpacity
            onPress={() => {
              setParticipatingMembers([{
                id: user.id,
                        name: user.user_metadata?.name || user?.email || 'Unknown',
        email: user?.email || 'Unknown'
              }]);
              setShowParticipationModal(true);
            }}
            style={{ flex: 1 }}
          >
            <StatsCard
              title="Participation"
              value={`${participationStats.participationPercentage || 0}%`}
              color={colors.success}
            />
          </TouchableOpacity>
        </View>

        {/* Winners Summary */}
        {uniquePositions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Winners Summary</Text>
            <Card style={styles.summaryCard}>
              {uniquePositions.map((positionTitle, index) => {
                const positionResults = getPositionResults(positionTitle);
                const winner = getWinner(positionResults);
                const tie = isTie(positionResults);
                const totalVotes = positionResults.reduce((sum, result) => sum + result.vote_count, 0);
                
                return (
                  <View key={index} style={styles.summaryItem}>
                    <Text style={[styles.summaryPosition, { color: colors.text }]}>{positionTitle}</Text>
                    {winner && totalVotes > 0 && !tie && (
                      <Text style={[styles.summaryWinner, { color: colors.success }]}>
                        Winner: {winner.nominee_name}
                      </Text>
                    )}
                    {tie && totalVotes > 0 && (
                      <Text style={[styles.summaryWinner, { color: colors.warning }]}>
                        Tie between {positionResults.filter(r => r.vote_count === Math.max(...positionResults.map(r => r.vote_count))).map(r => r.nominee_name).join(', ')}
                      </Text>
                    )}
                    {totalVotes === 0 && (
                      <Text style={[styles.summaryWinner, { color: colors.textSecondary }]}>
                        No votes cast
                      </Text>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Detailed Results by Position */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Detailed Results</Text>
        
        {uniquePositions.length > 0 ? (
          uniquePositions.map((positionTitle, index) => (
            <PositionResults key={index} positionTitle={positionTitle} />
          ))
        ) : (
          <Card style={styles.noResultsCard}>
            <Text style={[styles.noResultsTitle, { color: colors.text }]}>No Positions Available</Text>
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              This election has no positions defined.
            </Text>
          </Card>
        )}

        {/* Show message if no votes have been cast */}
        {uniquePositions.length > 0 && results.length === 0 && (
          <Card style={styles.noResultsCard}>
            <Text style={[styles.noResultsTitle, { color: colors.text }]}>No Votes Cast</Text>
            <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
              No votes have been recorded for this election yet.
            </Text>
          </Card>
        )}

        {/* Anonymous Notice */}
        <Card style={styles.anonymousNotice}>
          <Feather name="shield" size={20} color={colors.textSecondary} />
          <Text style={[styles.anonymousText, { color: colors.textSecondary }]}>
            All votes are anonymous. Individual voting records are not displayed.
          </Text>
        </Card>
      </ScrollView>

      {/* Participation Modal */}
      <Modal visible={showParticipationModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Feather name="users" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Participating Members</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {participatingMembers.length} members participated in this election
              </Text>
              <ScrollView style={styles.membersList}>
                {participatingMembers.length > 0 ? (
                  participatingMembers.map((member, index) => (
                    <View key={member.id} style={styles.memberItem}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                      <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>{member.email}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noMembersText, { color: colors.textSecondary }]}>
                    No participating members found
                  </Text>
                )}
              </ScrollView>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowParticipationModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.surface }]}>Close</Text>
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statsValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
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
    marginBottom: 16,
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  winnerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  winnerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  resultInfo: {
    flex: 1,
  },
  nomineeName: {
    fontSize: 15,
    fontWeight: '500',
  },
  voteCount: {
    fontSize: 13,
    marginTop: 2,
  },
  noResults: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  noResultsCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  anonymousText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 16,
  },
  summaryCard: {
    marginBottom: 24,
  },
  summaryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  summaryPosition: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryWinner: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
    padding: 20,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  membersList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  memberEmail: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noMembersText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
}); 