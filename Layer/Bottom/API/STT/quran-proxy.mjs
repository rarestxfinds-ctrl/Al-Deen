import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

const LOCAL_ASR_URL = 'ws://localhost:8082';

const wss = new WebSocketServer({ port: 8081, host: '0.0.0.0' });
console.log('✅ Quran proxy listening on port 8081');

wss.on('connection', (clientWs) => {
  console.log('🔌 Client connected');

  let asrSocket = null;

  function connectASR() {
    asrSocket = new WebSocket(LOCAL_ASR_URL);
    asrSocket.on('open', () => console.log('🔗 Connected to local ASR server'));
    asrSocket.on('message', (data) => {
      try {
        const result = JSON.parse(data);
        if (result.text && clientWs.readyState === clientWs.OPEN) {
          clientWs.send(JSON.stringify({ text: result.text, is_final: result.is_final ?? true }));
          console.log(`✅ Forwarded to client: ${result.text}`);
        } else if (result.error) {
          console.error('❌ ASR error:', result.error);
        }
      } catch (err) {
        console.error('❌ Failed to parse ASR response:', err.message);
      }
    });
    asrSocket.on('error', (err) => console.error('❌ ASR socket error:', err.message));
    asrSocket.on('close', () => {
      console.log('🔌 ASR server disconnected, reconnecting...');
      setTimeout(connectASR, 1000);
    });
  }
  connectASR();

  clientWs.on('message', (data) => {
  console.log(`📨 Received ${data.length} bytes from client`);
  if (asrSocket && asrSocket.readyState === WebSocket.OPEN) {
    asrSocket.send(data);
    console.log(`✅ Forwarded ${data.length} bytes to ASR server`);
  } else {
    console.warn("ASR socket not open, cannot forward");
  }
});

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    if (asrSocket) asrSocket.close();
  });

  clientWs.on('error', (err) => console.error('❌ Client error:', err.message));
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
});