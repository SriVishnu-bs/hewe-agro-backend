const sendPushNotification = async ({
  expoPushToken,
  title,
  body,
  data = {},
}) => {
  try {
    if (!expoPushToken) {
     
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

    
    if (!response.ok) {
      throw new Error(result?.errors?.[0]?.message || 'Expo push failed');
    }

    return result;
  } catch (error) {
    
    throw error;
  }
};

export default sendPushNotification;