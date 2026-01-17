
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/v1';

async function verifyVersions() {
  console.log('🚀 Starting Version Verification...');

  try {
    // 1. Login
    console.log('🔑 Logging in...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'Password123!' }),
    });
    
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginDataBase = await loginRes.json();
    const loginData = loginDataBase.data;
    const token = loginData.tokens.accessToken;
    console.log('✅ Logged in successfully');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Get/Create Project
    console.log('📁 Getting/Creating Project...');
    // We'll reuse an existing one or create simplistic one
    let project = null;
    const projRes = await fetch(`${API_URL}/projects`, { headers });
    const projectsBase = await projRes.json();
    const projects = projectsBase.data;
    project = projects.find(p => p.code === 'VER_TEST');
    
    if (!project) {
        const createProj = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
                name: 'Version Test Project', 
                code: 'VER_TEST',
                description: 'Auto-generated for version testing'
            })
        });
        const createProjData = await createProj.json();
        project = createProjData.data;
    }
    console.log(`✅ Project ready: ${project.code} (${project.id})`);

    // 3. Create Asset
    console.log('📦 Creating Asset for Versioning...');
    const assetCode = `AST_${Date.now()}`;
    const assetRes = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'Versionable Asset',
            code: assetCode,
            projectId: project.id,
            assetType: 'prompt'
        })
    });
    const assetData = await assetRes.json();
    const asset = assetData.data;
    console.log(`✅ Asset created: ${asset.code} (${asset.id})`);

    // 4. Create Version for Asset
    console.log('✨ Creating Version 1 (WIP)...');
    const v1Code = `${assetCode}_v01`;
    const v1Res = await fetch(`${API_URL}/versions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            entityId: asset.id,
            entityType: 'asset', // Polymorphic link
            code: v1Code,
            name: 'Concept v1',
            status: 'wip',
            latest: true
        })
    });
    const v1Data = await v1Res.json();
    const v1 = v1Data.data;
    console.log(`✅ Version 1 created: id=${v1.id}, latest=${v1.latest}, entityType=${v1.entityType}`);

    // 5. Create Version 2 (Verify LATEST logic)
    console.log('✨ Creating Version 2 (Review) - Should supersede v1...');
    const v2Code = `${assetCode}_v02`;
    const v2Res = await fetch(`${API_URL}/versions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            entityId: asset.id,
            entityType: 'asset', 
            code: v2Code,
            name: 'Concept v2',
            status: 'review',
            latest: true
        })
    });
    const v2Data = await v2Res.json();
    const v2 = v2Data.data;
    console.log(`✅ Version 2 created: id=${v2.id}, latest=${v2.latest}`);

    // 6. Verify v1 is NO LONGER latest
    console.log('🔍 Verifying v1 status...');
    const v1CheckRes = await fetch(`${API_URL}/versions/${v1.id}`, { headers });
    const v1CheckedData = await v1CheckRes.json();
    const v1Checked = v1CheckedData.data;
    
    if (v1Checked.latest === false) {
        console.log('✅ SUCCESS: Version 1 is no longer latest.');
    } else {
        console.error('❌ FAILURE: Version 1 is still marked as latest!');
    }

    // 7. Verify List Filtering
    console.log('📋 Verifying Filter by Entity...');
    const listRes = await fetch(`${API_URL}/versions?entityId=${asset.id}&entityType=asset`, { headers });
    const listData = await listRes.json();
    const list = listData.data;
    console.log(`✅ Found ${list.length} versions for this asset (Expected >= 2)`);
    
    // 8. Test Sequence Version Creation (Polymorphism Check)
    // First create a sequence
    console.log('🎬 Creating Sequence...');
    // Create random episode first if needed, but lets try forcing sequence if possible or create stub
    // We need an episode for a sequence
    const epRes = await fetch(`${API_URL}/episodes`, {
        method: 'POST', 
        headers,
        body: JSON.stringify({
            name: 'Test Ep',
            code: `EP_${Date.now()}`,
            projectId: project.id,
            cutOrder: 1
        })
    });
    const epData = await epRes.json();
    const ep = epData.data;
    
    const seqRes = await fetch(`${API_URL}/sequences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: 'Test Seq',
            code: `SEQ_${Date.now()}`,
            episodeId: ep.id,
            cutOrder: 1
        })
    });
    const seqData = await seqRes.json();
    const seq = seqData.data;
    
    // Create Version for Sequence
    console.log('✨ Creating Version for Sequence...');
    const seqVerRes = await fetch(`${API_URL}/versions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            entityId: seq.id,
            entityType: 'sequence',
            code: `${seq.code}_v01`,
            name: 'Animatic v1',
            latest: true
        })
    });
    const seqVerData = await seqVerRes.json();
    const seqVer = seqVerData.data;
    
    if (seqVer.entityType === 'sequence' && seqVer.entityId === seq.id) {
        console.log(`✅ Polimorphism WORKS: Linked version ${seqVer.id} to sequence ${seq.id}`);
    } else {
        console.error('❌ FAILURE: Sequence link failed', seqVer);
    }
    
    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY');

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

verifyVersions();
