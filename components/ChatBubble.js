// Inside ChatBubble.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';

const windowHeight = Dimensions.get('window').height;

const ChatBubble = ({ message, toldby, isLatestMessage, style }) => {
  const [typedMessage, setTypedMessage] = useState('');

  useEffect(() => {
    if (isLatestMessage) {
      setTypedMessage('');
      let index = 0;
      const timer = setInterval(() => {
        if (index < message.length) {
          setTypedMessage((prev) => prev + message.charAt(index));
          index++;
        } else {
          clearInterval(timer);
        }
      }, 50); // Adjust the speed of typing here

      return () => clearInterval(timer);
    }
  }, [message, isLatestMessage]); // Add isLatestMessage as a dependency
  const isChatBot = toldby === 'false'; // Adjust based on your conversation data structure
  const styles = getStyles(isChatBot);

  return (
    <View style={[styles.bubble, style]}>
      <Image style={styles.avatar} source={isChatBot ? require('../assets/2.png') : require('../assets/1.png')} />
      <View style={styles.textContainer}>
        <Text style={styles.text}>{typedMessage}</Text>
      </View>
    </View>
  );
};

const getStyles = (isChatBot) => StyleSheet.create({
  bubble: {
    flexDirection: isChatBot ? 'row' : 'row-reverse',
    padding: 10,
    alignItems: 'center',
    marginVertical: 5, // Add some vertical spacing between bubbles
    width: '100%', // Ensure the bubble uses full width
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  textContainer: {
    flex: 1, // Allow the text container to fill available space
    marginHorizontal: 10,
    backgroundColor: isChatBot ? '#e0e0e0' : '#4fc3f7',
    borderRadius: 20,
    padding: 10,

  },
  text: {
    color: isChatBot ? '#000' : '#fff',
    fontSize: 24,
  },
});


export default ChatBubble;
