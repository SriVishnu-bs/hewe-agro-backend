const sendPushNotification = async ({
  expoPushToken,
  title,
  body,
  data = {},
}) => {
  try {
    if (!expoPushToken) {
      console.log('NO EXPO PUSH TOKEN FOUND');
      return null;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    console.log('EXPO PUSH STATUS:', response.status);
    console.log('EXPO PUSH RESULT:', result);

    if (!response.ok) {
      throw new Error(result?.errors?.[0]?.message || 'Expo push failed');
    }

    return result;
  } catch (error) {
    console.log('Push notification error:', error.message);
    throw error;
  }
};

export default sendPushNotification;