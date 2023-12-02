import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView  ,TouchableWithoutFeedback } from 'react-native'; // Import necessary components
import { Audio } from 'expo-av';
import uuid from 'react-native-uuid';
import { FAB,TextInput, PaperProvider, Card, Button as PaperButton } from 'react-native-paper';
import { Modal, Searchbar , List } from 'react-native-paper';


export default function App() {
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [visitorId, setVisitorId] = useState(uuid.v4());
  const [audioResponseUrl, setAudioResponseUrl] = useState('');
  const [conversation, setConversation] = useState([]); // Store conversation messages
  const messageInputRef = useRef(null);
  const serverUrl = 'http://192.168.68.119:3001';

  const [visitorName, setVisitorName] = useState('');
  const [hostName, setHostName] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('');
  const isButtonDisabled = !visitorName || !hostName || !visitPurpose;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false); // Temporarily set to true for testing
  const [searchQuery, setSearchQuery] = useState('');
  const [hostNames, setHostNames] = useState([
    'John Smith',
    'Jane Doe',
    'Emily Johnson',
    'Michael Brown',
    'Sarah Davis',
    'William Miller',
    'Jessica Wilson',
    'Daniel Moore',
    'Ashley Taylor',
  ]);
  
  const [filteredHostNames, setFilteredHostNames] = useState([...hostNames]);

  const resetVisitor = () => {
    setVisitorId(uuid.v4());
    setTranscription('');
    setConversation([]); // Clear conversation on reset
  
    // Clear the text fields
    setVisitorName('');
    setHostName('');
    setVisitPurpose('');
  };
  

  const playGreeting = async () => {
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync(require('./audio/howmaywehelpyou.mp3'));
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing sound', error);
    }
  };

  useEffect(() => {
    //playGreeting();
  }, []);

  const HostNameInput = ({ onPress, value }) => {
    return (
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={styles.fakeInput}>
          <Text style={value ? styles.inputText : styles.placeholderText}>
            {value || 'Tap to select a host'}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      return;
    }
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setIsProcessing(true); // Start processing
    handleTranscription(uri); // Call handleTranscription here
  };
  

  const playAudioResponse = async (audioUrl) => {
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync({ uri: audioUrl });
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio response', error);
    }
  };

  const handleTranscription = async (audioUri, retryCount = 3) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/mpeg',
        name: 'audio.mp3',
      });
  
      const response = await fetch(`${serverUrl}/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = await response.json();
  
      if (data.transcribedText) {
        setConversation(prevConversation => [
          ...prevConversation,
          { text: data.transcribedText, user: true }
        ]);
  
        // After transcription, handle the AI response
        handleAIResponse(visitorId, data.transcribedText);
      }
    } catch (error) {
      if (retryCount === 0) {
        console.error('Error sending audio file for transcription after retries', error);
        // Here you can handle the final failure, like showing an error message to the user
      } else {
        console.log(`Retrying transcription. Attempts left: ${retryCount - 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
        return handleTranscription(audioUri, retryCount - 1);
      }
    }
  };
  
  const handleSearch = query => {
    setSearchQuery(query);
    if (query === '') {
      setFilteredHostNames([...hostNames]);
    } else {
      const filtered = hostNames.filter(host => host.toLowerCase().includes(query.toLowerCase()));
      setFilteredHostNames(filtered);
    }
  };
  

  const handleAIResponse = async (visitorId, transcribedText) => {
    try {
      const response = await fetch(`${serverUrl}/generateResponse`, {
        method: 'POST',
        body: JSON.stringify({ visitorId, transcribedText }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
  
      if (data.aiResponse && data.aiResponse.text) {
        setConversation(prevConversation => [
          ...prevConversation,
          { text: data.aiResponse.text, user: false }
        ]);
        setTranscription(data.aiResponse.text);

        if (data.aiResponse.text.includes("you can search manually his name or you can repeat his name verbally.")) {
          setIsModalVisible(true);
          // other existing code
        }

        // Parse the response to extract relevant information
      const aiText = data.aiResponse.text;
      if (aiText.includes('Your Name:')) {
        const nameMatch = aiText.match(/Your Name: ([^\,]+)/);
        if (nameMatch) setVisitorName(nameMatch[1].trim());
      }
      if (aiText.includes('You Will be Visiting:')) {
        const hostMatch = aiText.match(/You Will be Visiting: ([^\,]+)/);
        if (hostMatch) setHostName(hostMatch[1].trim());
      }
      if (aiText.includes('Purpose of Visit:')) {
        const purposeMatch = aiText.match(/Purpose of Visit: ([^\.\n]+)/);
        if (purposeMatch) setVisitPurpose(purposeMatch[1].trim());
      }


    }
  
      if (data.aiResponse && data.aiResponse.audioUrl) {
        setAudioResponseUrl(data.aiResponse.audioUrl);
        playAudioResponse(data.aiResponse.audioUrl);
      }
      setIsProcessing(false); // Processing complete

    } catch (error) {
      console.error('Error generating AI response', error);
    }
  };
  
  const playStartSound = async () => {
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync(require('./audio/blipStart.mp3'));
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing start sound', error);
    }
  };
  
  const playEndSound = async () => {
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync(require('./audio/blipEnd.mp3'));

      await sound.playAsync();
    } catch (error) {
      console.error('Error playing end sound', error);
    }
  };

  const selectHostName = (name) => {
    setHostName(name);
    setIsModalVisible(false);
  };
  
  const playManualGreeting = async () => {
    try {
      const response = await fetch(`${serverUrl}/greet`);
      const { audioUrl, text } = await response.json();
  
      // Play the greeting audio
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: audioUrl });
      await sound.playAsync();
  
      // Update conversation with the greeting text
      setConversation(prevConversation => [
        ...prevConversation,
        { text: text, user: false }
      ]);
    } catch (error) {
      console.error('Error playing manual greeting', error);
    }
  };

  const renderItem = ({ item }) => (
    <View style={item.user ? styles.userMessage : styles.aiMessage}>
      <Text style={item.user ? styles.userText : styles.aiText}>{item.text}</Text>
    </View>
  );

  return (
    <PaperProvider>
      <View style={styles.container}>
      


        {/* Conversation container */}
        <View style={styles.conversationContainer}>
          <FlatList
            data={conversation}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            ref={messageInputRef}
            onContentSizeChange={() => messageInputRef.current.scrollToEnd({ animated: true })}
          />
        </View>


        <Text></Text>
        <View style={styles.buttonRow}>
        <PaperButton
        icon="record"
        mode="elevated"
        onPressIn={() => { playStartSound(); startRecording(); }}
        onPressOut={() => { playEndSound(); stopRecording(); }}
        style={styles.largeButton}
        disabled={isProcessing}
        contentStyle={styles.largeButtonText} // Style for the text and icon
      >
        Push to Talk
      </PaperButton>
      <PaperButton
      icon="volume-high"
      mode="contained"
      onPress={playManualGreeting}
      style={styles.button}
    >
      Say Hello
    </PaperButton>
      </View>

      <Text></Text>
        <TextInput
        mode="flat"
        label="Visitor Name"
        value={visitorName}
        onChangeText={text => setVisitorName(text)}
        style={styles.input}
      />

    <TouchableWithoutFeedback onPress={() => setIsModalVisible(true)}>
    <HostNameInput
        onPress={() => setIsModalVisible(true)}
        value={hostName}
      />
    </TouchableWithoutFeedback>

      <TextInput
        mode="flat"
        label="Purpose of Visit"
        value={visitPurpose}
        onChangeText={text => setVisitPurpose(text)}
        style={styles.input}
        multiline={true}
      />

<View style={styles.fabContainer}>
        <FAB
          icon="check"
          label=""
          style={styles.fab}
          disabled={isButtonDisabled}
          onPress={() => console.log('Confirm pressed')}
          visible={true}
          size="medium"
        />

        <FAB
          icon="restore"
          label=""
          style={styles.fab}
          onPress={resetVisitor}
          visible={true}
          size="medium"
        />
      </View>

      </View>


      <Modal visible={isModalVisible} onDismiss={() => setIsModalVisible(false)} contentContainerStyle={styles.modal}>
        <Searchbar
          placeholder="Search host names"
          onChangeText={handleSearch}
          value={searchQuery}
        />
        <FlatList
            data={filteredHostNames}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <List.Item
                title={item}
                style={styles.listItem}
                titleStyle={{ textAlign: 'left' }}
                onPress={() => selectHostName(item)}
              />
            )}
          ListFooterComponent={() => (
            <PaperButton
              icon="close"
              mode="contained"
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              Close
            </PaperButton>
          )}
          ListEmptyComponent={() => <Text>No Hosts Found</Text>}
        />
      </Modal>
    </PaperProvider>

    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#4A4458',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  conversationContainer: {
    flex: 1,
    width: '100%',
    marginTop: 20,
    backgroundColor: '#211F26', // Background color for conversation container
    padding: 10,
    borderRadius: 10,
  },
  userMessage: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  aiMessage: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  userText: {
    backgroundColor: '#F7F2FA',
    color: '#6750A4',
    padding: 10,
    borderRadius: 10,
    maxWidth: '70%',
  },
  aiText: {
    backgroundColor: '#6750A4',
    color: 'white',
    padding: 10,
    borderRadius: 10,
    maxWidth: '70%',
  },
  input: {
    width: '100%',
    marginVertical: 10,
    // You can add more styling as needed
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    marginHorizontal: 10, // Add space between buttons
  },
  fabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10, // Add some vertical padding
  },
  fab: {
    marginHorizontal: 10, // Space between FABs
  },
  largeButton: {
    marginHorizontal: 10,
    paddingVertical: 8, // Increase vertical padding
    paddingHorizontal: 20, // Increase horizontal padding
    borderRadius: 8, // You can adjust this as needed
    // Add more styling as needed
  },
  largeButtonText: {
    fontSize: 18, // Increase font size
    // Add more text styling as needed
  },
  // Updated modal style for scrollable content
  modal: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 20,
    maxHeight: '80%', // Set max height
    width: '95%', // Full width
  },
  // Add styles for full-width list and aligned text
  listItem: {
    width: '100%', // Full width
    justifyContent: 'flex-start',
  },
    // Style for the close button in the modal
  closeButton: {
    marginTop: 20,
    width: '100%',
    padding: 10,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 10,
    marginVertical: 10,
  },
  inputLabel: {
    color: '#666',
    fontSize: 16,
  },
  inputText: {
    color: '#000',
    fontSize: 16,
  },
  fakeInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 4,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#E6E0E9'
  },
  inputText: {
    fontSize: 16,
    color: '#6750A4',
  },
  placeholderText: {
    fontSize: 16,
    color: '#49454F', // Placeholder text color
  },
});
