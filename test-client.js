import { WebSocket } from 'ws';

const WS_URL = 'ws://localhost:3001';

async function runTest() {
  console.log('🧪 Starting Pokemon Forum WebSocket Automated Verification Test...');

  // 1. Host Client
  const hostWs = new WebSocket(WS_URL);
  let hostReceivedSpoke = false;
  let hostReceivedMove = false;
  let hostReceivedAction = false;
  let hostReceivedLike = false;
  let targetOpinionId = null;

  await new Promise((resolve, reject) => {
    hostWs.on('open', resolve);
    hostWs.on('error', reject);
  });
  console.log('✅ Host WebSocket connected successfully');

  hostWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log(`[Host Received] Type: ${msg.type}`);
    if (msg.type === 'init') {
      targetOpinionId = msg.payload.opinions[0]?.id;
    }
    if (msg.type === 'player_moved') {
      hostReceivedMove = true;
    }
    if (msg.type === 'player_spoke') {
      hostReceivedSpoke = true;
      targetOpinionId = msg.payload.opinion.id;
    }
    if (msg.type === 'player_action') {
      hostReceivedAction = true;
    }
    if (msg.type === 'opinion_liked') {
      hostReceivedLike = true;
    }
  });

  // 2. Mobile Controller Client
  const mobileWs = new WebSocket(WS_URL);
  await new Promise((resolve, reject) => {
    mobileWs.on('open', resolve);
    mobileWs.on('error', reject);
  });
  console.log('✅ Mobile Pad WebSocket connected successfully');

  // Join as Red Trainer
  mobileWs.send(JSON.stringify({
    type: 'join',
    payload: {
      id: 'test_player_red',
      name: '레드 (지우)',
      color: '#ef4444',
      avatar: 'red',
      x: 10,
      y: 8,
      direction: 'down',
    },
  }));

  await new Promise((r) => setTimeout(r, 300));

  // Move right
  console.log('🕹️ Testing D-Pad Move event (x: 11, y: 8, direction: right)...');
  mobileWs.send(JSON.stringify({
    type: 'move',
    payload: {
      x: 11,
      y: 8,
      direction: 'right',
      isMoving: true,
    },
  }));

  await new Promise((r) => setTimeout(r, 300));

  // Speak opinion
  console.log('💬 Testing Speak event ("포켓몬 타운 회의 시작합니다!")...');
  mobileWs.send(JSON.stringify({
    type: 'speak',
    payload: {
      text: '포켓몬 타운 회의 시작합니다!',
    },
  }));

  await new Promise((r) => setTimeout(r, 300));

  // Action Jump
  console.log('⚡ Testing Action Jump event...');
  mobileWs.send(JSON.stringify({
    type: 'action',
    payload: {
      actionType: 'jump',
    },
  }));

  await new Promise((r) => setTimeout(r, 300));

  // Like Opinion
  if (targetOpinionId) {
    console.log(`❤️ Testing Like Opinion event on ID: ${targetOpinionId}...`);
    mobileWs.send(JSON.stringify({
      type: 'like_opinion',
      payload: {
        opinionId: targetOpinionId,
      },
    }));
  }

  await new Promise((r) => setTimeout(r, 500));

  // Check verifications
  console.log('--------------------------------------------------');
  console.log(`- Movement Sync:   ${hostReceivedMove ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`- Speech Bubble:   ${hostReceivedSpoke ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`- Action (Jump):   ${hostReceivedAction ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`- Like Sync:       ${hostReceivedLike ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('--------------------------------------------------');

  hostWs.close();
  mobileWs.close();

  if (hostReceivedMove && hostReceivedSpoke && hostReceivedAction && hostReceivedLike) {
    console.log('🎉 ALL WEBSOCKET SYNC TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.error('❌ Verification failed on some events');
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
