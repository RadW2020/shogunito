
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/v1';
const AUTH = { email: 'admin@example.com', password: 'Password123!' };

async function deepDiveTest() {
    console.log('🔥 STARTING EXHAUSTIVE VERSION API TEST SUITE 🔥');
    let token;
    let context = {};

    try {
        // --- 1. AUTHENTICATION ---
        console.log('\n[1/5] Authenticating...');
        const authRes = await axios.post(`${API_URL}/auth/login`, AUTH);
        token = authRes.data.data.tokens.accessToken;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('✅ Authenticated.');

        // --- 2. SETUP PARENT ENTITIES ---
        console.log('\n[2/5] Setting up polymorphic parents...');
        
        // Project
        const projRes = await axios.post(`${API_URL}/projects`, {
            name: 'Deep Version Test Project',
            code: `DV_${Date.now()}`
        }, config);
        context.projectId = projRes.data.data.id;
        console.log(`✅ Project created: ${projRes.data.data.code}`);

        // Episode
        const epRes = await axios.post(`${API_URL}/episodes`, {
            name: 'Deep Test Episode',
            code: `EP_${Date.now()}`,
            projectId: context.projectId,
            cutOrder: 1
        }, config);
        context.episodeId = epRes.data.data.id;
        console.log(`✅ Episode created: ${epRes.data.data.code}`);

        // Sequence
        const seqRes = await axios.post(`${API_URL}/sequences`, {
            name: 'Deep Test Sequence',
            code: `SQ_${Date.now()}`,
            episodeId: context.episodeId,
            cutOrder: 1
        }, config);
        context.sequenceId = seqRes.data.data.id;
        console.log(`✅ Sequence created: ${seqRes.data.data.code}`);

        // Asset
        const assetRes = await axios.post(`${API_URL}/assets`, {
            name: 'Deep Test Asset',
            code: `AS_${Date.now()}`,
            projectId: context.projectId,
            assetType: 'prompt'
        }, config);
        context.assetId = assetRes.data.data.id;
        console.log(`✅ Asset created: ${assetRes.data.data.code}`);

        // --- 3. TEST POLYMORPHISM ---
        console.log('\n[3/5] Testing Polymorphic Linking...');
        const parents = [
            { id: context.projectId, type: 'project', label: 'Project' },
            { id: context.episodeId, type: 'episode', label: 'Episode' },
            { id: context.sequenceId, type: 'sequence', label: 'Sequence' },
            { id: context.assetId, type: 'asset', label: 'Asset' }
        ];

        for (const parent of parents) {
            const vRes = await axios.post(`${API_URL}/versions`, {
                entityId: parent.id,
                entityType: parent.type,
                code: `VER_${parent.type}_01_${Date.now()}`,
                name: `Initial ${parent.label} Version`,
                latest: true
            }, config);
            console.log(`✅ Linked version ${vRes.data.data.id} to ${parent.label}`);
        }

        // --- 4. TEST VERSIONING LOGIC (LATEST & SEQUENTIAL) ---
        console.log('\n[4/5] Testing Versioning Logic...');
        
        console.log('Creating Version 1 for Asset...');
        const v1Res = await axios.post(`${API_URL}/versions`, {
            entityId: context.assetId,
            entityType: 'asset',
            code: `ASSET_VER_01_${Date.now()}`,
            name: 'Revision 1',
            latest: true
        }, config);
        const v1Id = v1Res.data.data.id;
        console.log(`✅ Version 1 created (id=${v1Id}). Number: ${v1Res.data.data.versionNumber}`);

        console.log('Creating Version 2 for same Asset...');
        const v2Res = await axios.post(`${API_URL}/versions`, {
            entityId: context.assetId,
            entityType: 'asset',
            code: `ASSET_VER_02_${Date.now()}`,
            name: 'Revision 2',
            latest: true
        }, config);
        const v2Id = v2Res.data.data.id;
        console.log(`✅ Version 2 created (id=${v2Id}). Number: ${v2Res.data.data.versionNumber}`);

        // Verify V1 is NOT latest anymore
        const v1Check = await axios.get(`${API_URL}/versions/${v1Id}`, config);
        const v2Check = await axios.get(`${API_URL}/versions/${v2Id}`, config);

        if (v2Check.data.data.latest && !v1Check.data.data.latest) {
            console.log('✅ Latest flag correctly swapped: v2=T, v1=F');
        } else {
            console.error('❌ Latest flag swap FAILED', { v1: v1Check.data.data.latest, v2: v2Check.data.data.latest });
        }

        // Test Deletion & Promotion (Optional/Bonus if supported by backend automatic logic)
        console.log('Deleting Version 2 (Latest)...');
        await axios.delete(`${API_URL}/versions/${v2Id}`, config);
        
        const v1CheckAfter = await axios.get(`${API_URL}/versions/${v1Id}`, config);
        if (v1CheckAfter.data.data.latest) {
            console.log('✅ Automatic Promotion SUCCESS: v1 is latest again after deleting v2.');
        } else {
            console.log('ℹ️ Note: Backend did not automatically promote v1 (Check if this is expected logic).');
        }

        // --- 5. TEST MEDIA HANDLING ---
        console.log('\n[5/5] Testing Media Logic (Path generation)...');
        // We'll update the version with a mock path and see if the API transforms it
        const updateRes = await axios.patch(`${API_URL}/versions/${v1Id}`, {
            filePath: 'test/render.mp4'
        }, config);
        
        if (updateRes.data.data.filePath.includes('http')) {
            console.log('✅ Path Transformation SUCCESS: "test/render.mp4" -> URL');
        } else {
            console.log(`ℹ️ Path returned as: ${updateRes.data.data.filePath}`);
        }

        console.log('\n🎉 ALL DEEP-DIVE TESTS COMPLETED 🎉');

    } catch (err) {
        console.error('\n❌ TEST FAILED');
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Data:`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
        process.exit(1);
    }
}

deepDiveTest();
