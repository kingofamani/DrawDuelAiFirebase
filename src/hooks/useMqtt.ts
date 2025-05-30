'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MqttClient, IClientOptions } from 'mqtt'; // Import types
import { useToast } from '@/hooks/use-toast';
import type { MqttMessage } from '@/types/mqtt';
import { MQTT_BROKER_URL, MQTT_TOPIC } from '@/types/mqtt';

declare global {
  interface Window {
    mqtt?: {
      connect: (brokerUrl: string, options?: IClientOptions) => MqttClient;
    };
  }
}

interface UseMqttProps {
  onMessage?: (topic: string, payload: MqttMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useMqtt({ onMessage, onConnect, onDisconnect }: UseMqttProps) {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
  }, [onMessage, onConnect, onDisconnect]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.mqtt) {
      console.warn('MQTT library not loaded yet or not in browser environment.');
      // Optionally, try to load it if not present, though Script tag in _app should handle it.
      return;
    }

    const mqttInstance = window.mqtt;
    const clientId = `drawduel_${Math.random().toString(16).substring(2, 8)}`;
    const options: IClientOptions = {
      clientId,
      keepalive: 60,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: true, // Important for sessions
    };

    const mqttClient = mqttInstance.connect(MQTT_BROKER_URL, options);
    setClient(mqttClient);

    mqttClient.on('connect', () => {
      setIsConnected(true);
      //toast({ title: 'MQTT Connected', description: `Connected to ${MQTT_BROKER_URL}` });
      console.log('MQTT Connected');
      mqttClient.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
          toast({ title: 'MQTT Subscription Error', description: err.message, variant: 'destructive' });
          console.error('MQTT Subscription Error:', err);
        } else {
          //toast({ title: 'MQTT Subscribed', description: `Subscribed to topic: ${MQTT_TOPIC}` });
          console.log(`MQTT Subscribed to topic: ${MQTT_TOPIC}`);
        }
      });
      if (onConnectRef.current) {
        onConnectRef.current();
      }
    });

    mqttClient.on('reconnect', () => {
      //toast({ title: 'MQTT Reconnecting', description: 'Attempting to reconnect to MQTT broker...' });
      console.log('MQTT Reconnecting...');
    });

    mqttClient.on('error', (err) => {
      toast({ title: 'MQTT Error', description: err.message, variant: 'destructive' });
      console.error('MQTT Error:', err);
      setIsConnected(false);
    });

    mqttClient.on('close', () => {
      setIsConnected(false);
      //toast({ title: 'MQTT Disconnected', description: 'Connection to MQTT broker closed.' });
      console.log('MQTT Disconnected');
      if (onDisconnectRef.current) {
        onDisconnectRef.current();
      }
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const messageString = payload.toString();
        const parsedMessage = JSON.parse(messageString) as MqttMessage;
        if (onMessageRef.current) {
          onMessageRef.current(topic, parsedMessage);
        }
      } catch (e) {
        console.error('Failed to parse MQTT message:', e, payload.toString());
        toast({ title: 'MQTT Message Error', description: 'Received an unparseable message.', variant: 'destructive' });
      }
    });

    return () => {
      if (mqttClient) {
        mqttClient.end(true, () => {
          console.log('MQTT client ended.');
        });
      }
    };
  }, [toast]);

  const publish = useCallback(
    (message: Omit<MqttMessage, 'timestamp' | 'senderId'>) => {
      if (client && isConnected) {
        const fullMessage: MqttMessage = {
          ...message,
          timestamp: Date.now(),
          senderId: client.options.clientId,
        } as MqttMessage; // Cast needed because payload type varies
        
        client.publish(MQTT_TOPIC, JSON.stringify(fullMessage), { qos: 1 }, (err) => {
          if (err) {
            toast({ title: 'MQTT Publish Error', description: err.message, variant: 'destructive' });
            console.error('MQTT Publish Error:', err);
          }
        });
      } else {
        toast({ title: 'MQTT Not Connected', description: 'Cannot publish message.', variant: 'destructive' });
        console.warn('MQTT client not connected. Cannot publish.');
      }
    },
    [client, isConnected, toast]
  );
  
  const getClientId = useCallback(() => {
    return client?.options.clientId;
  }, [client]);

  return { client, isConnected, publish, getClientId };
}
