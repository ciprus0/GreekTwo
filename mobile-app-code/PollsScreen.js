"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Switch,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  FlatList,
} from "react-native"
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../contexts/AuthContext"
import { supabase } from "../../lib/supabase"
import { Feather } from "@expo/vector-icons"
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'

const { width } = Dimensions.get("window")

export default function PollsScreen({ navigation }) {
  const [polls, setPolls] = useState([])
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('polls')
  const [userProfile, setUserProfile] = useState(null)
  const [orgRoles, setOrgRoles] = useState([])
  const [showCreatePollModal, setShowCreatePollModal] = useState(false)


  const [showVoteModal, setShowVoteModal] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState(null)
  const [selectedElection, setSelectedElection] = useState(null)
  const [userVotes, setUserVotes] = useState({})
  const [members, setMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [organizationFeatures, setOrganizationFeatures] = useState({})
  
  // Poll creation state
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: [""],
    target_audience: "all", // "all" or "specific"
    start_time: new Date(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    allow_multiple_votes: false,
    anonymous: false,
  })


  

  
  const { colors } = useTheme()
  const { user } = useAuth()
  
  const CACHE_KEY = `pollsCache-${user?.id || 'guest'}`
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    let isMounted = true
    const loadCacheAndFetch = async () => {
      if (user) {
        await Promise.all([fetchUserProfile(), fetchOrgRoles(), fetchOrganizationFeatures(), fetchMembers()])
        
        // Try to load cache
        const cacheRaw = await AsyncStorage.getItem(CACHE_KEY)
        let cache = null
        if (cacheRaw) {
          try { cache = JSON.parse(cacheRaw) } catch {}
        }
        if (cache && cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
          setPolls(cache.data.polls || [])
          setElections(cache.data.elections || [])
          setUserVotes(cache.data.userVotes || {})
          setLoading(false)
        }
        
        // Fetch fresh data
        fetchPollsData(isMounted)
      }
    }
    loadCacheAndFetch()
    return () => { isMounted = false }
  }, [user?.id]) // Only depend on user.id, not the entire user object

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase.from("members").select("roles").eq("id", user.id).single()
      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  const fetchOrgRoles = async () => {
    if (user?.user_metadata?.organization_id) {
      const { data, error } = await supabase
        .from('organizations')
        .select('roles')
        .eq('id', user.user_metadata.organization_id)
        .single();
      if (!error && data && Array.isArray(data.roles)) {
        setOrgRoles(data.roles);
      }
    }
  }

  const fetchOrganizationFeatures = async () => {
    if (user?.user_metadata?.organization_id) {
      const { data, error } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', user.user_metadata.organization_id)
        .single();
      if (!error && data?.features) {
        setOrganizationFeatures(data.features);
      }
    }
  }

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, name, email")
        .eq('organization_id', user?.user_metadata?.organization_id)
        .order("name", { ascending: true })
      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error("Error fetching members:", error)
    }
  }

  const fetchPollsData = async (isMounted = true) => {
    try {
      const organizationId = user?.user_metadata?.organization_id
      if (!organizationId) return

      // Fetch polls
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*")
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (pollsError) throw pollsError

      // Fetch elections
      const { data: electionsData, error: electionsError } = await supabase
        .from("elections")
        .select("*")
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (electionsError) throw electionsError

      // Fetch user votes
      const { data: votesData, error: votesError } = await supabase
        .from("poll_votes")
        .select("*")
        .eq('voter_id', user.id)

      if (votesError) throw votesError

      const votesMap = {}
      votesData?.forEach(vote => {
        votesMap[vote.poll_id] = vote
      })

      if (isMounted) {
        setPolls(pollsData || [])
        setElections(electionsData || [])
        setUserVotes(votesMap)
        setLoading(false)

        // Cache the data
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: {
            polls: pollsData || [],
            elections: electionsData || [],
            userVotes: votesMap
          },
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      console.error("Error fetching polls data:", error)
      if (isMounted) setLoading(false)
    }
  }

  const isAdmin = () => {
    // Check user profile roles (handle both string and array formats)
    const userRoles = Array.isArray(userProfile?.roles) 
      ? userProfile.roles 
      : typeof userProfile?.roles === 'string' 
        ? userProfile.roles.split(',').map(r => r.trim())
        : [];
    
    // Get organization role definitions
    const orgRolesArray = orgRoles || [];
    
    // Check if user has any role that matches an admin role name
    const hasAdminRole = orgRolesArray.some(orgRole => 
      orgRole.isAdmin === true && userRoles.includes(orgRole.name)
    );
    

    
    return hasAdminRole;
  }

  const createPoll = async () => {
    if (!newPoll.title.trim() || newPoll.options.length < 2 || newPoll.options.some(opt => !opt.trim())) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    try {
      const pollData = {
        ...newPoll,
        title: newPoll.title.trim(),
        description: newPoll.description.trim(),
        options: newPoll.options.filter(opt => opt.trim()),
        organization_id: user?.user_metadata?.organization_id,
        created_by: user.id,
        target_members: newPoll.target_audience === 'specific' ? selectedMembers : null,
      }

      const { data, error } = await supabase
        .from('polls')
        .insert([pollData])
        .select()
        .single()

      if (error) throw error

      setShowCreatePollModal(false)
      setNewPoll({
        title: "",
        description: "",
        options: [""],
        target_audience: "all",
        start_time: new Date(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
        allow_multiple_votes: false,
        anonymous: false,
      })
      setSelectedMembers([])
      fetchPollsData()
      Alert.alert("Success", "Poll created successfully!")
    } catch (error) {
      console.error("Error creating poll:", error)
      Alert.alert("Error", "Failed to create poll")
    }
  }





  const submitVote = async (voteData) => {
    try {
      if (selectedPoll) {
        // Submit poll vote
        const { error } = await supabase
          .from('poll_votes')
          .insert([{
            poll_id: selectedPoll.id,
            voter_id: user.id,
            selected_options: voteData.selectedOptions,
            created_at: new Date().toISOString(),
          }])

        if (error) throw error
      } else if (selectedElection) {
        // Submit election vote
        const { error } = await supabase
          .from('election_votes')
          .insert([{
            election_id: selectedElection.id,
            voter_id: user.id,
            votes: voteData.votes,
            created_at: new Date().toISOString(),
          }])

        if (error) throw error
      }

      setShowVoteModal(false)
      setSelectedPoll(null)
      setSelectedElection(null)
      fetchPollsData()
      Alert.alert("Success", "Vote submitted successfully!")
    } catch (error) {
      console.error("Error submitting vote:", error)
      Alert.alert("Error", "Failed to submit vote")
    }
  }

  const Card = ({ children, style }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  )

  const Pill = ({ label, active, onPress }) => (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: colors.primary,
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.pillText,
          { color: active ? colors.surface : colors.primary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )

  const PollCard = ({ poll, userVote, onVote, colors }) => {
    const isActive = new Date() >= new Date(poll.start_time) && new Date() <= new Date(poll.end_time)
    const hasVoted = userVote !== undefined

    return (
      <Card>
        <View style={styles.pollHeader}>
          <Text style={[styles.pollTitle, { color: colors.text }]}>{poll.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#4CAF50' : '#FF9800' }]}>
            <Text style={styles.statusText}>{isActive ? 'Active' : 'Ended'}</Text>
          </View>
        </View>
        {poll.description && (
          <Text style={[styles.pollDescription, { color: colors.textSecondary }]}>
            {poll.description}
          </Text>
        )}
        <View style={styles.pollMeta}>
          <Text style={[styles.pollMetaText, { color: colors.textSecondary }]}>
            Ends: {new Date(poll.end_time).toLocaleDateString()}
          </Text>
          {hasVoted && (
            <Text style={[styles.votedText, { color: colors.primary }]}>✓ Voted</Text>
          )}
        </View>
        {isActive && !hasVoted && (
          <TouchableOpacity
            style={[styles.voteButton, { backgroundColor: colors.primary }]}
            onPress={onVote}
          >
            <Text style={[styles.voteButtonText, { color: colors.surface }]}>Vote</Text>
          </TouchableOpacity>
        )}
      </Card>
    )
  }

  const ElectionCard = ({ election, onVote, onManage, colors, isAdmin }) => {
    const isActive = election.status === 'active'
    const isScheduled = election.status === 'scheduled'
    const isWaiting = election.status === 'waiting'
    const isEnded = election.status === 'ended'
    
    const isWithinWeek = () => {
      const now = new Date().getTime()
      const startTime = new Date(election.start_time).getTime()
      const weekInMs = 7 * 24 * 60 * 60 * 1000
      return startTime - now <= weekInMs && startTime - now > 0
    }

    return (
      <Card>
        <View style={styles.pollHeader}>
          <Text style={[styles.pollTitle, { color: colors.text }]}>{election.title}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isActive ? '#4CAF50' : isWaiting ? '#FF9800' : isScheduled ? '#2196F3' : '#9E9E9E' }
          ]}>
            <Text style={styles.statusText}>
              {isActive ? 'Active' : isWaiting ? 'Waiting' : isScheduled ? 'Scheduled' : 'Ended'}
            </Text>
          </View>
        </View>
        {election.description && (
          <Text style={[styles.pollDescription, { color: colors.textSecondary }]}>
            {election.description}
          </Text>
        )}
        <View style={styles.pollMeta}>
          <Text style={[styles.pollMetaText, { color: colors.textSecondary }]}>
            {election.positions?.length || 0} positions
          </Text>
          <Text style={[styles.pollMetaText, { color: colors.textSecondary }]}>
            {isActive || isWaiting ? `Ends: ${new Date(election.end_time).toLocaleDateString()}` : 
             `Starts: ${new Date(election.start_time).toLocaleDateString()}`}
          </Text>
        </View>
        
        {/* Countdown for scheduled elections */}
        {isScheduled && isWithinWeek() && (
          <View style={[styles.countdownBanner, { backgroundColor: colors.primary + '20' }]}>
            <Feather name="clock" size={16} color={colors.primary} />
            <Text style={[styles.countdownText, { color: colors.primary }]}>
              Starts in {Math.ceil((new Date(election.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
            </Text>
          </View>
        )}

        {/* Waiting message */}
        {isWaiting && (
          <View style={[styles.countdownBanner, { backgroundColor: colors.warning + '20' }]}>
            <Feather name="clock" size={16} color={colors.warning} />
            <Text style={[styles.countdownText, { color: colors.warning }]}>
              Waiting for admin to begin voting
            </Text>
          </View>
        )}

        <View style={styles.electionActions}>
          {/* Nomination button for scheduled elections */}
          {isScheduled && (
            <TouchableOpacity
              style={[styles.nominateButton, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('ElectionNomination', { election })}
            >
              <Feather name="users" size={16} color={colors.surface} />
              <Text style={[styles.nominateButtonText, { color: colors.surface }]}>Nominate</Text>
            </TouchableOpacity>
          )}

          {/* Vote button for active elections */}
          {(isActive || isWaiting) && (
            <TouchableOpacity
              style={[styles.voteButton, { backgroundColor: colors.primary }]}
              onPress={onVote}
            >
              <Text style={[styles.voteButtonText, { color: colors.surface }]}>
                {isWaiting ? 'Waiting' : 'Vote Now'}
              </Text>
            </TouchableOpacity>
          )}

          {/* View Results button for ended elections */}
          {isEnded && (
            <TouchableOpacity
              style={[styles.resultsButton, { backgroundColor: colors.success }]}
              onPress={() => navigation.navigate('ElectionResults', { election })}
            >
              <Feather name="bar-chart-2" size={16} color={colors.surface} />
              <Text style={[styles.resultsButtonText, { color: colors.surface }]}>View Results</Text>
            </TouchableOpacity>
          )}
          
          {/* Manage button for admins */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.manageButton, { backgroundColor: colors.border }]}
              onPress={onManage}
            >
              <Feather name="settings" size={16} color={colors.text} />
              <Text style={[styles.manageButtonText, { color: colors.text }]}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    )
  }

  const CreatePollModal = ({ visible, onClose, onSubmit, newPoll, setNewPoll, members, selectedMembers, setSelectedMembers, colors }) => {
    const [showStartDatePicker, setShowStartDatePicker] = useState(false)
    const [showStartTimePicker, setShowStartTimePicker] = useState(false)
    const [showEndDatePicker, setShowEndDatePicker] = useState(false)
    const [showEndTimePicker, setShowEndTimePicker] = useState(false)

    const addOption = () => {
      setNewPoll(prev => ({
        ...prev,
        options: [...prev.options, ""]
      }))
    }

    const removeOption = (index) => {
      if (newPoll.options.length > 2) {
        setNewPoll(prev => ({
          ...prev,
          options: prev.options.filter((_, i) => i !== index)
        }))
      }
    }

    const updateOption = (index, value) => {
      setNewPoll(prev => ({
        ...prev,
        options: prev.options.map((opt, i) => i === index ? value : opt)
      }))
    }

    const toggleMemberSelection = (memberId) => {
      setSelectedMembers(prev => 
        prev.includes(memberId) 
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
      )
    }

    return (
      <Modal visible={visible} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Create Poll</Text>
                  <TouchableOpacity onPress={onClose}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} contentContainerStyle={{ flexGrow: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: colors.background, 
                      color: colors.text,
                      borderColor: colors.border 
                    }]}
                    value={newPoll.title}
                    onChangeText={(text) => setNewPoll(prev => ({ ...prev, title: text }))}
                    placeholder="Enter poll title"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                  <TextInput
                    style={[styles.textArea, { 
                      backgroundColor: colors.background, 
                      color: colors.text,
                      borderColor: colors.border 
                    }]}
                    value={newPoll.description}
                    onChangeText={(text) => setNewPoll(prev => ({ ...prev, description: text }))}
                    placeholder="Enter poll description"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={[styles.inputLabel, { color: colors.text }]}>Options *</Text>
                  {newPoll.options.map((option, index) => (
                    <View key={index} style={styles.optionRow}>
                      <TextInput
                        style={[styles.optionInput, { 
                          backgroundColor: colors.background, 
                          color: colors.text,
                          borderColor: colors.border 
                        }]}
                        value={option}
                        onChangeText={(text) => updateOption(index, text)}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor={colors.textSecondary}
                      />
                      {newPoll.options.length > 2 && (
                        <TouchableOpacity onPress={() => removeOption(index)}>
                          <Feather name="trash-2" size={20} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
                    <Feather name="plus" size={16} color={colors.primary} />
                    <Text style={[styles.addOptionText, { color: colors.primary }]}>Add Option</Text>
                  </TouchableOpacity>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>Target Audience</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setNewPoll(prev => ({ ...prev, target_audience: 'all' }))}
                    >
                      <View style={[
                        styles.radioButton,
                        { borderColor: colors.primary },
                        newPoll.target_audience === 'all' && { backgroundColor: colors.primary }
                      ]}>
                        {newPoll.target_audience === 'all' && (
                          <View style={[styles.radioInner, { backgroundColor: colors.surface }]} />
                        )}
                      </View>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>All Members</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => setNewPoll(prev => ({ ...prev, target_audience: 'specific' }))}
                    >
                      <View style={[
                        styles.radioButton,
                        { borderColor: colors.primary },
                        newPoll.target_audience === 'specific' && { backgroundColor: colors.primary }
                      ]}>
                        {newPoll.target_audience === 'specific' && (
                          <View style={[styles.radioInner, { backgroundColor: colors.surface }]} />
                        )}
                      </View>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>Specific Members</Text>
                    </TouchableOpacity>
                  </View>

                  {newPoll.target_audience === 'specific' && (
                    <View style={styles.memberSelection}>
                      <Text style={[styles.inputLabel, { color: colors.text }]}>Select Members</Text>
                      <ScrollView style={styles.memberList} nestedScrollEnabled>
                        {members.map(member => (
                          <TouchableOpacity
                            key={member.id}
                            style={styles.memberItem}
                            onPress={() => toggleMemberSelection(member.id)}
                          >
                            <View style={[
                              styles.checkbox,
                              { borderColor: colors.primary },
                              selectedMembers.includes(member.id) && { backgroundColor: colors.primary }
                            ]}>
                              {selectedMembers.includes(member.id) && (
                                <Feather name="check" size={12} color={colors.surface} />
                              )}
                            </View>
                            <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Allow Multiple Votes</Text>
                    <Switch
                      value={newPoll.allow_multiple_votes}
                      onValueChange={(value) => setNewPoll(prev => ({ ...prev, allow_multiple_votes: value }))}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Anonymous Poll</Text>
                    <Switch
                      value={newPoll.anonymous}
                      onValueChange={(value) => setNewPoll(prev => ({ ...prev, anonymous: value }))}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.surface}
                    />
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.text }]}>End Date & Time</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border 
                    }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {newPoll.end_time.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dateButton, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border 
                    }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {newPoll.end_time.toLocaleTimeString()}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.border }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.primary }]}
                    onPress={onSubmit}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>Create Poll</Text>
                  </TouchableOpacity>
                </View>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={newPoll.end_time}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      setShowEndDatePicker(false)
                      if (date) {
                        setNewPoll(prev => ({ ...prev, end_time: date }))
                      }
                    }}
                    textColor={colors.text}
                    accentColor={colors.primary}
                  />
                )}

                {showEndTimePicker && (
                  <DateTimePicker
                    value={newPoll.end_time}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      setShowEndTimePicker(false)
                      if (date) {
                        setNewPoll(prev => ({ ...prev, end_time: date }))
                      }
                    }}
                    textColor={colors.text}
                    accentColor={colors.primary}
                  />
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    )
  }



  const VoteModal = ({ visible, onClose, onSubmit, poll, election, colors }) => {
    const [selectedOptions, setSelectedOptions] = useState([])
    const [electionVotes, setElectionVotes] = useState({})

    const handlePollVote = () => {
      if (selectedOptions.length === 0) {
        Alert.alert("Error", "Please select at least one option")
        return
      }
      onSubmit({ selectedOptions })
    }

    const handleElectionVote = () => {
      const votes = Object.values(electionVotes).filter(vote => vote !== null)
      if (votes.length === 0) {
        Alert.alert("Error", "Please vote for at least one position")
        return
      }
      onSubmit({ votes: electionVotes })
    }

    const toggleOption = (option) => {
      if (poll?.allow_multiple_votes) {
        setSelectedOptions(prev => 
          prev.includes(option) 
            ? prev.filter(opt => opt !== option)
            : [...prev, option]
        )
      } else {
        setSelectedOptions([option])
      }
    }

    const setElectionVote = (positionIndex, nominee) => {
      setElectionVotes(prev => ({
        ...prev,
        [positionIndex]: nominee
      }))
    }

    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {poll ? 'Vote in Poll' : 'Vote in Election'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={{ flexGrow: 1 }}>
              {poll ? (
                <View>
                  <Text style={[styles.voteTitle, { color: colors.text }]}>{poll.title}</Text>
                  {poll.description && (
                    <Text style={[styles.voteDescription, { color: colors.textSecondary }]}>
                      {poll.description}
                    </Text>
                  )}
                  
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Select Option{poll.allow_multiple_votes ? 's' : ''}</Text>
                  {poll.options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.voteOption,
                        { borderColor: colors.border },
                        selectedOptions.includes(option) && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => toggleOption(option)}
                    >
                      <View style={[
                        styles.radioButton,
                        { borderColor: colors.primary },
                        selectedOptions.includes(option) && { backgroundColor: colors.primary }
                      ]}>
                        {selectedOptions.includes(option) && (
                          <View style={[styles.radioInner, { backgroundColor: colors.surface }]} />
                        )}
                      </View>
                      <Text style={[styles.voteOptionText, { color: colors.text }]}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : election ? (
                <View>
                  <Text style={[styles.voteTitle, { color: colors.text }]}>{election.title}</Text>
                  {election.description && (
                    <Text style={[styles.voteDescription, { color: colors.textSecondary }]}>
                      {election.description}
                    </Text>
                  )}
                  
                  {election.positions?.map((position, positionIndex) => (
                    <View key={positionIndex} style={styles.electionPosition}>
                      <Text style={[styles.positionTitle, { color: colors.text }]}>{position.title}</Text>
                      {position.nominees?.map((nominee, nomineeIndex) => (
                        <TouchableOpacity
                          key={nomineeIndex}
                          style={[
                            styles.voteOption,
                            { borderColor: colors.border },
                            electionVotes[positionIndex] === nominee && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                          ]}
                          onPress={() => setElectionVote(positionIndex, nominee)}
                        >
                          <View style={[
                            styles.radioButton,
                            { borderColor: colors.primary },
                            electionVotes[positionIndex] === nominee && { backgroundColor: colors.primary }
                          ]}>
                            {electionVotes[positionIndex] === nominee && (
                              <View style={[styles.radioInner, { backgroundColor: colors.surface }]} />
                            )}
                          </View>
                          <Text style={[styles.voteOptionText, { color: colors.text }]}>{nominee}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={onClose}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={poll ? handlePollVote : handleElectionVote}
              >
                <Text style={[styles.modalButtonText, { color: colors.surface }]}>Submit Vote</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Polls & Elections</Text>
        {isAdmin() && (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateElection')}
              >
                <Feather name="award" size={18} color={colors.surface} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary, marginLeft: 8 }]}
                onPress={() => setShowCreatePollModal(true)}
              >
                <Feather name="plus" size={20} color={colors.surface} />
              </TouchableOpacity>
            </View>
          )}
      </View>

      <View style={styles.tabContainer}>
        <Pill
          label="Polls"
          active={activeTab === 'polls'}
          onPress={() => setActiveTab('polls')}
        />
        <Pill
          label="Elections"
          active={activeTab === 'elections'}
          onPress={() => setActiveTab('elections')}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchPollsData}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'polls' ? (
          <View>
            {polls.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Feather name="bar-chart-2" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No polls available
                </Text>
              </Card>
            ) : (
              polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  userVote={userVotes[poll.id]}
                  onVote={() => {
                    setSelectedPoll(poll)
                    setShowVoteModal(true)
                  }}
                  colors={colors}
                />
              ))
            )}
          </View>
        ) : (
          <View>
            {elections.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Feather name="award" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No elections available
                </Text>
              </Card>
            ) : (
              elections.map((election) => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  onVote={() => {
                    navigation.navigate('ElectionVoting', { election })
                  }}
                  onManage={() => {
                    navigation.navigate('ElectionManagement', { election })
                  }}
                  colors={colors}
                  isAdmin={isAdmin()}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        onSubmit={createPoll}
        newPoll={newPoll}
        setNewPoll={setNewPoll}
        members={members}
        selectedMembers={selectedMembers}
        setSelectedMembers={setSelectedMembers}
        colors={colors}
      />



      {/* Vote Modal */}
      <VoteModal
        visible={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        onSubmit={submitVote}
        poll={selectedPoll}
        election={selectedElection}
        colors={colors}
      />
    </SafeAreaView>
  )
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
    paddingTop: 25, // Add extra top padding to avoid sidebar arrow overlap
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  // Poll and Election Card Styles
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  pollDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  pollMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pollMetaText: {
    fontSize: 12,
  },
  votedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  voteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  electionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  nominateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  nominateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resultsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
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
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  // Form Styles
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addOptionText: {
    fontSize: 14,
    marginLeft: 8,
  },
  radioGroup: {
    marginVertical: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radioLabel: {
    fontSize: 16,
  },
  memberSelection: {
    marginTop: 8,
  },
  memberList: {
    maxHeight: 150,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 16,
  },
  // Election specific styles
  positionCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  positionTitleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  nomineeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nomineeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
  },
  addNomineeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  addNomineeText: {
    fontSize: 12,
    marginLeft: 6,
  },
  addPositionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  addPositionText: {
    fontSize: 14,
    marginLeft: 8,
  },
  // Vote modal styles
  voteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  voteDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  voteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  voteOptionText: {
    fontSize: 16,
    marginLeft: 8,
  },
  electionPosition: {
    marginBottom: 16,
  },
  positionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
})
