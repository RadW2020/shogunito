const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      `❌ Error ${method} ${endpoint}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
}

// Test functions
async function testProjects() {
  console.log('\n🏗️  Testing Projects...');

  // Get all projects
  const projects = await apiCall('GET', '/projects');
  console.log('📋 Projects:', projects.length);

  return projects[0]; // Return first project for other tests
}

async function testEpisodes(project) {
  console.log('\n📺 Testing Episodes...');

  // Create episode
  const newEpisode = await apiCall('POST', '/episodes', {
    code: 'TEST_EP',
    name: 'Test Episode',
    description: 'Episode for testing CRUD operations',
    epNumber: 1,
    projectId: project.id,
    status: 'waiting',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created episode:', newEpisode.code);

  // Get episode by code
  const episode = await apiCall('GET', `/episodes/${newEpisode.code}`);
  console.log('📖 Retrieved episode:', episode.name);

  // Update episode
  const updatedEpisode = await apiCall(
    'PATCH',
    `/episodes/${newEpisode.code}`,
    {
      name: 'Updated Test Episode',
      status: 'in_progress',
    },
  );
  console.log('✏️  Updated episode:', updatedEpisode.name);

  return newEpisode;
}

async function testSequences(episode) {
  console.log('\n🎬 Testing Sequences...');

  // Create sequence
  const newSequence = await apiCall('POST', '/sequences', {
    code: 'TEST_SEQ',
    name: 'Test Sequence',
    description: 'Sequence for testing CRUD operations',
    cutOrder: 1,
    episodeCode: episode.code,
    status: 'waiting',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created sequence:', newSequence.code);

  // Get sequence by code
  const sequence = await apiCall('GET', `/sequences/${newSequence.code}`);
  console.log('📖 Retrieved sequence:', sequence.name);

  // Update sequence
  const updatedSequence = await apiCall(
    'PATCH',
    `/sequences/${newSequence.code}`,
    {
      name: 'Updated Test Sequence',
      status: 'in_progress',
    },
  );
  console.log('✏️  Updated sequence:', updatedSequence.name);

  return newSequence;
}

async function testShots(sequence) {
  console.log('\n🎥 Testing Shots...');

  // Create shot
  const newShot = await apiCall('POST', '/shots', {
    code: 'TEST_SH',
    name: 'Test Shot',
    description: 'Shot for testing CRUD operations',
    cutOrder: 1,
    sequenceNumber: 1,
    sequenceCode: sequence.code,
    status: 'waiting',
    shotType: 'establishing',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created shot:', newShot.code);

  // Get shot by code
  const shot = await apiCall('GET', `/shots/${newShot.code}`);
  console.log('📖 Retrieved shot:', shot.name);

  // Update shot
  const updatedShot = await apiCall('PATCH', `/shots/${newShot.code}`, {
    name: 'Updated Test Shot',
    status: 'in_progress',
  });
  console.log('✏️  Updated shot:', updatedShot.name);

  return newShot;
}

async function testAssets(project) {
  console.log('\n🎨 Testing Assets...');

  // Create asset
  const newAsset = await apiCall('POST', '/assets', {
    code: 'TEST_ASSET',
    name: 'Test Asset',
    description: 'Asset for testing CRUD operations',
    assetType: 'character',
    projectId: project.id,
    status: 'waiting',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created asset:', newAsset.code);

  // Get asset by code
  const asset = await apiCall('GET', `/assets/${newAsset.code}`);
  console.log('📖 Retrieved asset:', asset.name);

  // Update asset
  const updatedAsset = await apiCall('PATCH', `/assets/${newAsset.code}`, {
    name: 'Updated Test Asset',
    status: 'in_progress',
  });
  console.log('✏️  Updated asset:', updatedAsset.name);

  return newAsset;
}

async function testVersions(shot, asset) {
  console.log('\n🔄 Testing Versions...');

  // Create version for shot
  const shotVersion = await apiCall('POST', '/versions', {
    code: `${shot.code}_001`,
    name: 'Test Shot Version',
    description: 'Version for testing shot',
    entityCode: shot.code,
    entityType: 'shot',
    status: 'wip',
    format: '16:9',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
    latest: true,
  });
  console.log('✅ Created shot version:', shotVersion.code);

  // Create version for asset
  const assetVersion = await apiCall('POST', '/versions', {
    code: `${asset.code}_001`,
    name: 'Test Asset Version',
    description: 'Version for testing asset',
    entityCode: asset.code,
    entityType: 'asset',
    status: 'wip',
    format: '3d_model',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
    latest: true,
  });
  console.log('✅ Created asset version:', assetVersion.code);

  // Get versions by entity
  const shotVersions = await apiCall('GET', `/versions?shotId=${shot.code}`);
  console.log('📖 Shot versions:', shotVersions.length);

  const assetVersions = await apiCall('GET', `/versions?assetId=${asset.code}`);
  console.log('📖 Asset versions:', assetVersions.length);

  // Update version
  const updatedVersion = await apiCall(
    'PATCH',
    `/versions/${shotVersion.code}`,
    {
      status: 'review',
      description: 'Updated version description',
    },
  );
  console.log('✏️  Updated version:', updatedVersion.status);

  return [shotVersion, assetVersion];
}

async function testPlaylists(project, versions) {
  console.log('\n📋 Testing Playlists...');

  // Create playlist
  const newPlaylist = await apiCall('POST', '/playlists', {
    code: 'TEST_PL',
    name: 'Test Playlist',
    description: 'Playlist for testing CRUD operations',
    projectId: project.id,
    versionCodes: versions.map((v) => v.code),
    status: 'waiting',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created playlist:', newPlaylist.code);

  // Get playlist by code
  const playlist = await apiCall('GET', `/playlists/${newPlaylist.code}`);
  console.log('📖 Retrieved playlist:', playlist.name);
  console.log('📖 Playlist versions:', playlist.versions?.length || 0);

  // Create a new version to add to playlist
  const newVersion = await apiCall('POST', '/versions', {
    code: 'TEST_SH_002',
    name: 'Test Shot Version 2',
    description: 'Second version for testing',
    entityCode: 'TEST_SH',
    entityType: 'shot',
    status: 'wip',
    format: '16:9',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
    latest: false,
  });

  // Add new version to playlist
  const updatedPlaylist = await apiCall(
    'POST',
    `/playlists/${newPlaylist.code}/versions`,
    {
      versionCode: newVersion.code,
      position: 0,
    },
  );
  console.log('➕ Added version to playlist');

  // Reorder versions
  const reorderedPlaylist = await apiCall(
    'PUT',
    `/playlists/${newPlaylist.code}/versions/reorder`,
    {
      versionCodes: [newVersion.code, ...versions.map((v) => v.code)],
    },
  );
  console.log('🔄 Reordered playlist versions');

  return newPlaylist;
}

async function testNotes(project, entities) {
  console.log('\n📝 Testing Notes...');

  const [episode, sequence, shot, asset, version] = entities;

  // Create note for episode
  const episodeNote = await apiCall('POST', '/notes', {
    linkId: episode.code,
    linkType: 'Episode',
    subject: 'Episode Note',
    content: 'Note for testing episode',
    noteType: 'note',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created episode note');

  // Create note for version
  const versionNote = await apiCall('POST', '/notes', {
    linkId: version.code,
    linkType: 'Version',
    subject: 'Version Note',
    content: 'Note for testing version',
    noteType: 'revision',
    createdBy: 'Test User',
    assignedTo: 'Test Team',
  });
  console.log('✅ Created version note');

  // Get notes
  const notes = await apiCall('GET', '/notes');
  console.log('📖 Total notes:', notes.length);

  return [episodeNote, versionNote];
}

async function testCleanup(entities) {
  console.log('\n🧹 Cleaning up test data...');

  const [episode, sequence, shot, asset, versions, playlist, notes] = entities;

  try {
    // Delete notes
    for (const note of notes) {
      await apiCall('DELETE', `/notes/${note.id}`);
    }
    console.log('🗑️  Deleted notes');

    // Delete playlist
    await apiCall('DELETE', `/playlists/${playlist.code}`);
    console.log('🗑️  Deleted playlist');

    // Delete versions (including the new one created in playlist test)
    for (const version of versions) {
      await apiCall('DELETE', `/versions/${version.code}`);
    }
    // Delete the additional version created in playlist test
    await apiCall('DELETE', '/versions/TEST_SH_002');
    console.log('🗑️  Deleted versions');

    // Delete shot
    await apiCall('DELETE', `/shots/${shot.code}`);
    console.log('🗑️  Deleted shot');

    // Delete sequence
    await apiCall('DELETE', `/sequences/${sequence.code}`);
    console.log('🗑️  Deleted sequence');

    // Delete asset
    await apiCall('DELETE', `/assets/${asset.code}`);
    console.log('🗑️  Deleted asset');

    // Delete episode
    await apiCall('DELETE', `/episodes/${episode.code}`);
    console.log('🗑️  Deleted episode');
  } catch (error) {
    console.log(
      '⚠️  Some cleanup operations failed (expected if cascade deletes are enabled)',
    );
  }
}

// Main test function
async function runCRUDTests() {
  console.log('🚀 Starting CRUD Tests for Entity-Version Logic\n');

  try {
    // Test basic entities
    const project = await testProjects();
    const episode = await testEpisodes(project);
    const sequence = await testSequences(episode);
    const shot = await testShots(sequence);
    const asset = await testAssets(project);

    // Test versions
    const versions = await testVersions(shot, asset);

    // Test playlists
    const playlist = await testPlaylists(project, versions);

    // Test notes
    const notes = await testNotes(project, [
      episode,
      sequence,
      shot,
      asset,
      versions[0],
    ]);

    // Cleanup
    await testCleanup([
      episode,
      sequence,
      shot,
      asset,
      versions,
      playlist,
      notes,
    ]);

    console.log('\n✅ All CRUD tests completed successfully!');
  } catch (error) {
    console.error('\n❌ CRUD tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runCRUDTests();
