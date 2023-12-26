import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, ScrollView  ,TouchableWithoutFeedback ,Image, ActivityIndicator } from 'react-native'; // Import necessary components
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
  const serverUrl = 'https://king-prawn-app-z9mg3.ondigitalocean.app';

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
  const [isFullScreenModalVisible, setIsFullScreenModalVisible] = useState(true); // initially true to show on app start
  const [shouldStartRecording, setShouldStartRecording] = useState(false);
  const [currentInput, setCurrentInput] = React.useState('');
  const [availableInputs, setAvailableInputs] = React.useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State to handle the confirmation modal
  const [countdown, setCountdown] = useState(4); // State for the countdown timer


  const resetVisitor = () => {
    setVisitorId(uuid.v4());
    setTranscription('');
    setConversation([]); // Clear conversation on reset
    setIsFullScreenModalVisible(true);
    // Clear the text fields
    setVisitorName('');
    setHostName('');
    setVisitPurpose('');
  };
  

  // const playGreeting = async () => {
  //   const sound = new Audio.Sound();
  //   try {
  //     await sound.loadAsync(require('./audio/howmaywehelpyou.mp3'));
  //     await sound.playAsync();
  //   } catch (error) {
  //     console.error('Error playing sound', error);
  //   }
  // };

  // useEffect(() => {
  //   if (shouldStartRecording && !recording) {
  //     console.log("starting recording")
  //     startRecordingAudio();
  //     setShouldStartRecording(false); // Reset the flag after starting recording
  //   }
  // }, [shouldStartRecording, recording]);
  
  const onConfirmPress = () => {
    console.log('Confirm pressed');
    handleConfirm();
    setShowConfirmModal(true); // Show the confirmation modal
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setCountdown(5); // Reset countdown when modal is closed
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    handleAIResponse(visitorId, "Confirm");
    setShowConfirmModal(true); // Show confirmation modal
    setCountdown(5); // Reset countdown to 4 seconds
  };

  const fetchAvailableInputs = async () => {
    try {
      const inputs = await new Audio.Recording().getAvailableInputs();
      setAvailableInputs(inputs);
      console.log('Available inputs: ', inputs);
    } catch (err) {
      console.error('Failed to get available inputs', err);
    }
  };

  React.useEffect(() => {
    fetchAvailableInputs();
  }, []);

  useEffect(() => {
    let timer;
    if (showConfirmModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      resetVisitor();
      closeConfirmModal();
    }
    return () => clearTimeout(timer);
  }, [countdown, showConfirmModal]);


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
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Preparing recorder..');
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      // Set the recording input to UID 9 before starting the recording
      //const inputUid = "9"; // Replace with actual UID for the desired input
      //await recording.setInput(inputUid);
      //console.log(`Recording input set to UID: ${inputUid}`);

      console.log('Starting recording..');
      await recording.startAsync();
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // const startRecordingAudio = async () => {
  //   try {
  //     await Audio.requestPermissionsAsync();
  //     await Audio.setAudioModeAsync({
  //       allowsRecordingIOS: true,
  //       playsInSilentModeIOS: true,
  //     });
  //     const newRecording = new Audio.Recording();
  //     await playStartSound(); // Play start sound before starting recording
  //     await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
  //     await newRecording.startAsync();
  //     setRecording(newRecording);
  //   } catch (err) {
  //     console.error('Failed to start recording', err);
  //   }
  // };
  

  const stopRecording = async () => {
    if (!recording) {
      return;
    }
    await recording.stopAndUnloadAsync();
    await playEndSound(); // Play end sound after stopping recording
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
      console.log("Server URL is: ",serverUrl);
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

        if (data.aiResponse.text.includes("Sorry")) {
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

      setShouldStartRecording(true);
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
    setIsProcessing(true);
    setHostName(name);
    setIsModalVisible(false);
    
    // Craft a message for the AI response
    const aiMessage = `${name}`;
    
    // Call handleAIResponse with the crafted message
    handleAIResponse(visitorId, aiMessage);
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

  const handleGreeting = async () => {
    setIsProcessing(true);
    setIsFullScreenModalVisible(false); // Hide the full-screen modal
    handleAIResponse(visitorId, "hi");

  };
  const handleHostNotSelected = async () => {
    setIsProcessing(true);
    setIsFullScreenModalVisible(false); // Hide the full-screen modal
    handleAIResponse(visitorId, "Arganzo Megado");

  };

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
        {isProcessing ? (
          <ActivityIndicator size="large" color="#FEF7FF" /> // Customize color and size as needed
        ) : (
          <PaperButton
            icon="record"
            mode="elevated"
            onPressIn={() => { playStartSound(); startRecording(); }}
            onPressOut={() => { playEndSound(); stopRecording(); }}
            style={styles.largeButton}
            contentStyle={styles.largeButtonText}
          >
            Push to Talk
          </PaperButton> 
        )}
        
            
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
            label="Confirm"
            style={styles.fab}
            disabled={isButtonDisabled}
            onPress={onConfirmPress} // Call onConfirmPress when the button is pressed
            visible={true}
            size="medium"
          />    

        <FAB
          icon="restore"
          label="Reset"
          style={styles.fab}
          onPress={resetVisitor}
          visible={true}
          size="medium"
        />
      </View>

      </View>

      <Modal 
          visible={showConfirmModal} 
          onDismiss={closeConfirmModal} 
          contentContainerStyle={styles.confirmModal}>
          <View style={styles.confirmModalContent}>
            <Image source={require('./assets/tick.png')} style={styles.confirmImage} />
            <Text style={styles.confirmText}>
              Your visit has been confirmed. Have a pleasant visit!
            </Text>
            <Text style={styles.countdownText}>
              {`Closing in ${countdown} seconds...`}
            </Text>
          </View>
        </Modal>

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
              onPress={() => {setIsModalVisible(false); handleHostNotSelected();}}
              style={styles.closeButton}
            >
              Close
            </PaperButton>
          )}
          ListEmptyComponent={() => <Text>No Hosts Found</Text>}
        />
      </Modal>

      <Modal 
        visible={isFullScreenModalVisible} 
        onDismiss={() => setIsFullScreenModalVisible(false)}
        contentContainerStyle={styles.fullScreenModal}
      >
        <TouchableWithoutFeedback onPress={handleGreeting}>
          <View style={styles.fullScreenModalContent}>
            <Image source={require('./assets/mylobbylogo.png')} style={styles.logo} />
            <Text style={styles.fullScreenModalText}>
              Welcome To MyLobby Experience! Tap Anywhere to Start
            </Text>
          </View>
        </TouchableWithoutFeedback>
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
    fontSize: 22, // Increase font size here
  },
  aiText: {
    backgroundColor: '#6750A4',
    color: 'white',
    padding: 10,
    borderRadius: 10,
    maxWidth: '70%',
    fontSize: 22, // Increase font size here
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
    fontSize: 22, // Increase font size
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
    marginTop:9,
    borderColor: '#666',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  fullScreenModal: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  fullScreenModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Change as needed
  },
  logo: {
    width: '50%', // Adjust as needed
    height: undefined, // Let height adjust automatically
    aspectRatio: 1, // Adjust according to your image's aspect ratio
    marginBottom: 20,
    resizeMode: 'contain',
  },
  fullScreenModalText: {
    fontSize: 20,
    textAlign: 'center',
    width:'90%',
    color: '#000', // Adjust as needed
  },
  activityIndicatorContainer: {
    // Add your styling here
    justifyContent: 'center',
    alignItems: 'center',
    height: 50, // Example height, adjust as needed
    color:"white",
  },
  confirmModal: {
    // Style for the confirmation modal
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  confirmModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmImage: {
    width: 100, // Adjust size as needed
    height: 100, // Adjust size as needed
    marginBottom: 20,
  },
  confirmText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#000',
  },
  countdownText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000',
  },
});
